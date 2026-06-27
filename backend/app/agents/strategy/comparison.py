# Contains: comparison.py — Strategy Comparison Engine for the Strategy Intelligence Agent.
# Compares up to 3 recommendation options side-by-side and selects a winner deterministically.
import logging
from app.schemas.state import DecisionPackage, Recommendation
from app.agents.strategy.schemas import ComparisonEntry, ComparisonResult, OptimizationResult

logger = logging.getLogger("decision_os.strategy.comparison")

RISK_DISPLAY = {"Low": "🟢 Low", "Medium": "🟡 Medium", "High": "🔴 High"}
COMPLEXITY_DISPLAY = {"Low": "Simple", "Medium": "Moderate", "High": "Complex"}


def _build_pros(rec: Recommendation) -> list[str]:
    """Extract pros from recommendation benefits."""
    pros = list(rec.benefits[:3]) if rec.benefits else []
    if rec.risk_level == "Low":
        pros.append("Low implementation risk")
    if rec.confidence >= 0.85:
        pros.append(f"High confidence ({rec.confidence:.0%})")
    return pros or ["Strong evidence backing", "Proven methodology"]


def _build_cons(rec: Recommendation) -> list[str]:
    """Extract cons from recommendation tradeoffs and risks."""
    cons = list(rec.tradeoffs[:2]) if rec.tradeoffs else []
    if rec.risks:
        cons.append(rec.risks[0])
    if rec.risk_level == "High":
        cons.append("Elevated execution risk requires close monitoring")
    return cons or ["Requires careful planning"]


def _business_impact_label(rec: Recommendation, score: float) -> str:
    """Generate a concise business impact description."""
    if score >= 0.75:
        return f"High impact — confidence {rec.confidence:.0%}, low risk profile"
    if score >= 0.50:
        return f"Medium impact — moderate risk, {rec.timeline} delivery"
    return f"Conservative impact — risk-aware approach, {rec.timeline} delivery"


def compare_recommendations(
    decision_package: DecisionPackage,
    optimization_result: OptimizationResult,
) -> ComparisonResult:
    """
    Produce a side-by-side comparison of all recommendations.
    Winner is determined by the optimizer's composite scores (deterministic).
    """
    logger.info("Running strategy comparison engine...")

    recommendations = decision_package.recommendations[:3]
    if not recommendations:
        return ComparisonResult(
            winner_title="No recommendations to compare",
            comparison_summary="Decision Package contained no recommendations.",
        )

    entries: list[ComparisonEntry] = []
    for rec in recommendations:
        opt_score = optimization_result.optimization_scores.get(rec.id, rec.confidence)
        from app.agents.strategy.optimizer import _parse_timeline_days, _complexity_label
        days = _parse_timeline_days(rec.timeline)
        complexity = _complexity_label(len(rec.required_resources), days)

        entry = ComparisonEntry(
            title=rec.title,
            pros=_build_pros(rec),
            cons=_build_cons(rec),
            business_impact=_business_impact_label(rec, opt_score),
            risk_level=RISK_DISPLAY.get(rec.risk_level, rec.risk_level),
            complexity=COMPLEXITY_DISPLAY.get(complexity, complexity),
            timeline=rec.timeline,
            roi=round(rec.confidence * 100.0, 1),   # ROI proxy: confidence × 100
            composite_score=opt_score,
        )
        entries.append(entry)

    # Winner = highest composite score (already computed by optimizer)
    winner = max(entries, key=lambda e: e.composite_score)

    # Comparison summary
    summary_lines = [
        f"Three strategies were evaluated. The recommended strategy is '{winner.title}'.",
        f"It achieved the highest composite score of {winner.composite_score:.2f}.",
    ]
    if len(entries) >= 2:
        runner_up = sorted(entries, key=lambda e: e.composite_score, reverse=True)[1]
        summary_lines.append(
            f"'{runner_up.title}' is a viable alternative with score {runner_up.composite_score:.2f}."
        )
    summary = " ".join(summary_lines)

    winner_reasoning = (
        f"'{winner.title}' was selected based on its superior balance of confidence, "
        f"implementation risk, timeline efficiency, and evidence quality. "
        f"Composite optimization score: {winner.composite_score:.2f}."
    )

    logger.info(f"Comparison complete. Winner: '{winner.title}' (score={winner.composite_score:.2f})")

    return ComparisonResult(
        entries=entries,
        winner_title=winner.title,
        winner_reasoning=winner_reasoning,
        comparison_summary=summary,
    )
