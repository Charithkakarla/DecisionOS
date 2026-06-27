# Contains: router.py implementation.
import uuid
import logging
from typing import Any
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from app.core.database import SessionLocal
from app.agents.knowledge.schemas import DocumentInfo, SearchQuery, KnowledgeMetrics
from app.agents.knowledge.ingest import extract_text
from app.agents.knowledge.chunking import chunk_document_sections
from app.agents.knowledge.embeddings import EmbeddingService
from app.agents.knowledge.repository import (
    save_document, save_chunks, update_document_status, 
    list_documents, delete_document, get_metrics
)
from app.agents.knowledge.retrieval import perform_hybrid_search
from app.agents.knowledge.evidence_collector import collect_evidence
from app.schemas.state import WorkflowState, EvidencePackage

logger = logging.getLogger("decision_os.knowledge.router")
router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])

def should_execute(state: WorkflowState) -> bool:
    return state.knowledge_artifact is None

async def background_process_file(doc_id: uuid.UUID, file_content: bytes, filename: str):
    logger.info(f"Background task: starting processing for doc {doc_id} ({filename})")
    async with SessionLocal() as session:
        try:
            # 1. Text Extraction
            sections = extract_text(file_content, filename)
            
            # 2. Chunking
            chunks = chunk_document_sections(sections, chunk_size=500, chunk_overlap=100)
            if not chunks:
                raise ValueError("No text content could be chunked.")
                
            # 3. Generate Embeddings for chunks
            embedding_service = EmbeddingService()
            texts_to_embed = [c["content"] for c in chunks]
            
            # Batch embedding generation
            embeddings = await embedding_service.embed_documents(texts_to_embed)
            
            # Inject embeddings into chunks
            for idx, chunk in enumerate(chunks):
                chunk["embedding"] = embeddings[idx]
                
            # 4. Save Chunks and Embeddings directly to DBDocumentChunk
            await save_chunks(session, doc_id, chunks)
            
            # 5. Update Status
            await update_document_status(session, doc_id, "completed")
            logger.info(f"Background task: successfully processed and indexed doc {doc_id}")
        except Exception as e:
            logger.error(f"Background task failed for doc {doc_id}: {e}")
            await update_document_status(session, doc_id, "failed", str(e))


@router.post("/upload", response_model=DocumentInfo)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    department: str | None = Form(None),
    owner: str | None = Form(None),
    version: str | None = Form(None),
    tags: str | None = Form(None)  # comma-separated string
) -> Any:
    # 1. Validate File Size
    content = await file.read()
    size_bytes = len(content)
    max_size = 10 * 1024 * 1024  # 10 MB
    if size_bytes > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
        
    # 2. Validate Mimetype / Extension
    filename = file.filename or "document.txt"
    ext = filename.split(".")[-1].lower()
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Only PDF, DOCX, and TXT are allowed.")
        
    # 3. Sanitize filename
    import os
    clean_filename = os.path.basename(filename)
    
    # 4. Create unique storage filename
    doc_id = uuid.uuid4()
    storage_name = f"{doc_id}_{clean_filename}"
    
    # Parse tags
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    # 5. Save metadata to DB with status = processing
    async with SessionLocal() as session:
        db_doc = await save_document(
            session=session,
            name=clean_filename,
            storage_name=storage_name,
            size_bytes=size_bytes,
            mime_type=file.content_type or f"application/{ext}",
            department=department,
            owner=owner,
            version=version,
            tags=tag_list
        )
        
    # 6. Dispatch Background Task to extract text, chunk, embed, and save chunks
    background_tasks.add_task(
        background_process_file,
        doc_id=db_doc.id,
        file_content=content,
        filename=clean_filename
    )
    
    return DocumentInfo(
        id=str(db_doc.id),
        name=db_doc.name,
        size_bytes=db_doc.size_bytes,
        mime_type=db_doc.mime_type,
        department=db_doc.department,
        owner=db_doc.owner,
        version=db_doc.version,
        tags=db_doc.tags or [],
        status=db_doc.status,
        created_at=db_doc.created_at
    )


@router.get("/documents", response_model=list[DocumentInfo])
async def get_uploaded_documents() -> Any:
    async with SessionLocal() as session:
        docs = await list_documents(session)
        return [
            DocumentInfo(
                id=str(doc.id),
                name=doc.name,
                size_bytes=doc.size_bytes,
                mime_type=doc.mime_type,
                department=doc.department,
                owner=doc.owner,
                version=doc.version,
                tags=doc.tags or [],
                status=doc.status,
                error_message=doc.error_message,
                created_at=doc.created_at
            )
            for doc in docs
        ]


@router.delete("/documents/{doc_id}")
async def remove_document(doc_id: str) -> dict:
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format.")
        
    async with SessionLocal() as session:
        success = await delete_document(session, doc_uuid)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found.")
        return {"status": "success", "message": f"Document {doc_id} deleted."}


@router.post("/search", response_model=EvidencePackage)
async def search_sandbox(query: SearchQuery) -> Any:
    async with SessionLocal() as session:
        # Generate query embedding
        embedding_service = EmbeddingService()
        try:
            query_embedding = await embedding_service.embed_query(query.query)
        except Exception as e:
            logger.error(f"Search sandbox embedding generation failed: {e}")
            query_embedding = [0.0] * 768
            
        # Run hybrid retrieval
        db_results = await perform_hybrid_search(
            session=session,
            query_text=query.query,
            query_embedding=query_embedding,
            department=query.department,
            owner=query.owner,
            version=query.version,
            tags=query.tags,
            limit=query.limit
        )
        
        # Build Evidence Package
        # Collect_evidence expects structured chunks/docs
        collector_inputs = []
        for res in db_results:
            collector_inputs.append({
                "chunk": res["chunk"],
                "doc": res["doc"],
                "similarity_score": res["similarity_score"]
            })
            
        package = collect_evidence(collector_inputs)
        return package


@router.get("/metrics", response_model=KnowledgeMetrics)
async def get_system_metrics() -> Any:
    async with SessionLocal() as session:
        metrics = await get_metrics(session)
        return KnowledgeMetrics(**metrics)
