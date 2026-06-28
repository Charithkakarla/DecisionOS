# Contains: repository.py implementation.
import uuid
import datetime
import logging
import os
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, text, Float, JSON, select, delete, func
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

logger = logging.getLogger("decision_os.knowledge.repository")

Base = declarative_base()

QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
qdrant = AsyncQdrantClient(host=QDRANT_HOST, port=6333)
QDRANT_COLLECTION = "knowledge_chunks"

# --- Legacy Knowledge Domain Tables ---
class DBDocument(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    storage_name = Column(String, nullable=False, unique=True)
    size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)
    department = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    version = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)  # Stored as a JSON array of strings
    status = Column(String, default="processing")  # processing, completed, failed
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBDocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(String, nullable=False)
    page = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    # Removed pgvector embedding column. Vector is now stored in Qdrant.

class DBMetric(Base):
    __tablename__ = "metrics"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# --- New Enterprise Audit & Management Domain Tables (Sprint 7) ---

class DBUser(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, nullable=False, unique=True)
    role = Column(String, default="operator") # operator, admin, executive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBProject(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBWorkflow(Base):
    __tablename__ = "workflows"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBWorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=True)
    status = Column(String, default="running")  # running, completed, failed
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class DBArtifact(Base):
    __tablename__ = "artifacts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id = Column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String, nullable=False)
    artifact_type = Column(String, nullable=False)  # context, knowledge, decision, strategy, reflection
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBAgentExecutionLog(Base):
    __tablename__ = "agent_execution_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id = Column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String, nullable=False)
    provider = Column(String, nullable=True)
    latency_ms = Column(Float, default=0.0)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBFeedback(Base):
    __tablename__ = "feedback"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id = Column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False) # 1-5 rating
    comments = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBAuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id = Column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=True)
    action = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# --- DB Initialization and Operations ---

async def init_db(engine) -> None:
    logger.info("Initializing knowledge database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")
    
    # Initialize Qdrant collection
    try:
        collections = await qdrant.get_collections()
        if QDRANT_COLLECTION not in [col.name for col in collections.collections]:
            await qdrant.create_collection(
                collection_name=QDRANT_COLLECTION,
                vectors_config=models.VectorParams(
                    size=768, 
                    distance=models.Distance.COSINE
                )
            )
            logger.info(f"Qdrant collection {QDRANT_COLLECTION} created.")
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collection: {e}")


async def save_document(
    session, name: str, storage_name: str, size_bytes: int, mime_type: str,
    department: str | None, owner: str | None, version: str | None, tags: list[str]
) -> DBDocument:
    db_doc = DBDocument(
        id=uuid.uuid4(),
        name=name,
        storage_name=storage_name,
        size_bytes=size_bytes,
        mime_type=mime_type,
        department=department,
        owner=owner,
        version=version,
        tags=tags,
        status="processing"
    )
    session.add(db_doc)
    await session.commit()
    await session.refresh(db_doc)
    return db_doc


async def update_document_status(session, doc_id: uuid.UUID, status: str, error_msg: str | None = None) -> None:
    db_doc = await session.get(DBDocument, doc_id)
    if db_doc:
        db_doc.status = status
        db_doc.error_message = error_msg
        await session.commit()


async def save_chunks(session, doc_id: uuid.UUID, chunks: list[dict]) -> None:
    db_chunks = []
    points = []
    
    for chunk in chunks:
        chunk_id = uuid.uuid4()
        
        # Save to Postgres
        db_chunk = DBDocumentChunk(
            id=chunk_id,
            document_id=doc_id,
            chunk_index=chunk["chunk_index"],
            content=chunk["content"],
            page=chunk["page"],
            section=chunk["section"],
        )
        db_chunks.append(db_chunk)
        
        # Save to Qdrant
        points.append(
            models.PointStruct(
                id=str(chunk_id),
                vector=chunk["embedding"],
                payload={
                    "document_id": str(doc_id),
                    "chunk_index": chunk["chunk_index"],
                }
            )
        )
        
    session.add_all(db_chunks)
    await session.commit()
    
    # Upload to Qdrant
    if points:
        try:
            await qdrant.upsert(
                collection_name=QDRANT_COLLECTION,
                points=points
            )
        except Exception as e:
            logger.error(f"Failed to upsert points to Qdrant: {e}")
            raise


