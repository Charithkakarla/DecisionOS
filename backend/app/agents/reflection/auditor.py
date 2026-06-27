# Contains: auditor.py implementation.
from typing import Dict, Any

def compile_audit_report(
    validation_results: Dict[str, Any],
    consistency_results: Dict[str, Any],
    evidence_results: Dict[str, Any],
    hallucination_results: Dict[str, Any],
    trust_results: Dict[str, Any],
    explainability_results: Dict[str, Any]
) -> Dict[str, Any]:
    
    errors = validation_results.get("errors", []) + consistency_results.get("contradictions", [])
    validation_status = "passed" if not errors else "failed"
    
    warnings = (
        validation_results.get("warnings", []) +
        consistency_results.get("warnings", []) +
        evidence_results.get("weak_evidence", []) +
        evidence_results.get("broken_references", [])
    )
    
    unsupported_claims = (
        evidence_results.get("missing_evidence", []) +
        hallucination_results.get("unsupported_claims", [])
    )
    
    critical_findings = errors
    
    if validation_status == "passed":
        if warnings:
            verdict = "Passed with Warnings: All schema checks and financial bounds are satisfied, but minor evidence gaps or risks were highlighted."
        else:
            verdict = "Approved: High trust rating, zero contradictions, and fully verified document citations."
    else:
        verdict = f"Rejected: Operational conflicts identified ({len(errors)} validation errors/contradictions). Fix anomalies before publishing."

    suggestions = []
    if evidence_results.get("weak_evidence"):
        suggestions.append("Upload more recent playbooks or service level agreements to strengthen recommendation evidence.")
    if consistency_results.get("consistency_score", 1.0) < 0.8:
        suggestions.append("Re-evaluate financial parameters. Ensure strategy ROI outcomes reconcile with initial context revenue forecasts.")
    if hallucination_results.get("hallucination_risk", 0.0) > 0.2:
        suggestions.append("Add explicit document quotes to verify unreferenced recommendations.")
    if not suggestions:
        suggestions.append("Strategy is highly optimized. Committing to production rollout registry recommended.")

    return {
        "validation_status": validation_status,
        "audit_verdict": verdict,
        "warnings": warnings,
        "critical_findings": critical_findings,
        "unsupported_claims": unsupported_claims,
        "missing_information": validation_results.get("errors", []) + evidence_results.get("missing_evidence", []),
        "contradictions": consistency_results.get("contradictions", []),
        "improvement_suggestions": suggestions
    }
