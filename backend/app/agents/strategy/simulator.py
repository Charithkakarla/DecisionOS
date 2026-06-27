# Contains: simulator.py — deterministic Business Simulator for the Strategy Intelligence Agent.
# Calculates three strategic scenarios (Optimistic, Realistic, Conservative).
# No LLM calls. All calculations are based on business scores, context, and evidence.
import logging
from app.schemas.state import DecisionPackage, ScenarioOutcome
from app.agents.strategy.schemas import OptimizationResult, SimulationResult

logger = logging.getLogger("decision_os.strategy.simulator")

# Scenario adjustment multipliers
SCENARIO_MULTIPLIERS = {
    "optimistic": {
        "probability_boost": 0.15,
        "roi_boost": 0.25,
        "timeline_factor": 0.90,    # 10% faster
        "cost_factor": 1.00,        # no change
    },
    "realistic": {
        "probability_boost": 0.00,
        "roi_boost": 0.00,
        "timeline_factor": 1.00,
        "cost_factor": 1.00,
    },
    "conservative": {
        "probability_boost": -0.15,
        "roi_boost": -0.20,
        "timeline_factor": 1.20,    # 20% slower
        "cost_factor": 1.10,        # 10% more expensive
    },
}

# Base cost-per-resource-per-day estimate (USD)
COST_PER_RESOURCE_PER_DAY = 500.0

# Revenue baseline fraction for business impact dimensions
REVENUE_FRACTION_FOR_SAVINGS = 0.12    # 12% of revenue = operational savings
REVENUE_FRACTION_FOR_RETENTION = 0.08  # 8% of revenue tied to retention
DAYS_CYCLE_REDUCTION = 5.0             # average decision cycle reduction in days


def _calculate_base_probability(decision_package: DecisionPackage) -> float:
    """
    Compute baseline success probability from decision package scores.

    Weighted blend:
        decision_readiness × 0.35
        opportunity_score  × 0.35
        overall_confidence × 0.30
    """
    scores = decision_package.business_scores
    conf = decision_package.confidence_split

    decision_readiness = scores.get("decision_readiness", 0.5)
    opportunity_score = scores.get("opportunity_score", 0.5)
    overall_confidence = conf.get("overall_confidence", 0.5)

    prob = (
        decision_readiness * 0.35
        + opportunity_score * 0.35
        + overall_confidence * 0.30
    )
    return round(min(1.0, max(0.0, prob)), 4)


def _calculate_base_roi(decision_package: DecisionPackage) -> float:
    """
    Estimate baseline ROI from estimated revenue and opportunity score.
    ROI = estimated_revenue × opportunity_score × (1 - risk_score)
    """
    analysis = decision_package.analysis
    scores = decision_package.business_scores

    estimated_revenue = analysis.estimated_revenue if analysis else 0.0
    opportunity_score = scores.get("opportunity_score", 0.5)
    risk_score = scores.get("risk_score", 0.3)

    roi = estimated_revenue * opportunity_score * (1.0 - risk_score)
    return round(max(0.0, roi), 2)


def _calculate_base_timeline_days(decision_package: DecisionPackage) -> int:
    """
    Estimate base timeline from the best recommendation's timeline string (already parsed by optimizer).
    Use estimated_time_to_close as fallback.
    """
    analysis = decision_package.analysis
    if analysis:
        return max(1, analysis.estimated_time_to_close)

    recs = decision_package.recommendations
    if recs:
        from app.agents.strategy.optimizer import _parse_timeline_days
        return _parse_timeline_days(recs[0].timeline)

    return 30


def _calculate_base_cost(resource_count: int, timeline_days: int) -> float:
    """
    Estimate cost from resource headcount and timeline.
    cost = resource_count × timeline_days × COST_PER_RESOURCE_PER_DAY
    """
    return round(resource_count * timeline_days * COST_PER_RESOURCE_PER_DAY, 2)


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return min(high, max(low, value))


