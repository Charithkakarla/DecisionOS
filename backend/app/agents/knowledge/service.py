# Contains: service.py implementation.
import time
import uuid
import logging
from app.contracts.knowledge import KnowledgeAgent
from app.schemas.state import WorkflowState, KnowledgeArtifact, AgentExecutionMetadata
from app.core.database import SessionLocal
from app.agents.knowledge.embeddings import EmbeddingService
from app.agents.knowledge.retrieval import perform_hybrid_search
from app.agents.knowledge.cache import cache_service
from app.agents.knowledge.evidence_collector import collect_evidence
from app.agents.knowledge.repository import save_metric
from app.core.config import settings

logger = logging.getLogger("decision_os.knowledge.service")

class KnowledgeService(KnowledgeAgent):
    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        state.execution_logs.append("knowledge: starting enterprise knowledge intelligence retrieval")
        start_time = time.time()
        
        # 1. Parse search query from context
        context = state.context_artifact.payload if state.context_artifact else {}
        query_parts = []
        if context.get("meeting_summary"):
            query_parts.append(context["meeting_summary"])
        if context.get("pain_points"):
            query_parts.extend(context["pain_points"])
            
        query_text = " ".join(query_parts).strip()
        if not query_text:
            query_text = state.transcript[:500].strip()
            
        if not query_text:
            state.execution_logs.append("knowledge: empty query text, skipping retrieval")
            from app.schemas.state import EvidencePackage
            evidence_package = EvidencePackage()
            state.knowledge_artifact = KnowledgeArtifact(
                artifact_id=str(uuid.uuid4()),
                workflow_id=state.workflow_id,
                agent_name="knowledge",
                schema_version="1.0.0",
                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
                provider="None",
                confidence=0.0,
                payload=evidence_package
            )
            return state

        logger.info(f"Generated search query: '{query_text}'")

        # 2. Check cache first
        cache_key = cache_service.get_query_hash(query_text, None, None, None, None, limit=5)
        cached_results = cache_service.get(cache_key)
        
        search_results = []
        embedding_time_ms = 0.0
        retrieval_time_ms = 0.0
        
        async with SessionLocal() as db_session:
            # If not cached, perform full embedding + hybrid search
            if not cached_results:
                # 3. Generate Embeddings
                emb_start = time.time()
                try:
                    query_embedding = await self.embedding_service.embed_query(query_text)
                    embedding_time_ms = (time.time() - emb_start) * 1000
                    await save_metric(db_session, "embedding_time_ms", embedding_time_ms)
                except Exception as e:
                    state.execution_logs.append(f"knowledge: embedding error: {e}")
                    query_embedding = [0.0] * 768  # fallback vector

                # 4. Perform Hybrid Search
                ret_start = time.time()
                db_results = await perform_hybrid_search(
                    db_session, 
                    query_text=query_text, 
                    query_embedding=query_embedding, 
                    limit=5
                )
                retrieval_time_ms = (time.time() - ret_start) * 1000
                await save_metric(db_session, "retrieval_time_ms", retrieval_time_ms)

                # Format db results to serialize-friendly list for cache
                serializable_results = []
                for res in db_results:
                    chunk = res["chunk"]
                    doc = res["doc"]
                    serializable_results.append({
                        "chunk": {
                            "id": str(chunk.id),
                            "content": chunk.content,
                            "page": chunk.page,
                            "section": chunk.section
                        },
                        "doc": {
                            "id": str(doc.id),
                            "name": doc.name,
                            "mime_type": doc.mime_type,
                            "version": doc.version,
                            "department": doc.department
                        },
                        "similarity_score": res["similarity_score"]
                    })
                
                # Write to Redis
                cache_service.set(cache_key, serializable_results)
                cached_results = serializable_results
                
            # 5. Build Evidence Package from serializable representations
            collector_inputs = []
            for item in cached_results:
                from types import SimpleNamespace
                chunk_mock = SimpleNamespace(
                    id=item["chunk"]["id"],
                    content=item["chunk"]["content"],
                    page=item["chunk"]["page"],
                    section=item["chunk"]["section"]
                )
                doc_mock = SimpleNamespace(
                    id=item["doc"]["id"],
                    name=item["doc"]["name"],
                    mime_type=item["doc"]["mime_type"],
                    version=item["doc"]["version"],
                    department=item["doc"]["department"]
                )
                collector_inputs.append({
                    "chunk": chunk_mock,
                    "doc": doc_mock,
                    "similarity_score": item["similarity_score"]
                })
                
            evidence_package = collect_evidence(collector_inputs)
            
            # Wrap in KnowledgeArtifact
            state.knowledge_artifact = KnowledgeArtifact(
                artifact_id=str(uuid.uuid4()),
                workflow_id=state.workflow_id,
                agent_name="knowledge",
                schema_version="1.0.0",
                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
                provider="GeminiEmbeddingsProvider",
                confidence=evidence_package.confidence_score,
                payload=evidence_package
            )
            
            # Store metrics for average similarity in database
            if not cached_results:
                await save_metric(db_session, "average_similarity", evidence_package.confidence_score)
            
        duration_ms = int((time.time() - start_time) * 1000)
        state.execution_logs.append(
            f"knowledge: gathered {len(evidence_package.knowledge_results)} evidence chunks "
            f"(confidence: {evidence_package.confidence_score:.4f}) in {duration_ms}ms"
        )
        
        # Capture metrics
        in_chars = len(query_text)
        out_chars = len(str(evidence_package.model_dump()))
        input_tokens = in_chars // 4
        output_tokens = out_chars // 4
        total_tokens = input_tokens + output_tokens
        cost = (input_tokens * 0.000000075) + (output_tokens * 0.00000030)
        
        meta = AgentExecutionMetadata(
            agent_name="Knowledge Agent",
            provider="GeminiEmbeddingsProvider",
            model="text-embedding-004",
            latency_ms=duration_ms,
            token_usage={"input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": total_tokens},
            estimated_cost=round(cost, 6),
            started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
            completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            status="completed",
            retry_count=0,
            version="1.0.0"
        )
        state.agent_metadata["knowledge"] = meta
        
        return state
