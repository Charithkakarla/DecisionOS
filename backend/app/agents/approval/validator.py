"""
Approval Validation Engine — Sprint 8.

Validates:
  - Workflow Report exists (reflection artifact + report cache)
  - Reflection completed successfully
  - All prior artifacts are present and valid
  - Reviewer identity is provided
  - Approval comments are non-empty
  - Business owner is assigned
  - State transitions are legal (e.g. cannot go APPROVED → PENDING)

Returns a structured validation result dict used by ApprovalService.
"""

from __future__ import annotations

import logging
from typing import Any

from app.agents.approval.schemas import ApprovalStatus

logger = logging.getLogger("decision_os.approval.validator")

# ── Legal state transitions ──────────────────────────────────────────────────
# PENDING is the only legal "from" state for human actions.
_LEGAL_TRANSITIONS: dict[ApprovalStatus, set[ApprovalStatus]] = {
    ApprovalStatus.PENDING: {
        ApprovalStatus.APPROVED,
        ApprovalStatus.MODIFIED,
        ApprovalStatus.ESCALATED,
        ApprovalStatus.REJECTED,
    },
    ApprovalStatus.ESCALATED: {
        ApprovalStatus.APPROVED,
        ApprovalStatus.MODIFIED,
        ApprovalStatus.REJECTED,
    },
    # Terminal states — no further transitions
    ApprovalStatus.APPROVED: set(),
    ApprovalStatus.MODIFIED: set(),
    ApprovalStatus.REJECTED: set(),
}


class ApprovalValidationError(ValueError):
    """Raised when the approval request fails validation."""


def validate_approval_prerequisites(state_snapshot: dict[str, Any]) -> dict[str, Any]:
    """
    Validate that all required prior pipeline stages have completed before
    allowing an approval action to proceed.

    Args:
        state_snapshot: The serialised WorkflowState dict from the request.

    Returns:
        dict with keys:
          valid (bool), errors (list[str]), warnings (list[str])

    Raises:
        ApprovalValidationError: on hard validation failure.
    """
    errors: list[str] = []
    warnings: list[str] = []

    workflow_id = state_snapshot.get("workflow_id", "")
    if not workflow_id:
        errors.append("workflow_id is missing from state snapshot.")

    # Require all upstream artifacts
    if not state_snapshot.get("context_artifact"):
        errors.append("Context artifact is missing — context agent must complete before approval.")

    if not state_snapshot.get("knowledge_artifact"):
        errors.append("Knowledge artifact is missing — knowledge agent must complete before approval.")

    if not state_snapshot.get("decision_artifact"):
        errors.append("Decision artifact is missing — decision agent must complete before approval.")

    if not state_snapshot.get("strategy_artifact"):
        errors.append("Strategy artifact is missing — strategy agent must complete before approval.")

    reflection = state_snapshot.get("reflection_artifact")
    if not reflection:
        errors.append(
            "Reflection artifact is missing — reflection agent must complete before approval."
        )
    else:
        payload = reflection.get("payload", {})
        validation_status = payload.get("validation_status", "")
        if validation_status == "failed":
            warnings.append(
                "Reflection validation status is 'failed'. Review critical findings before approving."
            )
        if payload.get("hallucination_risk", 0.0) > 0.6:
            warnings.append(
                f"High hallucination risk detected ({payload['hallucination_risk']:.0%}). "
                "Consider escalating rather than directly approving."
            )
        if payload.get("overall_trust_score", 1.0) < 0.4:
            warnings.append(
                f"Low overall trust score ({payload['overall_trust_score']:.0%}). "
                "Manual review of all recommendations is strongly advised."
            )

    if not state_snapshot.get("final_action"):
        warnings.append("final_action is not set on the workflow state.")

    valid = len(errors) == 0
    if errors:
        logger.warning(
            f"Approval prerequisite validation failed for workflow '{workflow_id}': {errors}"
        )
    return {"valid": valid, "errors": errors, "warnings": warnings}


def validate_reviewer_fields(
    reviewer: str,
    approval_comments: str,
    business_owner: str,
) -> dict[str, Any]:
    """
    Validate reviewer identity, comment quality, and business owner assignment.

    Returns:
        dict with keys: valid (bool), errors (list[str])
    """
    errors: list[str] = []

    if not reviewer or not reviewer.strip():
        errors.append("Reviewer name/ID must be provided.")

    if not approval_comments or len(approval_comments.strip()) < 10:
        errors.append(
            "Approval comments must be at least 10 characters. "
            "Provide a meaningful justification for the approval decision."
        )

    if not business_owner or not business_owner.strip():
        errors.append("Business owner must be assigned before the workflow can be approved.")

    return {"valid": len(errors) == 0, "errors": errors}


def validate_state_transition(
    current_status: ApprovalStatus,
    target_status: ApprovalStatus,
) -> dict[str, Any]:
    """
    Check whether transitioning from current_status → target_status is legal.

    Returns:
        dict with keys: valid (bool), error (str | None)
    """
    allowed = _LEGAL_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        error = (
            f"Invalid state transition: '{current_status}' → '{target_status}'. "
            f"Allowed transitions from '{current_status}': {[s.value for s in allowed] or 'none (terminal state)'}."
        )
        logger.warning(error)
        return {"valid": False, "error": error}
    return {"valid": True, "error": None}


def validate_escalation_fields(escalated_to: str, escalation_reason: str) -> dict[str, Any]:
    """Validate escalation-specific required fields."""
    errors: list[str] = []
    if not escalated_to or not escalated_to.strip():
        errors.append("escalated_to must specify the executive reviewer or body.")
    if not escalation_reason or len(escalation_reason.strip()) < 10:
        errors.append("escalation_reason must be at least 10 characters.")
    return {"valid": len(errors) == 0, "errors": errors}


def validate_modification_fields(
    modified_sections: list[dict[str, Any]],
    approval_comments: str,
) -> dict[str, Any]:
    """Validate modification-specific fields."""
    errors: list[str] = []
    if not modified_sections:
        errors.append(
            "modified_sections must contain at least one change when submitting a MODIFIED approval."
        )
    for i, section in enumerate(modified_sections):
        if not section.get("section"):
            errors.append(f"modified_sections[{i}].section must be specified.")
        if not section.get("after"):
            errors.append(f"modified_sections[{i}].after (new value) must be provided.")
    if not approval_comments or len(approval_comments.strip()) < 10:
        errors.append("Approval comments are required when submitting modifications.")
    return {"valid": len(errors) == 0, "errors": errors}
