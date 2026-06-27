# Contains: optimizer.py — deterministic Strategy Optimizer for the Strategy Intelligence Agent.
# No LLM calls. Pure algorithmic ranking based on recommendation attributes.
import logging
from app.schemas.state import DecisionPackage, Recommendation
from app.agents.strategy.schemas import OptimizationResult

logger = logging.getLogger("decision_os.strategy.optimizer")

# Risk level weights (lower = better = lower penalty)
RISK_WEIGHTS = {"Low": 0.10, "Medium": 0.40, "High": 0.80}

# Timeline parsing: keywords to days approximation
TIMELINE_DAY_MAP = {
    "1 day": 1, "2 days": 2, "3 days": 3, "5 days": 5,
    "7 days": 7, "1 week": 7, "10 days": 10, "14 days": 14,
    "2 weeks": 14, "21 days": 21, "3 weeks": 21,
    "30 days": 30, "1 month": 30, "45 days": 45,
    "60 days": 60, "2 months": 60, "90 days": 90, "3 months": 90,
}

# Complexity thresholds by resource count and timeline
_COMPLEXITY_THRESHOLDS = [
    (2, 14, "Low"),
    (4, 30, "Medium"),
]


def _parse_timeline_days(timeline: str) -> int:
    """Convert a timeline string to an estimated number of days."""
    tl = timeline.lower().strip()
    for key, days in TIMELINE_DAY_MAP.items():
        if key in tl:
            return days
    # Attempt to extract a leading number
    import re
    match = re.search(r"(\d+)", tl)
    if match:
        return int(match.group(1))
    return 30  # default fallback


def _timeline_score(days: int) -> float:
    """Shorter timelines score higher (max 1.0 for 7 days or less, 0.1 for 90+)."""
    if days <= 7:
        return 1.0
    if days <= 14:
        return 0.85
    if days <= 21:
        return 0.70
    if days <= 30:
        return 0.55
    if days <= 45:
        return 0.40
    if days <= 60:
        return 0.25
    return 0.10


def _complexity_label(resource_count: int, timeline_days: int) -> str:
    """Determine implementation complexity from resource count and timeline."""
    for res_thresh, day_thresh, label in _COMPLEXITY_THRESHOLDS:
        if resource_count <= res_thresh and timeline_days <= day_thresh:
            return label
    return "High"


def _composite_score(rec: Recommendation) -> float:
    """
    Deterministic composite optimization score.

    Formula:
        score = confidence × 0.35
              + (1 - risk_weight) × 0.30
              + timeline_score × 0.20
              + evidence_quality × 0.15

    All factors are bounded [0, 1].
    """
    confidence = min(1.0, max(0.0, rec.confidence))
    risk_weight = RISK_WEIGHTS.get(rec.risk_level, RISK_WEIGHTS["Medium"])
    risk_factor = 1.0 - risk_weight

    days = _parse_timeline_days(rec.timeline)
    tl_score = _timeline_score(days)

    # Evidence quality: average similarity_score across all evidence IDs (proxy = rec.similarity_score)
    evidence_quality = min(1.0, max(0.0, rec.similarity_score))

    score = (
        confidence * 0.35
        + risk_factor * 0.30
        + tl_score * 0.20
        + evidence_quality * 0.15
    )
    return round(score, 4)


def optimize_recommendations(decision_package: DecisionPackage) -> OptimizationResult:
    """
    Rank all recommendations in the DecisionPackage and select the best one.

    Returns an OptimizationResult with ranked IDs, titles, scores, and complexity estimate.
    """
    logger.info("Running deterministic strategy optimizer...")

    recommendations = decision_package.recommendations
    if not recommendations:
        logger.warning("No recommendations found in DecisionPackage.")
        return OptimizationResult(
            best_recommendation_id="none",
            best_recommendation_title="No recommendations available",
        )

    # Compute composite score for each recommendation
    scored: list[tuple[float, Recommendation]] = []
    for rec in recommendations:
        score = _composite_score(rec)
        scored.append((score, rec))
        logger.debug(f"  [{rec.id}] '{rec.title}' → composite score: {score}")

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)

    best_score, best_rec = scored[0]

    ranked_ids = [rec.id for _, rec in scored]
    ranked_titles = [rec.title for _, rec in scored]
    scores_map = {rec.id: score for score, rec in scored}

    # Determine overall implementation complexity from best recommendation
    best_days = _parse_timeline_days(best_rec.timeline)
    best_resources = len(best_rec.required_resources)
    complexity = _complexity_label(best_resources, best_days)

    logger.info(
        f"Optimizer complete. Best: '{best_rec.title}' (score={best_score}), complexity={complexity}"
    )

    return OptimizationResult(
        best_recommendation_id=best_rec.id,
        best_recommendation_title=best_rec.title,
        ranked_recommendation_ids=ranked_ids,
        ranked_recommendation_titles=ranked_titles,
        optimization_scores=scores_map,
        complexity=complexity,
        composite_score=best_score,
    )
