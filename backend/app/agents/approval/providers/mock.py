"""
Mock Approval Provider — Sprint 8.

Implements the ApprovalProvider interface with no external dependencies.
Used in development, testing, and when no notification backend is configured.

Notification interface stubs are included but do NOT send real emails/webhooks.
These interfaces are prepared for Sprint 9 / production integration.
"""

from __future__ import annotations

import logging
from typing import Any

from app.agents.approval.providers.base import ApprovalProvider

logger = logging.getLogger("decision_os.approval.providers.mock")

# ── Notification type interfaces (prepared for Sprint 9) ─────────────────────
# These represent the notification events the system will dispatch.
# Concrete implementations (email, Slack, webhook) will be added in a future sprint.

NOTIFICATION_TYPES = {
    "approval_required": "Notify reviewer that a workflow requires human approval.",
    "escalation_required": "Notify executive that a workflow has been escalated.",
    "workflow_completed": "Notify stakeholders that the workflow has been approved and completed.",
    "learning_ready": "Notify Learning Agent that a new feedback record is queued.",
}


class MockApprovalProvider(ApprovalProvider):
    """
    Mock provider that logs notification events without dispatching them.
    Provides realistic review summaries from workflow state data.
    """

    async def notify(self, event_type: str, payload: dict[str, Any]) -> bool:
        """
        Log the notification event. Does NOT send external messages.
        Interface is prepared for email/Slack/webhook in a future sprint.
        """
        description = NOTIFICATION_TYPES.get(event_type, "Unknown notification type.")
        logger.info(
            f"[MOCK NOTIFICATION] event_type='{event_type}' | {description} | "
            f"workflow_id='{payload.get('workflow_id', 'N/A')}' | "
            f"recipient='{payload.get('recipient', 'N/A')}'"
        )
        return True

    async def generate_review_summary(
        self,
        state_snapshot: dict[str, Any],
        reviewer: str,
    ) -> str:
        """
        Generate a mock executive review summary from workflow state data.
        In production this would call an LLM to produce a tailored summary.
        """
        workflow_id = state_snapshot.get("workflow_id", "N/A")
        reflection = state_snapshot.get("reflection_artifact")
        strategy = state_snapshot.get("strategy_artifact")

        trust_score = 0.0
        governance_score = 0.0
        audit_summary = "No audit data available."
        selected_strategy = "N/A"
        estimated_roi = 0.0

        if reflection and isinstance(reflection, dict):
            payload = reflection.get("payload", {})
            trust_score = payload.get("overall_trust_score", 0.0)
            governance_score = payload.get("governance_score", 0.0)
            audit_summary = payload.get("audit_summary", "")

        if strategy and isinstance(strategy, dict):
            payload = strategy.get("payload", {})
            selected_strategy = payload.get("selected_strategy", "N/A")
            estimated_roi = payload.get("estimated_roi", 0.0)

        summary = (
            f"EXECUTIVE REVIEW SUMMARY\n"
            f"Workflow ID: {workflow_id}\n"
            f"Reviewer: {reviewer}\n"
            f"{'─' * 50}\n"
            f"Selected Strategy: {selected_strategy}\n"
            f"Estimated ROI: {estimated_roi:.1f}x\n"
            f"Overall Trust Score: {trust_score:.0%}\n"
            f"Governance Score: {governance_score:.0%}\n"
            f"Audit Verdict: {audit_summary}\n"
            f"{'─' * 50}\n"
            f"Please review the full Workflow Report before taking an approval action."
        )

        logger.info(
            f"[MOCK REVIEW SUMMARY] Generated summary for reviewer '{reviewer}' "
            f"on workflow '{workflow_id}'."
        )
        return summary
