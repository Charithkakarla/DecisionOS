# Contains: evidence.py implementation.
from typing import Dict, Any

from app.schemas.state import WorkflowState

def verify_evidence(state: WorkflowState) -> Dict[str, Any]:
    report = {
        "evidence_coverage": 1.0,
        "citation_valid": True,
        "weak_evidence": [],
        "broken_references": [],
        "missing_evidence": [],
        "supporting_evidence": []
    }
    
    if not state.decision_artifact or not state.decision_artifact.payload:
        report["evidence_coverage"] = 0.0
        report["missing_evidence"].append("No decision artifact loaded")
        return report

    dec_pkg = state.decision_artifact.payload
    recs = dec_pkg.recommendations
    
    if not recs:
        report["evidence_coverage"] = 0.0
        return report

    valid_cites_count = 0
    total_recs = len(recs)
    
    # Trace citations inside knowledge package if available
    available_citations = set()
    if state.knowledge_artifact and state.knowledge_artifact.payload:
        available_citations = set(state.knowledge_artifact.payload.citations)

    for r in recs:
        # Check if recommendation has evidence ids
        if not r.evidence_ids:
            report["missing_evidence"].append(f"Recommendation '{r.title}' has no associated evidence chunk IDs.")
            continue
        
        # Check similarity score
        if r.similarity_score < 0.6:
            report["weak_evidence"].append(f"Recommendation '{r.title}' is backed by weak semantic evidence (score: {r.similarity_score:.4f})")
            
        # Check citation field
        if not r.citation:
            report["broken_references"].append(f"Recommendation '{r.title}' is missing a citation path.")
            continue
            
        # Verify citation matches knowledge package
        if available_citations and r.citation not in available_citations:
            found = False
            for cite in available_citations:
                if r.citation in cite or cite in r.citation:
                    found = True
                    break
            if not found:
                report["broken_references"].append(f"Recommendation '{r.title}' cites '{r.citation}' which does not exist in loaded knowledge base citations.")
                continue

        valid_cites_count += 1
        report["supporting_evidence"].append({
            "rec_id": r.id,
            "title": r.title,
            "citation": r.citation,
            "similarity_score": r.similarity_score
        })

    report["evidence_coverage"] = round(valid_cites_count / total_recs, 4)
    if report["evidence_coverage"] < 1.0:
        report["citation_valid"] = False

    return report
