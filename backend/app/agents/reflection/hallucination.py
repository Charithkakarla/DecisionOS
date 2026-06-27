# Contains: hallucination.py implementation.
from typing import Dict, Any

from app.schemas.state import WorkflowState

def detect_hallucinations(state: WorkflowState) -> Dict[str, Any]:
    report = {
        "hallucination_risk": 0.0,
        "unsupported_claims": [],
        "confidence_penalty": 0.0
    }
    
    if not state.decision_artifact or not state.decision_artifact.payload:
        report["hallucination_risk"] = 1.0
        report["confidence_penalty"] = 0.5
        report["unsupported_claims"].append("Missing Decision package context")
        return report

    dec_pkg = state.decision_artifact.payload

    # 1. Recommendations without evidence
    for r in dec_pkg.recommendations:
        if not r.evidence_ids or not r.supporting_evidence:
            report["unsupported_claims"].append(f"Recommendation '{r.title}' has no associated evidence chunks or supporting text.")
            report["hallucination_risk"] += 0.25
            report["confidence_penalty"] += 0.1

    # 2. Revenue estimates without supporting data
    dec_revenue = dec_pkg.analysis.estimated_revenue if dec_pkg.analysis else 0.0
    if dec_revenue > 500000.0 and len(dec_pkg.evidence_used) < 2:
        report["unsupported_claims"].append(f"High revenue estimate (${dec_revenue:,.2f}) is backed by less than 2 distinct verified document citations.")
        report["hallucination_risk"] += 0.15
        report["confidence_penalty"] += 0.05

    # 3. KPI claims consistency
    all_evidence_text = ""
    if state.knowledge_artifact and state.knowledge_artifact.payload:
        all_evidence_text = " ".join([chunk.content.lower() for chunk in state.knowledge_artifact.payload.knowledge_results])
    
    for r in dec_pkg.recommendations:
        for kpi in r.kpis:
            kpi_clean = kpi.lower()
            if all_evidence_text and kpi_clean not in all_evidence_text and "revenue" not in kpi_clean:
                report["unsupported_claims"].append(f"Recommendation '{r.title}' references KPI '{kpi}' which is not explicitly mentioned in the source knowledge docs.")
                report["hallucination_risk"] += 0.1
                report["confidence_penalty"] += 0.02

    report["hallucination_risk"] = max(0.0, min(1.0, report["hallucination_risk"]))
    report["confidence_penalty"] = max(0.0, min(1.0, report["confidence_penalty"]))
    
    return report
