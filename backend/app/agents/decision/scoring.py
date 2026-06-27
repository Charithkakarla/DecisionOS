# Contains: scoring.py implementation.
import logging

logger = logging.getLogger("decision_os.decision.scoring")

# Configurable constants for thresholds and weights
REVENUE_MAX_THRESHOLD = 200000.0
STAGE_MULTIPLIERS = {
    "negotiation": 1.0,
    "proposal": 0.85,
    "evaluation": 0.65,
    "discovery": 0.4,
    "qualification": 0.5,
    "closed": 1.0,
    "unknown": 0.2
}
URGENCY_MULTIPLIERS = {
    "high": 1.0,
    "medium": 0.6,
    "low": 0.2,
    "unknown": 0.4
}

def calculate_business_scores(raw_data: dict, confidence_metrics: dict) -> dict:
    logger.info("Computing business scores...")
    
    # 1. Decision Readiness (derived from confidence factors)
    conf_split = confidence_metrics.get("confidence_split", {})
    if conf_split:
        decision_readiness = conf_split.get("decision_confidence", 0.0)
    else:
        dim_scores = confidence_metrics.get("dimension_scores", {})
        has_budget = dim_scores.get("budget_available", 0.0)
        has_timeline = dim_scores.get("timeline_available", 0.0)
        has_stakeholders = dim_scores.get("stakeholders_present", 0.0)
        decision_readiness = (has_budget * 0.4) + (has_timeline * 0.3) + (has_stakeholders * 0.3)
    
    # 2. Estimated Revenue & Time to Close
    estimated_revenue = float(raw_data.get("estimated_revenue") or 0.0)
    time_to_close = int(raw_data.get("estimated_time_to_close") or 30)
    
    # 3. Opportunity Score
    buying_stage = str(raw_data.get("buying_stage") or "discovery").lower()
    stage_mult = STAGE_MULTIPLIERS.get(buying_stage, STAGE_MULTIPLIERS["discovery"])
    rev_fraction = min(1.0, estimated_revenue / REVENUE_MAX_THRESHOLD)
    
    opp_score = (stage_mult * 0.6) + (rev_fraction * 0.4)
    
    # 4. Risk Score
    missing_info = raw_data.get("missing_information") or []
    business_risks = raw_data.get("business_risks") or []
    
    missing_info_score = min(1.0, len(missing_info) / 5.0)
    business_risks_score = min(1.0, len(business_risks) / 5.0)
    
    risk_score = (missing_info_score * 0.5) + (business_risks_score * 0.5)
    
    # 5. Business Value Score
    business_value_score = min(1.0, estimated_revenue / REVENUE_MAX_THRESHOLD)
    
    # 6. Priority Score
    urgency = str(raw_data.get("urgency") or "medium").lower()
    urgency_mult = URGENCY_MULTIPLIERS.get(urgency, URGENCY_MULTIPLIERS["medium"])
    
    priority_score = (urgency_mult * 0.4) + (opp_score * 0.4) - (risk_score * 0.2)
    # Clamp between 0.0 and 1.0
    priority_score = max(0.0, min(1.0, priority_score))
    
    scores = {
        "decision_readiness": round(decision_readiness, 4),
        "opportunity_score": round(opp_score, 4),
        "risk_score": round(risk_score, 4),
        "business_value_score": round(business_value_score, 4),
        "priority_score": round(priority_score, 4)
    }
    
    logger.info(f"Calculated business metrics: {scores}")
    return scores
