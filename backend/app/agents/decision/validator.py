# Contains: validator.py implementation.
import logging
from app.schemas.state import DecisionPackage

logger = logging.getLogger("decision_os.decision.validator")

class DecisionValidationError(ValueError):
    """Custom exception raised for DecisionPackage validation failures."""
    pass

def validate_decision_package(pkg: DecisionPackage) -> None:
    logger.info("Validating compiled DecisionPackage...")
    
    # 1. Validate Business Scores
    for score_name, score_val in pkg.business_scores.items():
        if not (0.0 <= score_val <= 1.0):
            raise DecisionValidationError(f"Business score '{score_name}' ({score_val}) is out of range [0.0, 1.0].")
            
    # 2. Validate Split Confidence metrics
    splits = pkg.confidence_split
    required_splits = ["overall_confidence", "evidence_confidence", "context_confidence", "provider_confidence", "decision_confidence"]
    for split in required_splits:
        if split not in splits:
            raise DecisionValidationError(f"Missing required split confidence category: '{split}'.")
        val = splits[split]
        if not (0.0 <= val <= 1.0):
            raise DecisionValidationError(f"Split confidence score '{split}' ({val}) is out of range [0.0, 1.0].")
            
    # 3. Validate Revenue (backward-compatible check)
    if pkg.analysis and pkg.analysis.estimated_revenue < 0.0:
        raise DecisionValidationError(f"Estimated revenue ({pkg.analysis.estimated_revenue}) cannot be negative.")
        
    # 4. Validate Recommendation Count
    recs_len = len(pkg.recommendations)
    if recs_len != 3:
        raise DecisionValidationError(f"Decision Package must contain exactly three ranked recommendations, got {recs_len}.")
        
    # 5. Validate Recommendation Attributes
    valid_risk_levels = {"High", "Medium", "Low"}
    for idx, rec in enumerate(pkg.recommendations):
        if not rec.title or not rec.title.strip():
            raise DecisionValidationError(f"Recommendation at index {idx} has an empty title.")
        if rec.rank != (idx + 1):
            raise DecisionValidationError(f"Recommendation rank mismatch at index {idx}. Expected {idx + 1}, got {rec.rank}.")
        if rec.risk_level not in valid_risk_levels:
            raise DecisionValidationError(f"Recommendation at index {idx} has an invalid risk level: '{rec.risk_level}'.")
        if not (0.0 <= rec.confidence <= 1.0):
            raise DecisionValidationError(f"Recommendation at index {idx} has confidence ({rec.confidence}) out of range [0.0, 1.0].")
        if not rec.why_this_recommendation or not rec.why_this_recommendation.strip():
            raise DecisionValidationError(f"Recommendation at index {idx} is missing explainability field 'why_this_recommendation'.")
            
    logger.info("DecisionPackage successfully validated against Sprint 5/5.5 schema.")
