"""
Governance Engine — Sprint 8.

Evaluates whether an approval decision is compliant with enterprise governance policies.
Checks:
  - Approval policies (minimum required approval confidence)
  - Required reviewers (executive roles for high-value workflows)
  - Mandatory comment quality
  - Department-level policies
  - Escalation rules based on risk signals
  - Overall governance compliance score

Returns a structured governance validation result.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("decision_os.approval.governance")

# ── Policy Thresholds ────────────────────────────────────────────────────────

# Minimum approval confidence accepted before a warning is raised
_MIN_APPROVAL_CONFIDENCE = 0.6

# Revenue above which a second reviewer is recommended
_HIGH_REVENUE_THRESHOLD = 100_000.0

# Trust score below which executive review is recommended
_LOW_TRUST_ESCALATION_THRESHOLD = 0.5

# Hallucination risk above which governance flags the approval
_HALLUCINATION_RISK_THRESHOLD = 0.4

# Governance score below which approval is flagged as non-compliant
_MIN_GOVERNANCE_SCORE = 0.5

# Departments that require an explicit business_owner field
_OWNER_REQUIRED_DEPARTMENTS = {"finance", "legal", "compliance", "executive", "security"}

# Roles considered sufficient for high-value approvals
_EXECUTIVE_ROLES = {"cfo", "ceo", "coo", "board", "vp", "director", "executive"}


def _is_executive_reviewer(reviewer: str) -> bool:
    """Check whether the reviewer name/role contains an executive keyword."""
    lower = reviewer.lower()
    return any(role in lower for role in _EXECUTIVE_ROLES)


def run_governance_checks(
    reviewer: str,
    business_owner: str,
    department: str,
    approval_confidence: float,
    approval_comments: str,
    state_snapshot: dict[str, Any],
    target_status: str,
) -> dict[str, Any]:
    """
    Run all governance checks and return a structured compliance report.

    Args:
        reviewer: Reviewer name or ID.
        business_owner: Declared business owner of the workflow.
        department: Department associated with the workflow.
        approval_confidence: Reviewer's stated confidence (0–1).
        approval_comments: Free-text comments from the reviewer.
        state_snapshot: Serialised WorkflowState dict.
        target_status: The approval action being taken (approved/modified/escalated/rejected).

    Returns:
        dict with:
          compliant (bool),
          governance_score (float, 0–1),
          violations (list[str]),
          warnings (list[str]),
          recommendations (list[str]),
          requires_executive_review (bool)
    """
    violations: list[str] = []
    warnings: list[str] = []
    recommendations: list[str] = []
    score_penalties = 0.0
    requires_executive_review = False

    # ── 1. Reviewer identity ──────────────────────────────────────────────
    if not reviewer or not reviewer.strip():
        violations.append("GOV-001: Reviewer identity is required for all approval actions.")
        score_penalties += 0.25

    # ── 2. Business owner ────────────────────────────────────────────────
    dept_lower = department.lower() if department else ""
    if dept_lower in _OWNER_REQUIRED_DEPARTMENTS and not business_owner:
        violations.append(
            f"GOV-002: Department '{department}' requires an explicit business owner."
        )
        score_penalties += 0.15

    # ── 3. Approval confidence ───────────────────────────────────────────
    if approval_confidence < _MIN_APPROVAL_CONFIDENCE:
        warnings.append(
            f"GOV-003: Approval confidence ({approval_confidence:.0%}) is below the "
            f"recommended minimum ({_MIN_APPROVAL_CONFIDENCE:.0%})."
        )
        score_penalties += 0.10

    # ── 4. Mandatory comment quality ─────────────────────────────────────
    if len(approval_comments.strip()) < 20:
        violations.append(
            "GOV-004: Approval comments are insufficient. "
            "A minimum of 20 characters is required for audit compliance."
        )
        score_penalties += 0.10

    # ── 5. Trust score check ─────────────────────────────────────────────
    reflection = state_snapshot.get("reflection_artifact")
    trust_score = 0.0
    gov_score = 0.0
    hallucination_risk = 0.0
    estimated_revenue = 0.0

    if reflection:
        payload = reflection.get("payload", {})
        trust_score = payload.get("overall_trust_score", 0.0)
        gov_score = payload.get("governance_score", 0.0)
        hallucination_risk = payload.get("hallucination_risk", 0.0)

    if trust_score < _LOW_TRUST_ESCALATION_THRESHOLD and target_status == "approved":
        warnings.append(
            f"GOV-005: Low trust score ({trust_score:.0%}) detected. "
            "Direct approval without escalation is not recommended."
        )
        requires_executive_review = True
        score_penalties += 0.10

    # ── 6. Governance score check ─────────────────────────────────────────
    if gov_score < _MIN_GOVERNANCE_SCORE:
        violations.append(
            f"GOV-006: Workflow governance score ({gov_score:.0%}) is below the "
            f"minimum policy threshold ({_MIN_GOVERNANCE_SCORE:.0%})."
        )
        score_penalties += 0.15

    # ── 7. Hallucination risk ─────────────────────────────────────────────
    if hallucination_risk > _HALLUCINATION_RISK_THRESHOLD:
        warnings.append(
            f"GOV-007: Elevated hallucination risk ({hallucination_risk:.0%}) detected. "
            "Review all AI-generated recommendations before approving."
        )
        if target_status == "approved":
            requires_executive_review = True
        score_penalties += 0.10

    # ── 8. Revenue-based executive review requirement ────────────────────
    decision = state_snapshot.get("decision_artifact")
    if decision:
        dec_payload = decision.get("payload", {})
        analysis = dec_payload.get("analysis", {})
        estimated_revenue = (
            analysis.get("estimated_revenue", 0.0)
            if isinstance(analysis, dict)
            else dec_payload.get("estimated_revenue", 0.0)
        )

    if estimated_revenue > _HIGH_REVENUE_THRESHOLD and not _is_executive_reviewer(reviewer):
        warnings.append(
            f"GOV-008: High-revenue workflow (estimated ${estimated_revenue:,.0f}) "
            "should be reviewed by an executive-level reviewer."
        )
        requires_executive_review = True
        score_penalties += 0.05

    # ── 9. Department-level policy check ─────────────────────────────────
    if dept_lower in _OWNER_REQUIRED_DEPARTMENTS and not _is_executive_reviewer(reviewer):
        recommendations.append(
            f"GOV-009: Workflows in the '{department}' department benefit from "
            "executive sign-off. Consider escalation."
        )

    # ── Calculate governance compliance score ─────────────────────────────
    governance_compliance_score = max(0.0, round(1.0 - score_penalties, 4))
    compliant = len(violations) == 0

    if not compliant:
        logger.warning(
            f"Governance violations detected for reviewer '{reviewer}': {violations}"
        )

    return {
        "compliant": compliant,
        "governance_score": governance_compliance_score,
        "violations": violations,
        "warnings": warnings,
        "recommendations": recommendations,
        "requires_executive_review": requires_executive_review,
        "trust_score_at_review": trust_score,
        "governance_score_at_review": gov_score,
        "hallucination_risk_at_review": hallucination_risk,
        "estimated_revenue": estimated_revenue,
    }
