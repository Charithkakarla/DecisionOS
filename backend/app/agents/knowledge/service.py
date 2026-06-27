# Contains: service.py implementation.
import time
import logging
from app.contracts.knowledge import KnowledgeAgent
from app.schemas.state import WorkflowState
from app.core.database import SessionLocal
from app.agents.knowledge.embeddings import EmbeddingService
from app.agents.knowledge.retrieval import perform_hybrid_search
from app.agents.knowledge.cache import cache_service
from app.agents.knowledge.evidence_collector import collect_evidence
from app.agents.knowledge.repository import save_metric

logger = logging.getLogger("decision_os.knowledge.service")

class KnowledgeService(KnowledgeAgent):
    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        state.execution_logs.append("knowledge: starting enterprise knowledge intelligence retrieval")
        start_time = time.time()
        
        # 1. Parse search query from context
        context = state.extracted_context or {}
        query_parts = []
        if context.get("meeting_summary"):
            query_parts.append(context["meeting_summary"])
        if context.get("pain_points"):
            query_parts.extend(context["pain_points"])
            
        query_text = " ".join(query_parts).strip()
        if not query_text:
            # Fallback to transcript snippet
            query_text = state.transcript[:500].strip()
            
        if not query_text:
            state.execution_logs.append("knowledge: empty query text, skipping retrieval")
            from app.schemas.state import EvidencePackage
            state.evidence_package = EvidencePackage()
            state.relevant_playbooks = []
            return state

        logger.info(f"Generated search query: '{query_text}'")

        # 2. Check cache first
        cache_key = cache_service.get_query_hash(query_text, None, None, None, None, limit=5)
        cached_results = cache_service.get(cache_key)
        
        search_results = []
        embedding_time_ms = 0.0
        retrieval_time_ms = 0.0
        
        async with SessionLocal() as db_session:
            if cached_results:
                state.execution_logs.append("knowledge: retrieved cached hybrid search results")
                # Reconstruct DBDocument and DBDocumentChunk representations from cache
                # Since caching serializes them, we can just use cached representations directly in collector
                # Or keep a simple wrapper. Let's make sure the collector can read cached structures.
                # To make this easy, we'll cache the collected evidence package itself, or clean representation.
                # Let's see: we can cache the final structured dictionary from collector!
                # Yes! Let's do that!
                pass
            
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
                # Since SQLAlchemy models can't be easily JSON serialized, we convert them
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
            # Map cached representation format to collector
            collector_inputs = []
            for item in cached_results:
                # Mock chunk and doc objects so collector interface is consistent
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
            state.evidence_package = evidence_package
            
            # Store metrics for average similarity in database
            if not cached_results:
                await save_metric(db_session, "average_similarity", evidence_package.confidence_score)
            
            # Maintain backward compatibility for relevant playbooks
            state.relevant_playbooks = list(set([res.document_name for res in evidence_package.knowledge_results]))
            
        duration_ms = int((time.time() - start_time) * 1000)
        state.execution_logs.append(
            f"knowledge: gathered {len(evidence_package.knowledge_results)} evidence chunks "
            f"(confidence: {evidence_package.confidence_score:.4f}) in {duration_ms}ms"
        )
        return state