def simulate_scenarios(
    decision_package: DecisionPackage,
    optimization_result: OptimizationResult,
) -> tuple[SimulationResult, list[ScenarioOutcome]]:
    """
    Simulate Optimistic, Realistic, and Conservative outcomes.

    Returns:
        SimulationResult — raw numerical breakdown
        list[ScenarioOutcome] — three assembled Pydantic scenario objects
    """
    logger.info("Running business scenario simulation (Optimistic / Realistic / Conservative)...")

    base_probability = _calculate_base_probability(decision_package)
    base_roi = _calculate_base_roi(decision_package)
    base_timeline = _calculate_base_timeline_days(decision_package)

    # Determine resource count from best recommendation
    best_id = optimization_result.best_recommendation_id
    best_rec = next(
        (r for r in decision_package.recommendations if r.id == best_id),
        decision_package.recommendations[0] if decision_package.recommendations else None,
    )
    resource_count = len(best_rec.required_resources) if best_rec else 2
    base_cost = _calculate_base_cost(resource_count, base_timeline)

    # Business impact baselines
    analysis = decision_package.analysis
    estimated_revenue = analysis.estimated_revenue if analysis else 0.0
    scores = decision_package.business_scores
    risk_score = scores.get("risk_score", 0.3)
    business_value_score = scores.get("business_value_score", 0.5)

    base_revenue_impact = round(estimated_revenue * scores.get("opportunity_score", 0.5), 2)
    base_operational_savings = round(estimated_revenue * REVENUE_FRACTION_FOR_SAVINGS * business_value_score, 2)
    base_customer_retention = round(_clamp(1.0 - risk_score) * REVENUE_FRACTION_FOR_RETENTION, 4)
    base_risk_reduction = round(_clamp(1.0 - risk_score), 4)
    base_productivity_improvement = round(_clamp(business_value_score * 0.35), 4)
    base_decision_cycle_reduction = DAYS_CYCLE_REDUCTION

    # Assemble SimulationResult
    simulation = SimulationResult(
        optimistic_roi=round(base_roi * (1.0 + SCENARIO_MULTIPLIERS["optimistic"]["roi_boost"]), 2),
        realistic_roi=round(base_roi, 2),
        conservative_roi=round(base_roi * (1.0 + SCENARIO_MULTIPLIERS["conservative"]["roi_boost"]), 2),
        optimistic_probability=round(_clamp(base_probability + SCENARIO_MULTIPLIERS["optimistic"]["probability_boost"]), 4),
        realistic_probability=round(base_probability, 4),
        conservative_probability=round(_clamp(base_probability + SCENARIO_MULTIPLIERS["conservative"]["probability_boost"]), 4),
        optimistic_timeline_days=max(1, int(base_timeline * SCENARIO_MULTIPLIERS["optimistic"]["timeline_factor"])),
        realistic_timeline_days=max(1, base_timeline),
        conservative_timeline_days=max(1, int(base_timeline * SCENARIO_MULTIPLIERS["conservative"]["timeline_factor"])),
        optimistic_cost=round(base_cost * SCENARIO_MULTIPLIERS["optimistic"]["cost_factor"], 2),
        realistic_cost=round(base_cost, 2),
        conservative_cost=round(base_cost * SCENARIO_MULTIPLIERS["conservative"]["cost_factor"], 2),
        base_revenue_impact=base_revenue_impact,
        base_operational_savings=base_operational_savings,
        base_customer_retention=base_customer_retention,
        base_risk_reduction=base_risk_reduction,
        base_productivity_improvement=base_productivity_improvement,
        base_decision_cycle_reduction=base_decision_cycle_reduction,
    )

    # Retrieve best recommendation's risks for scenario key risks
    best_risks = best_rec.risks if best_rec else ["Execution delays", "Resource constraints"]

    # Build scenario outcome objects
    optimistic_scenario = ScenarioOutcome(
        scenario_type="optimistic",
        expected_roi=simulation.optimistic_roi,
        success_probability=simulation.optimistic_probability,
        timeline_days=simulation.optimistic_timeline_days,
        estimated_cost=simulation.optimistic_cost,
        key_risks=["Assumes full stakeholder alignment", "Requires accelerated onboarding"],
        success_criteria=[
            "All execution phases complete within optimistic timeline",
            "ROI realized within first 60 days",
            "Zero critical escalations during rollout",
        ],
        revenue_impact=round(base_revenue_impact * 1.25, 2),
        operational_savings=round(base_operational_savings * 1.20, 2),
        customer_retention_impact=round(base_customer_retention * 1.10, 4),
    )

    realistic_scenario = ScenarioOutcome(
        scenario_type="realistic",
        expected_roi=simulation.realistic_roi,
        success_probability=simulation.realistic_probability,
        timeline_days=simulation.realistic_timeline_days,
        estimated_cost=simulation.realistic_cost,
        key_risks=best_risks[:2] if best_risks else ["Moderate execution risk"],
        success_criteria=[
            "Execution milestones met within ±10% of planned timeline",
            "ROI target achieved within 90 days",
            "Stakeholder sign-off obtained at each phase gate",
        ],
        revenue_impact=base_revenue_impact,
        operational_savings=base_operational_savings,
        customer_retention_impact=base_customer_retention,
    )

    conservative_scenario = ScenarioOutcome(
        scenario_type="conservative",
        expected_roi=simulation.conservative_roi,
        success_probability=simulation.conservative_probability,
        timeline_days=simulation.conservative_timeline_days,
        estimated_cost=simulation.conservative_cost,
        key_risks=best_risks if best_risks else ["High execution risk", "Extended timeline"],
        success_criteria=[
            "Core deliverables completed within extended timeline",
            "Minimum viable ROI demonstrated within 120 days",
            "Risk mitigations activated at first sign of delay",
        ],
        revenue_impact=round(base_revenue_impact * 0.80, 2),
        operational_savings=round(base_operational_savings * 0.75, 2),
        customer_retention_impact=round(base_customer_retention * 0.90, 4),
    )

    scenarios = [optimistic_scenario, realistic_scenario, conservative_scenario]

    logger.info(
        f"Simulation complete. ROI — Optimistic: {simulation.optimistic_roi:.2f}, "
        f"Realistic: {simulation.realistic_roi:.2f}, Conservative: {simulation.conservative_roi:.2f}"
    )

    return simulation, scenarios
