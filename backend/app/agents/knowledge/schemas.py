# Contains: schemas.py implementation.
from pydantic import BaseModel, Field
from datetime import datetime

class DocumentInfo(BaseModel):
    id: str
    name: str
    size_bytes: int
    mime_type: str
    department: str | None = None
    owner: str | None = None
    version: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: str
    error_message: str | None = None
    created_at: datetime

class SearchQuery(BaseModel):
    query: str
    department: str | None = None
    owner: str | None = None
    version: str | None = None
    tags: list[str] | None = None
    limit: int = 5

class KnowledgeMetrics(BaseModel):
    documents_indexed: int
    chunks_generated: int
    average_embedding_time_ms: float
    average_retrieval_time_ms: float
    average_similarity: float
