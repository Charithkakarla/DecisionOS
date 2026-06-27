# Contains: confidence.py implementation.
from typing import Dict, Any
from app.schemas.state import WorkflowState

def calculate_trust_score(
    state: WorkflowState,
    validation_status: str,
    evidence_coverage: float,
    consistency_score: float,
    hallucination_risk: float,
    governance_score: float
) -> Dict[str, Any]:
    
    # 1. Context Quality
    context_score = 0.0
    if state.context_artifact and state.context_artifact.payload:
        payload = state.context_artifact.payload
        fields = ["budget", "timeline", "pain_points", "decision_makers", "meeting_summary"]
        filled = sum(1 for f in fields if payload.get(f))
        context_score = filled / len(fields)
    
    # 2. Evidence Quality
    evidence_quality = evidence_coverage
    if state.knowledge_artifact and state.knowledge_artifact.payload:
        evidence_quality = (evidence_coverage + state.knowledge_artifact.payload.confidence_score) / 2
        
    # 3. Decision Quality
    decision_quality = 0.0
    if state.decision_artifact and state.decision_artifact.payload:
        dec = state.decision_artifact.payload
        decision_quality = dec.confidence_split.get("overall_confidence", dec.confidence_split.get("overall", 0.8))
        
    # 4. Strategy Quality
    strategy_quality = 0.0
    if state.strategy_artifact and state.strategy_artifact.payload:
        strat = state.strategy_artifact.payload
        strategy_quality = (strat.estimated_success_probability + strat.confidence) / 2
        
    # 5. Validation Success
    validation_quality = 1.0 if validation_status == "passed" else 0.3
    
    # 6. Business Alignment
    alignment_quality = consistency_score
    
    # 7. Explainability
    explainability_quality = 0.95
    
    dimension_scores = {
        "context_quality": round(context_score, 4),
        "evidence_quality": round(evidence_quality, 4),
        "decision_quality": round(decision_quality, 4),
        "strategy_quality": round(strategy_quality, 4),
        "validation_success": round(validation_quality, 4),
        "business_alignment": round(alignment_quality, 4),
        "explainability": round(explainability_quality, 4),
        "governance_adherence": round(governance_score, 4)
    }
    
    # Weighted average trust calculation
    raw_trust = (
        context_score * 0.10 +
        evidence_quality * 0.15 +
        decision_quality * 0.15 +
        strategy_quality * 0.15 +
        validation_quality * 0.15 +
        alignment_quality * 0.20 +
        explainability_quality * 0.10
    )
    
    # Apply Hallucination Penalty
    overall_trust = raw_trust * (1.0 - hallucination_risk * 0.5)
    overall_trust = max(0.0, min(1.0, overall_trust))
    
    reasoning = (
        f"Trust score calculated at {overall_trust:.4f}. "
        f"Key dimensions: Goal consistency ({alignment_quality:.2%}), Evidence coverage ({evidence_coverage:.2%}), "
        f"Hallucination risk penalty ({hallucination_risk * 50:.1%})."
    )
    
    return {
        "overall_trust_score": round(overall_trust, 4),
        "overall_confidence": round(raw_trust, 4),
        "dimension_scores": dimension_scores,
        "reasoning": reasoning
    }
