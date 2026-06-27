"""
Escalation Engine — Sprint 8.

Automatically determines whether escalation is required based on risk signals
extracted from the WorkflowState snapshot. Returns a structured escalation
recommendation that ApprovalService uses to pre-populate escalation data.

Escalation triggers:
  - High risk score (decision agent)
  - Low overall trust score (reflection agent)
  - High estimated revenue
  - Missing critical evidence
  - High hallucination risk
  - Critical findings from reflection
  - Low governance score
  - High implementation complexity (strategy agent)
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("decision_os.approval.escalation")

# ── Thresholds ───────────────────────────────────────────────────────────────
_RISK_SCORE_HIGH = 0.6
_TRUST_SCORE_LOW = 0.5
_REVENUE_HIGH = 150_000.0
_HALLUCINATION_RISK_HIGH = 0.4
_GOVERNANCE_SCORE_LOW = 0.5
_EVIDENCE_COVERAGE_LOW = 0.3

# Executive escalation targets by trigger category
_ESCALATION_TARGETS: dict[str, str] = {
    "high_risk": "Chief Risk Officer",
    "low_trust": "Chief Executive Officer",
    "high_revenue": "Chief Financial Officer",
    "missing_evidence": "Chief Operating Officer",
    "high_hallucination": "Chief Technology Officer",
    "critical_findings": "Board of Directors",
    "low_governance": "Chief Compliance Officer",
    "high_complexity": "Chief Operating Officer",
}


def _extract_reflection_signals(state_snapshot: dict[str, Any]) -> dict[str, Any]:
    """Extract relevant signals from the reflection artifact payload."""
    reflection = state_snapshot.get("reflection_artifact")
    if not reflection:
        return {}
    payload = reflection.get("payload", {})
    return {
        "trust_score": payload.get("overall_trust_score", 1.0),
        "hallucination_risk": payload.get("hallucination_risk", 0.0),
        "governance_score": payload.get("governance_score", 1.0),
        "evidence_coverage": payload.get("evidence_coverage", 1.0),
        "critical_findings": payload.get("critical_findings", []),
        "validation_status": payload.get("validation_status", "passed"),
    }


def _extract_decision_signals(state_snapshot: dict[str, Any]) -> dict[str, Any]:
    """Extract relevant signals from the decision artifact payload."""
    decision = state_snapshot.get("decision_artifact")
    if not decision:
        return {}
    payload = decision.get("payload", {})
    analysis = payload.get("analysis", {})
    if isinstance(analysis, dict):
        revenue = analysis.get("estimated_revenue", 0.0)
        risk_score = (
            payload.get("business_scores", {}).get("risk_score", 0.0)
        )
    else:
        revenue = payload.get("estimated_revenue", 0.0)
        risk_score = payload.get("risk_score", 0.0)
    return {
        "estimated_revenue": revenue,
        "risk_score": risk_score,
        "missing_information": payload.get("missing_information", []),
    }


def _extract_strategy_signals(state_snapshot: dict[str, Any]) -> dict[str, Any]:
    """Extract relevant signals from the strategy artifact payload."""
    strategy = state_snapshot.get("strategy_artifact")
    if not strategy:
        return {}
    payload = strategy.get("payload", {})
    return {
        "implementation_complexity": payload.get("implementation_complexity", "Medium"),
        "risks": payload.get("risks", []),
    }


def evaluate_escalation(state_snapshot: dict[str, Any]) -> dict[str, Any]:
    """
    Evaluate all risk signals and return a structured escalation recommendation.

    Args:
        state_snapshot: Serialised WorkflowState dict.

    Returns:
        dict with:
          escalation_required (bool),
          escalation_reason (str),
          escalated_to (str),
          triggers (list[str]),
          trigger_details (list[dict]),
          severity (str: low | medium | high | critical)
    """
    triggers: list[str] = []
    trigger_details: list[dict[str, Any]] = []
    recommended_target: str = "Chief Executive Officer"

    ref = _extract_reflection_signals(state_snapshot)
    dec = _extract_decision_signals(state_snapshot)
    strat = _extract_strategy_signals(state_snapshot)

    # ── Trigger 1: High risk score ────────────────────────────────────────
    risk_score = dec.get("risk_score", 0.0)
    if risk_score >= _RISK_SCORE_HIGH:
        triggers.append("high_risk")
        trigger_details.append({
            "trigger": "high_risk",
            "value": risk_score,
            "threshold": _RISK_SCORE_HIGH,
            "description": f"Decision risk score ({risk_score:.0%}) exceeds acceptable threshold.",
            "recommended_escalation_target": _ESCALATION_TARGETS["high_risk"],
        })
        recommended_target = _ESCALATION_TARGETS["high_risk"]

    # ── Trigger 2: Low trust score ────────────────────────────────────────
    trust_score = ref.get("trust_score", 1.0)
    if trust_score < _TRUST_SCORE_LOW:
        triggers.append("low_trust")
        trigger_details.append({
            "trigger": "low_trust",
            "value": trust_score,
            "threshold": _TRUST_SCORE_LOW,
            "description": f"Overall trust score ({trust_score:.0%}) is below acceptable threshold.",
            "recommended_escalation_target": _ESCALATION_TARGETS["low_trust"],
        })
        recommended_target = _ESCALATION_TARGETS["low_trust"]

    # ── Trigger 3: High estimated revenue ────────────────────────────────
    revenue = dec.get("estimated_revenue", 0.0)
    if revenue >= _REVENUE_HIGH:
        triggers.append("high_revenue")
        trigger_details.append({
            "trigger": "high_revenue",
            "value": revenue,
            "threshold": _REVENUE_HIGH,
            "description": f"High-value workflow (${revenue:,.0f}) requires CFO sign-off.",
            "recommended_escalation_target": _ESCALATION_TARGETS["high_revenue"],
        })
        if recommended_target == "Chief Executive Officer":
            recommended_target = _ESCALATION_TARGETS["high_revenue"]

    # ── Trigger 4: Missing evidence ───────────────────────────────────────
    missing_info = dec.get("missing_information", [])
    evidence_coverage = ref.get("evidence_coverage", 1.0)
    if evidence_coverage < _EVIDENCE_COVERAGE_LOW or len(missing_info) > 3:
        triggers.append("missing_evidence")
        trigger_details.append({
            "trigger": "missing_evidence",
            "value": evidence_coverage,
            "threshold": _EVIDENCE_COVERAGE_LOW,
            "description": (
                f"Evidence coverage ({evidence_coverage:.0%}) is insufficient. "
                f"{len(missing_info)} missing information item(s) identified."
            ),
            "recommended_escalation_target": _ESCALATION_TARGETS["missing_evidence"],
        })

    # ── Trigger 5: High hallucination risk ────────────────────────────────
    hallucination_risk = ref.get("hallucination_risk", 0.0)
    if hallucination_risk >= _HALLUCINATION_RISK_HIGH:
        triggers.append("high_hallucination")
        trigger_details.append({
            "trigger": "high_hallucination",
            "value": hallucination_risk,
            "threshold": _HALLUCINATION_RISK_HIGH,
            "description": f"Hallucination risk ({hallucination_risk:.0%}) exceeds acceptable threshold.",
            "recommended_escalation_target": _ESCALATION_TARGETS["high_hallucination"],
        })

    # ── Trigger 6: Critical findings ──────────────────────────────────────
    critical_findings = ref.get("critical_findings", [])
    if len(critical_findings) >= 2:
        triggers.append("critical_findings")
        trigger_details.append({
            "trigger": "critical_findings",
            "value": len(critical_findings),
            "threshold": 2,
            "description": (
                f"{len(critical_findings)} critical finding(s) detected during reflection audit."
            ),
            "recommended_escalation_target": _ESCALATION_TARGETS["critical_findings"],
        })
        recommended_target = _ESCALATION_TARGETS["critical_findings"]

    # ── Trigger 7: Low governance score ───────────────────────────────────
    governance_score = ref.get("governance_score", 1.0)
    if governance_score < _GOVERNANCE_SCORE_LOW:
        triggers.append("low_governance")
        trigger_details.append({
            "trigger": "low_governance",
            "value": governance_score,
            "threshold": _GOVERNANCE_SCORE_LOW,
            "description": f"Governance score ({governance_score:.0%}) is below policy threshold.",
            "recommended_escalation_target": _ESCALATION_TARGETS["low_governance"],
        })

    # ── Trigger 8: High implementation complexity ─────────────────────────
    complexity = strat.get("implementation_complexity", "Medium")
    if complexity == "High":
        triggers.append("high_complexity")
        trigger_details.append({
            "trigger": "high_complexity",
            "value": complexity,
            "threshold": "High",
            "description": "High implementation complexity requires COO review before committing.",
            "recommended_escalation_target": _ESCALATION_TARGETS["high_complexity"],
        })

    escalation_required = len(triggers) > 0

    # ── Severity classification ───────────────────────────────────────────
    n = len(triggers)
    if n == 0:
        severity = "low"
    elif n <= 2:
        severity = "medium"
    elif n <= 4:
        severity = "high"
    else:
        severity = "critical"

    # ── Build escalation reason ───────────────────────────────────────────
    if triggers:
        trigger_summaries = [d["description"] for d in trigger_details]
        escalation_reason = (
            f"Automatic escalation triggered by {len(triggers)} risk signal(s): "
            + "; ".join(trigger_summaries)
        )
    else:
        escalation_reason = ""

    logger.info(
        f"Escalation evaluation: required={escalation_required}, "
        f"severity={severity}, triggers={triggers}"
    )

    return {
        "escalation_required": escalation_required,
        "escalation_reason": escalation_reason,
        "escalated_to": recommended_target if escalation_required else "",
        "triggers": triggers,
        "trigger_details": trigger_details,
        "severity": severity,
    }
