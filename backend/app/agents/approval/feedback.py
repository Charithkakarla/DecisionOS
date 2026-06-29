"""
Feedback Engine — Sprint 8.

Captures and structures human feedback from the approval review.
Feedback includes:
  - Human edits to AI recommendations
  - Business corrections to strategy / decision output
  - Additional context notes
  - Missing information flags
  - Rejected recommendations
  - Suggested improvements

Feedback is persisted in the review_feedback table and attached to
the ApprovalArtifact for consumption by the Learning Agent (Sprint 9).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.agents.approval.schemas import FeedbackItem

logger = logging.getLogger("decision_os.approval.feedback")


def build_feedback_record(
    workflow_id: str,
    execution_id: str,
    artifact_id: str,
    reviewer: str,
    approval_status: str,
    feedback_items: list[FeedbackItem],
    modified_sections: list[dict[str, Any]] | None = None,
    approval_comments: str = "",
) -> dict[str, Any]:
    """
    Assemble a structured feedback record ready for database persistence and
    Learning Queue population.

    Args:
        workflow_id: ID of the workflow being reviewed.
        execution_id: Execution run ID.
        artifact_id: The generated ApprovalArtifact ID.
        reviewer: Reviewer name/ID.
        approval_status: The final approval status string.
        feedback_items: Structured FeedbackItem list from the reviewer.
        modified_sections: List of before/after section diffs (for MODIFIED status).
        approval_comments: The primary comment from the reviewer.

    Returns:
        A structured dict suitable for DB insert and Learning Queue entry.
    """
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    record_id = str(uuid.uuid4())

    # Derive a category for each feedback item for learning signal classification
    classified_items = []
    for item in feedback_items:
        classified_items.append({
            "feedback_id": str(uuid.uuid4()),
            "section": item.section,
            "original_value": item.original_value,
            "corrected_value": item.corrected_value,
            "comment": item.comment,
            "feedback_type": item.feedback_type,
            "learning_signal": _derive_learning_signal(item),
        })

    # Convert modified_sections to feedback items as well
    if modified_sections:
        for mod in modified_sections:
            classified_items.append({
                "feedback_id": str(uuid.uuid4()),
                "section": mod.get("section", ""),
                "original_value": mod.get("before", ""),
                "corrected_value": mod.get("after", ""),
                "comment": mod.get("change_reason", ""),
                "feedback_type": "correction",
                "learning_signal": "human_override",
            })

    # Primary comment as a generic note feedback item
    if approval_comments and approval_comments.strip():
        classified_items.append({
            "feedback_id": str(uuid.uuid4()),
            "section": "general",
            "original_value": "",
            "corrected_value": "",
            "comment": approval_comments.strip(),
            "feedback_type": "note",
            "learning_signal": _derive_signal_from_status(approval_status),
        })

    return {
        "record_id": record_id,
        "workflow_id": workflow_id,
        "execution_id": execution_id,
        "artifact_id": artifact_id,
        "reviewer": reviewer,
        "approval_status": approval_status,
        "feedback_items": classified_items,
        "total_feedback_items": len(classified_items),
        "recorded_at": now,
        "schema_version": "1.0.0",
    }


def _derive_learning_signal(item: FeedbackItem) -> str:
    """
    Map a FeedbackItem to a learning signal category for the Learning Agent.

    Categories:
      human_override    — reviewer changed an AI recommendation
      missing_data      — reviewer flagged missing information
      quality_issue     — reviewer flagged a quality or accuracy problem
      positive_signal   — reviewer confirmed or reinforced an AI output
      note              — generic informational note
    """
    ft = item.feedback_type.lower()
    section = item.section.lower()

    if ft == "correction":
        return "human_override"
    if ft == "addition":
        if "missing" in section or "evidence" in section:
            return "missing_data"
        return "positive_signal"
    if ft == "deletion":
        return "quality_issue"
    if ft == "note":
        return "note"

    # Fallback heuristic based on section name
    if any(k in section for k in ("hallucination", "risk", "critical", "warning")):
        return "quality_issue"
    if any(k in section for k in ("strategy", "recommendation", "decision")):
        return "human_override"
    return "note"


def _derive_signal_from_status(approval_status: str) -> str:
    """Map the approval status to a top-level learning signal."""
    mapping = {
        "approved": "positive_signal",
        "modified": "human_override",
        "escalated": "quality_issue",
        "rejected": "quality_issue",
        "pending": "note",
    }
    return mapping.get(approval_status.lower(), "note")


def extract_rejected_recommendations(state_snapshot: dict[str, Any]) -> list[str]:
    """
    Extract recommendation titles from the decision artifact.
    When an approval is rejected these are flagged as rejected recommendations
    in the feedback record for the learning system.
    """
    decision = state_snapshot.get("decision_artifact")
    if not decision:
        return []
    payload = decision.get("payload", {})
    recs = payload.get("recommendations", [])
    return [r.get("title", "") for r in recs if isinstance(r, dict)]


def extract_missing_information(state_snapshot: dict[str, Any]) -> list[str]:
    """
    Extract missing information items from the decision artifact for
    inclusion in the feedback record.
    """
    decision = state_snapshot.get("decision_artifact")
    if not decision:
        return []
    payload = decision.get("payload", {})
    return payload.get("missing_information", [])