async def list_documents(session) -> list[DBDocument]:
    result = await session.execute(select(DBDocument).order_by(DBDocument.created_at.desc()))
    return list(result.scalars().all())


async def delete_document(session, doc_id: uuid.UUID) -> bool:
    db_doc = await session.get(DBDocument, doc_id)
    if not db_doc:
        return False
        
    # Delete from Qdrant
    try:
        await qdrant.delete(
            collection_name=QDRANT_COLLECTION,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=str(doc_id))
                    )
                ]
            )
        )
    except Exception as e:
        logger.error(f"Failed to delete document chunks from Qdrant: {e}")
        
    await session.delete(db_doc)
    await session.commit()
    return True


async def search_semantic(session, query_embedding: list[float], limit: int = 5) -> list[tuple[DBDocumentChunk, DBDocument, float]]:
    try:
        search_result = await qdrant.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=query_embedding,
            limit=limit,
            with_payload=False
        )
        
        if not search_result:
            return []
            
        chunk_ids = [uuid.UUID(point.id) for point in search_result]
        scores = {uuid.UUID(point.id): point.score for point in search_result}
        
        stmt = (
            select(DBDocumentChunk, DBDocument)
            .join(DBDocument, DBDocument.id == DBDocumentChunk.document_id)
            .where(DBDocumentChunk.id.in_(chunk_ids))
            .where(DBDocument.status == "completed")
        )
        
        result = await session.execute(stmt)
        rows = list(result.all())
        
        # Sort by qdrant score
        scored_rows = [
            (chunk, doc, scores[chunk.id]) for chunk, doc in rows
        ]
        scored_rows.sort(key=lambda x: x[2], reverse=True)
        
        return scored_rows
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return []


async def search_fts(session, keyword_query: str, limit: int = 5) -> list[tuple[DBDocumentChunk, DBDocument, float]]:
    stmt = (
        select(
            DBDocumentChunk, 
            DBDocument,
            func.ts_rank_cd(
                func.to_tsvector("english", DBDocumentChunk.content),
                func.plainto_tsquery("english", keyword_query)
            ).label("rank")
        )
        .join(DBDocument, DBDocument.id == DBDocumentChunk.document_id)
        .where(DBDocument.status == "completed")
        .where(text("to_tsvector('english', document_chunks.content) @@ plainto_tsquery('english', :query)"))
        .params(query=keyword_query)
        .order_by(text("rank DESC"))
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.all())


async def save_metric(session, metric_name: str, value: float) -> None:
    metric = DBMetric(metric_name=metric_name, metric_value=value)
    session.add(metric)
    await session.commit()


async def get_metrics(session) -> dict:
    doc_count = await session.execute(select(func.count(DBDocument.id)))
    chunk_count = await session.execute(select(func.count(DBDocumentChunk.id)))
    
    avg_emb_time = await session.execute(
        select(func.coalesce(func.avg(DBMetric.metric_value), 0.0))
        .where(DBMetric.metric_name == "embedding_time_ms")
    )
    avg_ret_time = await session.execute(
        select(func.coalesce(func.avg(DBMetric.metric_value), 0.0))
        .where(DBMetric.metric_name == "retrieval_time_ms")
    )
    avg_sim = await session.execute(
        select(func.coalesce(func.avg(DBMetric.metric_value), 0.0))
        .where(DBMetric.metric_name == "average_similarity")
    )

    return {
        "documents_indexed": doc_count.scalar() or 0,
        "chunks_generated": chunk_count.scalar() or 0,
        "average_embedding_time_ms": float(avg_emb_time.scalar() or 0.0),
        "average_retrieval_time_ms": float(avg_ret_time.scalar() or 0.0),
        "average_similarity": float(avg_sim.scalar() or 0.0)
    }
