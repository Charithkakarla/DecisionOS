"""
Abstract base provider for the Approval Agent.

The approval layer is primarily human-driven, but a provider interface is defined
here to support future notification dispatch and AI-assisted review summary
generation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class ApprovalProvider(ABC):
    """
    Base provider for the Approval Agent.

    Concrete implementations may send notifications, generate AI summaries,
    or integrate with external governance platforms.
    """

    @abstractmethod
    async def notify(self, event_type: str, payload: dict[str, Any]) -> bool:
        """
        Dispatch a notification for an approval-layer event.

        Args:
            event_type: One of: approval_required, escalation_required,
                        workflow_completed, learning_ready.
            payload: Notification context dict.

        Returns:
            True if the notification was dispatched successfully.
        """

    @abstractmethod
    async def generate_review_summary(
        self,
        state_snapshot: dict[str, Any],
        reviewer: str,
    ) -> str:
        """
        Generate a concise executive review summary for the reviewer.

        Args:
            state_snapshot: Serialised WorkflowState dict.
            reviewer: Name/ID of the reviewer who will receive the summary.

        Returns:
            A formatted text summary string.
        """
