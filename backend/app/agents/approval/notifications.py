"""
Notification Interfaces — Sprint 8.

Defines the notification interface types and dispatch logic for the
approval governance layer.

Notification types:
  - APPROVAL_REQUIRED   — a workflow is waiting for human review
  - ESCALATION_REQUIRED — a workflow has been escalated to an executive
  - WORKFLOW_COMPLETED  — a workflow has been approved and is ready for execution
  - LEARNING_READY      — feedback has been queued for the Learning Agent

IMPORTANT: Email, Slack, and webhook delivery are NOT implemented in Sprint 8.
           These are interface contracts prepared for Sprint 9 / production.
           The MockApprovalProvider handles all dispatch as log-only stubs.
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any

from app.agents.approval.providers.mock import MockApprovalProvider

logger = logging.getLogger("decision_os.approval.notifications")


# ── Notification Type Enum ────────────────────────────────────────────────────

class NotificationType(str, Enum):
    APPROVAL_REQUIRED = "approval_required"
    ESCALATION_REQUIRED = "escalation_required"
    WORKFLOW_COMPLETED = "workflow_completed"
    LEARNING_READY = "learning_ready"


# ── Notification Dispatcher ───────────────────────────────────────────────────

_provider = MockApprovalProvider()


async def dispatch_notification(
    notification_type: NotificationType,
    workflow_id: str,
    recipient: str,
    details: dict[str, Any] | None = None,
) -> bool:
    """
    Dispatch a governance notification via the configured provider.

    Currently all notifications are routed to MockApprovalProvider (log-only).
    Swap the provider implementation for production email/Slack dispatch.

    Args:
        notification_type: One of the NotificationType enum values.
        workflow_id: ID of the relevant workflow.
        recipient: The target recipient name, role, or email address.
        details: Optional additional context for the notification payload.

    Returns:
        True if dispatch succeeded.
    """
    payload: dict[str, Any] = {
        "workflow_id": workflow_id,
        "recipient": recipient,
        "notification_type": notification_type.value,
        **(details or {}),
    }

    logger.info(
        f"Dispatching notification '{notification_type.value}' "
        f"for workflow '{workflow_id}' to '{recipient}'."
    )

    return await _provider.notify(event_type=notification_type.value, payload=payload)


async def notify_approval_required(workflow_id: str, reviewer: str) -> bool:
    """Notify the designated reviewer that a workflow requires human approval."""
    return await dispatch_notification(
        notification_type=NotificationType.APPROVAL_REQUIRED,
        workflow_id=workflow_id,
        recipient=reviewer,
        details={"message": f"Workflow {workflow_id} is pending your approval review."},
    )


async def notify_escalation_required(
    workflow_id: str,
    escalated_to: str,
    escalation_reason: str,
) -> bool:
    """Notify the executive reviewer that a workflow has been escalated."""
    return await dispatch_notification(
        notification_type=NotificationType.ESCALATION_REQUIRED,
        workflow_id=workflow_id,
        recipient=escalated_to,
        details={
            "escalation_reason": escalation_reason,
            "message": (
                f"Workflow {workflow_id} requires your executive review. "
                f"Reason: {escalation_reason}"
            ),
        },
    )


async def notify_workflow_completed(
    workflow_id: str,
    reviewer: str,
    approval_status: str,
    business_owner: str,
) -> bool:
    """Notify stakeholders that a workflow has reached a terminal approval state."""
    return await dispatch_notification(
        notification_type=NotificationType.WORKFLOW_COMPLETED,
        workflow_id=workflow_id,
        recipient=business_owner or reviewer,
        details={
            "approval_status": approval_status,
            "reviewer": reviewer,
            "message": (
                f"Workflow {workflow_id} has been {approval_status} by {reviewer}."
            ),
        },
    )


async def notify_learning_ready(
    workflow_id: str,
    queue_id: str,
    signal_type: str,
) -> bool:
    """Notify that a new learning queue entry is ready for Sprint 9 consumption."""
    return await dispatch_notification(
        notification_type=NotificationType.LEARNING_READY,
        workflow_id=workflow_id,
        recipient="learning_agent",
        details={
            "queue_id": queue_id,
            "signal_type": signal_type,
            "message": (
                f"Learning queue entry {queue_id} is ready for consumption "
                f"(signal: {signal_type})."
            ),
        },
    )
