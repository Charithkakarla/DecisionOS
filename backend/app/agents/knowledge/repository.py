# Contains: repository.py implementation.
import uuid
import datetime
import logging
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, text, Float, JSON, select, delete, func
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector

logger = logging.getLogger("decision_os.knowledge.repository")

Base = declarative_base()

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
    embedding = Column(Vector(768), nullable=False)  # Storing embedding directly inside document_chunks

class DBMetric(Base):
    __tablename__ = "metrics"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


async def init_db(engine) -> None:
    logger.info("Initializing knowledge database tables...")
    async with engine.begin() as conn:
        if "postgresql" in str(engine.url):
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                logger.info("pgvector extension verified/enabled.")
            except Exception as e:
                logger.error(f"Failed to create pgvector extension: {e}")
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")


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
    for chunk in chunks:
        db_chunk = DBDocumentChunk(
            id=uuid.uuid4(),
            document_id=doc_id,
            chunk_index=chunk["chunk_index"],
            content=chunk["content"],
            page=chunk["page"],
            section=chunk["section"],
            embedding=chunk["embedding"]
        )
        db_chunks.append(db_chunk)
    session.add_all(db_chunks)
    await session.commit()


async def list_documents(session) -> list[DBDocument]:
    result = await session.execute(select(DBDocument).order_by(DBDocument.created_at.desc()))
    return list(result.scalars().all())


async def delete_document(session, doc_id: uuid.UUID) -> bool:
    db_doc = await session.get(DBDocument, doc_id)
    if not db_doc:
        return False
    await session.delete(db_doc)
    await session.commit()
    return True


async def search_semantic(session, query_embedding: list[float], limit: int = 5) -> list[tuple[DBDocumentChunk, DBDocument, float]]:
    # Cosine distance similarity search
    # similarity = 1 - cosine_distance
    distance = DBDocumentChunk.embedding.cosine_distance(query_embedding)
    stmt = (
        select(DBDocumentChunk, DBDocument, (1.0 - distance).label("similarity"))
        .join(DBDocument, DBDocument.id == DBDocumentChunk.document_id)
        .where(DBDocument.status == "completed")
        .order_by(distance.asc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.all())


async def search_fts(session, keyword_query: str, limit: int = 5) -> list[tuple[DBDocumentChunk, DBDocument, float]]:
    # PostgreSQL Full Text Search
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
