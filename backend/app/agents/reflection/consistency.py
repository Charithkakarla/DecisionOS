# Contains: consistency.py implementation.
import re
from typing import Dict, Any

from app.schemas.state import WorkflowState

def check_consistency(state: WorkflowState) -> Dict[str, Any]:
    report = {
        "aligned": True,
        "consistency_score": 1.0,
        "goal_match": True,
        "kpi_match": True,
        "risk_consistency": True,
        "priority_match": True,
        "financial_alignment": True,
        "contradictions": [],
        "warnings": []
    }
    
    if not state.decision_artifact or not state.strategy_artifact:
        report["aligned"] = False
        report["consistency_score"] = 0.0
        report["contradictions"].append("Cannot evaluate consistency: missing artifacts")
        return report

    dec_pkg = state.decision_artifact.payload
    strat_pkg = state.strategy_artifact.payload

    # 1. Compare Goals
    dec_goal = dec_pkg.business_goal.lower().strip() if dec_pkg.business_goal else ""
    strat_goal = strat_pkg.selected_strategy.lower().strip() if strat_pkg.selected_strategy else ""
    # Simple semantic overlap check
    intersection = set(dec_goal.split()) & set(strat_goal.split())
    if len(intersection) == 0 and dec_goal and strat_goal:
        report["goal_match"] = False
        report["contradictions"].append("Business goal inside Decision and Strategy are distinct")
        report["consistency_score"] -= 0.2

    # 2. Risk Check
    primary_recs = [r for r in dec_pkg.recommendations if r.rank == 1]
    if primary_recs:
        primary_rec = primary_recs[0]
        if primary_rec.risk_level.lower() == "high" and strat_pkg.implementation_complexity.lower() == "low":
            report["risk_consistency"] = False
            report["warnings"].append("Primary recommendation carries HIGH risk, but Strategy reports LOW complexity")
            report["consistency_score"] -= 0.15

    # 3. Priority Check
    dec_priority_score = dec_pkg.business_scores.get("priority_score", 0.5)
    strat_priority = strat_pkg.priority.lower()
    if dec_priority_score > 0.8 and strat_priority in ["medium", "low"]:
        report["priority_match"] = False
        report["warnings"].append(f"Decision priority score is High ({dec_priority_score}), but Strategy priority is set to {strat_pkg.priority}")
        report["consistency_score"] -= 0.15

    # 4. Financial alignment (revenue and costs)
    dec_revenue = dec_pkg.analysis.estimated_revenue if dec_pkg.analysis else 0.0
    strat_revenue = strat_pkg.business_impact.revenue_increase
    if dec_revenue > 0 and strat_revenue == 0:
        report["financial_alignment"] = False
        report["warnings"].append(f"Decision analysis forecasts revenue potential (${dec_revenue:,.2f}) but Strategy business impact is $0.")
        report["consistency_score"] -= 0.15

    # 5. Timeline comparison
    if primary_recs:
        primary_timeline = primary_recs[0].timeline.lower()
        strategy_timeline = strat_pkg.implementation_timeline.lower()
        dec_days = [int(s) for s in re.findall(r'\b\d+\b', primary_timeline)]
        strat_days = [int(s) for s in re.findall(r'\b\d+\b', strategy_timeline)]
        if dec_days and strat_days:
            if strat_days[0] < dec_days[0] // 2:
                report["warnings"].append(f"Strategy timeline ({strategy_timeline}) is significantly shorter than recommendation timeline ({primary_timeline})")
                report["consistency_score"] -= 0.1

    report["consistency_score"] = max(0.0, min(1.0, report["consistency_score"]))
    if report["consistency_score"] < 0.7:
        report["aligned"] = False

    return report
