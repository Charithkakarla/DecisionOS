# Contains: retrieval.py implementation.
import logging
from app.agents.knowledge.repository import search_semantic, search_fts

logger = logging.getLogger("decision_os.knowledge.retrieval")

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    dot = sum(x * y for x, y in zip(v1, v2))
    m1 = sum(x * x for x in v1) ** 0.5
    m2 = sum(x * x for x in v2) ** 0.5
    if m1 == 0 or m2 == 0:
        return 0.0
    return dot / (m1 * m2)

async def perform_hybrid_search(
    session, query_text: str, query_embedding: list[float],
    department: str | None = None, owner: str | None = None,
    version: str | None = None, tags: list[str] | None = None,
    limit: int = 5
) -> list[dict]:
    logger.info(f"Performing hybrid search for query: '{query_text}'")
    
    # 1. Fetch semantic search candidates (e.g., limit * 2 to have room for blending)
    semantic_candidates = await search_semantic(session, query_embedding, limit=limit * 2)
    
    # 2. Fetch keyword search candidates (FTS)
    keyword_candidates = await search_fts(session, query_text, limit=limit * 2)
    
    # 3. Blend the results using a weighted hybrid score
    # Combined Score = 0.7 * Semantic Similarity + 0.3 * Keyword FTS Score
    w_semantic = 0.7
    w_keyword = 0.3
    
    blended = {}
    
    # Add semantic candidates
    for chunk, doc, similarity in semantic_candidates:
        blended[chunk.id] = {
            "chunk": chunk,
            "doc": doc,
            "semantic_score": float(similarity),
            "fts_score": 0.0
        }
        
    # Add keyword candidates
    for chunk, doc, fts_rank in keyword_candidates:
        fts_score = float(fts_rank)
        if chunk.id in blended:
            blended[chunk.id]["fts_score"] = fts_score
        else:
            # For pure keyword hits, calculate semantic score in python
            similarity = cosine_similarity(chunk.embedding, query_embedding)
            blended[chunk.id] = {
                "chunk": chunk,
                "doc": doc,
                "semantic_score": similarity,
                "fts_score": fts_score
            }
            
    # Calculate final blended score and filter
    filtered_results = []
    for chunk_id, data in blended.items():
        chunk = data["chunk"]
        doc = data["doc"]
        
        # Apply Metadata filters
        if department and doc.department != department:
            continue
        if owner and doc.owner != owner:
            continue
        if version and doc.version != version:
            continue
        if tags:
            doc_tags = doc.tags or []
            # Check if any tag matches
            if not any(t in doc_tags for t in tags):
                continue
                
        # Calculate combined score
        # FTS scores can sometimes be > 1.0, so cap/normalize it to 0-1 for balanced blending
        capped_fts = min(1.0, data["fts_score"])
        combined_score = (w_semantic * data["semantic_score"]) + (w_keyword * capped_fts)
        
        filtered_results.append({
            "chunk": chunk,
            "doc": doc,
            "similarity_score": combined_score,
            "raw_semantic": data["semantic_score"]
        })
        
    # Sort by combined score descending
    filtered_results.sort(key=lambda x: x["similarity_score"], reverse=True)
    
    # Keep top K
    top_results = filtered_results[:limit]
    logger.info(f"Hybrid search returned {len(top_results)} blended results.")
    return top_results
