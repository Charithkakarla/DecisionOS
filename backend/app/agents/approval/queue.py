"""
Learning Queue — Sprint 8.

Queues approved feedback records for consumption by the Learning Agent (Sprint 9).
Only APPROVED and MODIFIED workflows generate learning queue entries.
REJECTED workflows generate negative learning signals but are still queued.
ESCALATED workflows are queued as pending human resolution.

This module does NOT implement the Learning Agent. It only creates structured
LearningQueue records and optionally persists them to Redis for Sprint 9.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

logger = logging.getLogger("decision_os.approval.queue")

# ── Learning queue Redis key namespace ───────────────────────────────────────
_QUEUE_KEY_PREFIX = "learning:queue:"
_QUEUE_LIST_KEY = "learning:queue:pending"

# ── Learning signal priority by approval status ───────────────────────────────
_SIGNAL_PRIORITY: dict[str, str] = {
    "approved": "high",
    "modified": "high",
    "escalated": "medium",
    "rejected": "low",
}

# ── Learning signal type by approval status ───────────────────────────────────
_SIGNAL_TYPE: dict[str, str] = {
    "approved": "positive_reinforcement",
    "modified": "corrective_reinforcement",
    "escalated": "deferred_review",
    "rejected": "negative_reinforcement",
}


def build_learning_queue_entry(
    workflow_id: str,
    execution_id: str,
    approval_artifact_id: str,
    approval_status: str,
    reviewer: str,
    feedback_record: dict[str, Any],
    state_snapshot: dict[str, Any],
) -> dict[str, Any]:
    """
    Build a structured LearningQueue record from the approved feedback.

    Args:
        workflow_id: Workflow being approved.
        execution_id: Execution run ID.
        approval_artifact_id: The persisted ApprovalArtifact ID.
        approval_status: Final approval status.
        reviewer: Reviewer name/ID.
        feedback_record: Output from feedback.build_feedback_record().
        state_snapshot: Serialised WorkflowState dict.

    Returns:
        LearningQueue entry dict ready for DB and Redis persistence.
    """
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    queue_id = str(uuid.uuid4())

    signal_type = _SIGNAL_TYPE.get(approval_status.lower(), "neutral")
    priority = _SIGNAL_PRIORITY.get(approval_status.lower(), "low")

    # Extract reflection scores as learning context
    reflection = state_snapshot.get("reflection_artifact")
    reflection_signals: dict[str, Any] = {}
    if reflection and isinstance(reflection, dict):
        payload = reflection.get("payload", {})
        reflection_signals = {
            "trust_score": payload.get("overall_trust_score", 0.0),
            "governance_score": payload.get("governance_score", 0.0),
            "hallucination_risk": payload.get("hallucination_risk", 0.0),
            "evidence_coverage": payload.get("evidence_coverage", 0.0),
            "validation_status": payload.get("validation_status", ""),
        }

    # Extract strategy context as learning reference
    strategy = state_snapshot.get("strategy_artifact")
    strategy_context: dict[str, Any] = {}
    if strategy and isinstance(strategy, dict):
        payload = strategy.get("payload", {})
        strategy_context = {
            "selected_strategy": payload.get("selected_strategy", ""),
            "estimated_roi": payload.get("estimated_roi", 0.0),
            "confidence": payload.get("confidence", 0.0),
            "implementation_timeline": payload.get("implementation_timeline", ""),
        }

    return {
        "queue_id": queue_id,
        "workflow_id": workflow_id,
        "execution_id": execution_id,
        "approval_artifact_id": approval_artifact_id,
        "approval_status": approval_status,
        "reviewer": reviewer,
        "signal_type": signal_type,
        "priority": priority,
        "feedback_record": feedback_record,
        "reflection_signals": reflection_signals,
        "strategy_context": strategy_context,
        "feedback_item_count": feedback_record.get("total_feedback_items", 0),
        "created_at": now,
        "consumed": False,
        "consumed_at": None,
        "consumer_agent": None,
        "schema_version": "1.0.0",
    }


def enqueue_learning_record(queue_entry: dict[str, Any]) -> bool:
    """
    Attempt to push the LearningQueue entry into Redis for Sprint 9 consumption.

    Uses a Redis list (`learning:queue:pending`) as a simple FIFO queue.
    Also stores the full record under a key-value entry for direct lookup.

    Falls back gracefully if Redis is unavailable.

    Args:
        queue_entry: Dict produced by build_learning_queue_entry().

    Returns:
        True if successfully enqueued, False otherwise.
    """
    try:
        import redis as redis_lib

        r = redis_lib.Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_timeout=1.0,
            socket_connect_timeout=1.0,
        )
        r.ping()

        queue_id = queue_entry["queue_id"]
        record_key = f"{_QUEUE_KEY_PREFIX}{queue_id}"

        # Store full record
        r.setex(record_key, 86400 * 7, json.dumps(queue_entry))  # 7-day TTL

        # Push to the pending list
        r.lpush(_QUEUE_LIST_KEY, queue_id)

        logger.info(
            f"Learning queue entry {queue_id} enqueued for workflow {queue_entry['workflow_id']}."
        )
        return True

    except Exception as exc:
        logger.warning(
            f"Learning queue Redis enqueue failed (will be recovered from DB): {exc}"
        )
        return False


def should_queue_for_learning(approval_status: str) -> bool:
    """
    Only APPROVED and MODIFIED (primary) and REJECTED (negative signal)
    are eligible for learning queue population.
    PENDING has not completed and should not be queued.
    """
    return approval_status.lower() in {"approved", "modified", "rejected", "escalated"}
