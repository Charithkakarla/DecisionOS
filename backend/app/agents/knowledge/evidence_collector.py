# Contains: evidence_collector.py implementation.
import logging
from app.schemas.state import KnowledgeResult, EvidencePackage

logger = logging.getLogger("decision_os.knowledge.evidence_collector")

def collect_evidence(search_results: list[dict]) -> EvidencePackage:
    logger.info(f"Collecting evidence package from {len(search_results)} search results.")
    
    knowledge_results = []
    citations = []
    evidence_metadata = []
    
    total_similarity = 0.0
    
    for idx, res in enumerate(search_results):
        chunk = res["chunk"]
        doc = res["doc"]
        similarity = res["similarity_score"]
        
        doc_name = doc.name or "Unknown Document"
        page_num = chunk.page or 1
        section_name = chunk.section or "Main Section"
        
        # Format standard citation string
        citation = f"{doc_name} • Page {page_num} • {section_name}"
        
        # Build individual KnowledgeResult model
        k_res = KnowledgeResult(
            id=str(chunk.id),
            document_name=doc_name,
            section=section_name,
            page=page_num,
            content=chunk.content,
            similarity_score=similarity,
            citation=citation,
            source_type=doc.mime_type or "text/plain"
        )
        knowledge_results.append(k_res)
        citations.append(citation)
        
        # Build evidence metadata dictionary
        metadata = {
            "title": doc_name,
            "page": page_num,
            "section": section_name,
            "similarity": round(similarity, 4),
            "citation": citation,
            "version": doc.version,
            "department": doc.department
        }
        evidence_metadata.append(metadata)
        
        total_similarity += similarity

    # Calculate overall confidence score (average similarity, default to 0.0 if empty)
    avg_similarity = total_similarity / len(search_results) if search_results else 0.0
    
    package = EvidencePackage(
        knowledge_results=knowledge_results,
        citations=citations,
        confidence_score=round(avg_similarity, 4),
        evidence_metadata=evidence_metadata
    )
    logger.info(f"Assembled evidence package with overall confidence: {package.confidence_score}")
    return package
