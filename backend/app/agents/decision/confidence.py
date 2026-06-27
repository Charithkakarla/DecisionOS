# Contains: confidence.py implementation.
import logging

logger = logging.getLogger("decision_os.decision.confidence")

def calculate_confidence(context: dict, evidence_list: list, provider_name: str = "Gemini") -> dict:
    logger.info("Computing split confidence scores...")
    
    # 1. Context Confidence
    core_fields = ["meeting_summary", "customer_profile", "pain_points", "decision_makers", "budget", "timeline"]
    non_empty_count = sum(1 for field in core_fields if context.get(field))
    context_confidence = non_empty_count / len(core_fields) if core_fields else 0.0
    
    # 2. Evidence Confidence
    evidence_coverage = min(1.0, len(evidence_list) / 5.0) if evidence_list else 0.0
    total_similarity = sum(float(item.get("similarity", item.get("similarity_score", 0.0))) for item in evidence_list)
    knowledge_quality = total_similarity / len(evidence_list) if evidence_list else 0.0
    evidence_confidence = (evidence_coverage * 0.6) + (knowledge_quality * 0.4)
    
    # 3. Provider Confidence
    p_name = provider_name.lower()
    if "gemini" in p_name:
        provider_confidence = 0.95
    elif "grok" in p_name:
        provider_confidence = 0.90
    else:
        provider_confidence = 0.80  # fallback mock
        
    # 4. Decision Confidence (computed based on completeness of buying signals)
    has_budget = 1.0 if context.get("budget") and str(context["budget"]).lower() not in ["none", "unknown", "null", ""] else 0.0
    has_timeline = 1.0 if context.get("timeline") and str(context["timeline"]).lower() not in ["none", "unknown", "null", ""] else 0.0
    has_stakeholders = 1.0 if context.get("decision_makers") and len(context["decision_makers"]) > 0 else 0.0
    decision_confidence = (has_budget * 0.4) + (has_timeline * 0.3) + (has_stakeholders * 0.3)
    
    # 5. Overall Confidence
    overall_confidence = (context_confidence * 0.3) + (evidence_confidence * 0.3) + (provider_confidence * 0.1) + (decision_confidence * 0.3)
    
    split_scores = {
        "overall_confidence": round(overall_confidence, 4),
        "evidence_confidence": round(evidence_confidence, 4),
        "context_confidence": round(context_confidence, 4),
        "provider_confidence": round(provider_confidence, 4),
        "decision_confidence": round(decision_confidence, 4)
    }
    
    # Generate confidence reasoning
    reasons = []
    if overall_confidence >= 0.75:
        reasons.append("High confidence: Context is complete, key buy signals are identified, and solid evidence playbooks exist.")
    elif overall_confidence >= 0.45:
        reasons.append("Medium confidence: Context is partially populated, but some key metrics (like budget or stakeholders) are missing.")
    else:
        reasons.append("Low confidence: Significant missing information in the call context and limited evidence playbooks.")
        
    if not has_stakeholders:
        reasons.append("Decision-makers were not explicitly identified.")
    if not has_budget:
        reasons.append("Budget details are currently unspecified.")
    if not has_timeline:
        reasons.append("Deal timeline is unknown.")
        
    confidence_reasoning = " ".join(reasons)
    
    logger.info(f"Split confidence calculations complete: {split_scores}")
    return {
        "confidence_split": split_scores,
        "overall_confidence": round(overall_confidence, 4),
        "confidence_reasoning": confidence_reasoning
    }
