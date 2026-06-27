# Contains: chunking.py implementation.
import logging

logger = logging.getLogger("decision_os.knowledge.chunking")

def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> list[str]:
    chunks = []
    if not text:
        return chunks
    
    text = text.strip()
    if len(text) <= chunk_size:
        return [text]
        
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start += chunk_size - chunk_overlap
    return chunks

def chunk_document_sections(sections: list[dict], chunk_size: int = 500, chunk_overlap: int = 100) -> list[dict]:
    chunked_results = []
    global_index = 0
    
    for section in sections:
        content = section["content"]
        page = section.get("page")
        sect_name = section.get("section")
        
        raw_chunks = chunk_text(content, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        for chunk in raw_chunks:
            chunked_results.append({
                "content": chunk,
                "page": page,
                "section": sect_name,
                "chunk_index": global_index
            })
            global_index += 1
            
    logger.info(f"Generated {len(chunked_results)} chunks from {len(sections)} sections.")
    return chunked_results
