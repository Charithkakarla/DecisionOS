"""
Approval Repository — Sprint 8.

Defines SQLAlchemy ORM models and async DB operations for:
  - approval_requests
  - approval_history
  - review_feedback
  - learning_queue
  - workflow_reports
  - audit_events

All tables are linked via workflow_id (string), execution_id (string),
and artifact_id (UUID string) for cross-artifact traceability.
"""

from __future__ import annotations

import uuid
import datetime
import logging
from typing import Any

from sqlalchemy import (
    Column,
    String,
    Float,
    Boolean,
    DateTime,
    Integer,
    JSON,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.knowledge.repository import Base

logger = logging.getLogger("decision_os.approval.repository")


# ── ORM Models ────────────────────────────────────────────────────────────────

class DBApprovalRequest(Base):
    """
    Stores the full ApprovalArtifact payload for each approval action.
    One record per approval decision. Keyed by artifact_id.
    """

    __tablename__ = "approval_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String, nullable=False, index=True)
    execution_id = Column(String, nullable=False)
    artifact_id = Column(String, nullable=False, unique=True, index=True)
    approval_status = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    review_timestamp = Column(String, nullable=True)
    business_owner = Column(String, nullable=True)
    department = Column(String, nullable=True)
    approval_confidence = Column(Float, default=0.0)
    escalation_required = Column(Boolean, default=False)
    escalated_to = Column(String, nullable=True)
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DBApprovalHistory(Base):
    """
    Immutable audit log of every approval state transition.
    Multiple records per workflow_id represent the full approval timeline.
    """

    __tablename__ = "approval_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String, nullable=False, index=True)
    execution_id = Column(String, nullable=False)
    artifact_id = Column(String, nullable=False)
    approval_status = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DBReviewFeedback(Base):
    """
    Structured feedback items collected during a human review.
    Each record maps to one feedback record from the review.
    """

    __tablename__ = "review_feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String, nullable=False, index=True)
    execution_id = Column(String, nullable=False)
    artifact_id = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    approval_status = Column(String, nullable=True)
    feedback_items = Column(JSON, nullable=False)  # list of classified feedback items
    total_feedback_items = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DBLearningQueue(Base):
    """
    Learning queue entries generated after an approval decision.
    Consumed by the Learning Agent in Sprint 9.
    """

    __tablename__ = "learning_queue"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    queue_id = Column(String, nullable=False, unique=True, index=True)
    workflow_id = Column(String, nullable=False, index=True)
    execution_id = Column(String, nullable=False)
    approval_artifact_id = Column(String, nullable=False)
    approval_status = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    signal_type = Column(String, nullable=False)  # positive_reinforcement, corrective_reinforcement, etc.
    priority = Column(String, default="high")
    consumed = Column(Boolean, default=False)
    consumed_at = Column(DateTime, nullable=True)
    consumer_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DBWorkflowReport(Base):
    """
    Persisted workflow report snapshots linked to completed workflow runs.
    Stores the JSON serialisation of WorkflowReport for historical access.
    """

    __tablename__ = "workflow_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String, nullable=False, unique=True, index=True)
    execution_id = Column(String, nullable=False)
    report_payload = Column(JSON, nullable=False)
    overall_trust_score = Column(Float, default=0.0)
    governance_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DBAuditEvent(Base):
    """
    Immutable audit events for the approval governance layer.
    Every human action and system event is recorded here.
    """

    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, nullable=False, unique=True, index=True)
    workflow_id = Column(String, nullable=False, index=True)
    execution_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    artifact_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── DB Operations ─────────────────────────────────────────────────────────────

async def save_approval_request(
    session: AsyncSession,
    artifact_id: str,
    workflow_id: str,
    execution_id: str,
    payload: dict[str, Any],
) -> DBApprovalRequest:
    """Insert or replace the approval request record."""
    record = DBApprovalRequest(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        execution_id=execution_id,
        artifact_id=artifact_id,
        approval_status=payload.get("approval_status", "pending"),
        reviewer=payload.get("reviewer", ""),
        review_timestamp=payload.get("review_timestamp", ""),
        business_owner=payload.get("business_owner", ""),
        department=payload.get("department", ""),
        approval_confidence=payload.get("approval_confidence", 0.0),
        escalation_required=payload.get("escalation_required", False),
        escalated_to=payload.get("escalated_to", ""),
        payload=payload,
    )
    session.add(record)
    await session.commit()
    return record


async def save_approval_history(
    session: AsyncSession,
    workflow_id: str,
    execution_id: str,
    artifact_id: str,
    approval_status: str,
    reviewer: str,
    details: dict[str, Any],
) -> DBApprovalHistory:
    """Append an approval history record (immutable audit log)."""
    record = DBApprovalHistory(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        execution_id=execution_id,
        artifact_id=artifact_id,
        approval_status=approval_status,
        reviewer=reviewer,
        details=details,
    )
    session.add(record)
    await session.commit()
    return record


async def save_review_feedback(
    session: AsyncSession,
    workflow_id: str,
    execution_id: str,
    artifact_id: str,
    feedback_record: dict[str, Any],
) -> DBReviewFeedback:
    """Store the structured feedback record from a human review."""
    record = DBReviewFeedback(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        execution_id=execution_id,
        artifact_id=artifact_id,
        reviewer=feedback_record.get("reviewer", ""),
        approval_status=feedback_record.get("approval_status", ""),
        feedback_items=feedback_record.get("feedback_items", []),
        total_feedback_items=feedback_record.get("total_feedback_items", 0),
    )
    session.add(record)
    await session.commit()
    return record


async def save_learning_queue(
    session: AsyncSession,
    queue_id: str,
    workflow_id: str,
    execution_id: str,
    artifact_id: str,
    approval_status: str,
    reviewer: str,
) -> DBLearningQueue:
    """Queue a learning record for Sprint 9 consumption."""
    from app.agents.approval.queue import _SIGNAL_TYPE, _SIGNAL_PRIORITY

    record = DBLearningQueue(
        id=str(uuid.uuid4()),
        queue_id=queue_id,
        workflow_id=workflow_id,
        execution_id=execution_id,
        approval_artifact_id=artifact_id,
        approval_status=approval_status,
        reviewer=reviewer,
        signal_type=_SIGNAL_TYPE.get(approval_status.lower(), "neutral"),
        priority=_SIGNAL_PRIORITY.get(approval_status.lower(), "low"),
        consumed=False,
    )
    session.add(record)
    await session.commit()
    return record


async def save_audit_event(
    session: AsyncSession,
    event_id: str,
    workflow_id: str,
    execution_id: str,
    event_type: str,
    actor: str,
    artifact_id: str,
    details: dict[str, Any],
) -> DBAuditEvent:
    """Write an immutable audit event to the audit_events table."""
    record = DBAuditEvent(
        id=str(uuid.uuid4()),
        event_id=event_id,
        workflow_id=workflow_id,
        execution_id=execution_id,
        event_type=event_type,
        actor=actor,
        artifact_id=artifact_id,
        details=details,
    )
    session.add(record)
    await session.commit()
    return record


async def get_approval_history(
    session: AsyncSession,
    workflow_id: str,
) -> list[DBApprovalHistory]:
    """Retrieve all approval history records for a workflow."""
    result = await session.execute(
        select(DBApprovalHistory)
        .where(DBApprovalHistory.workflow_id == workflow_id)
        .order_by(DBApprovalHistory.created_at.asc())
    )
    return list(result.scalars().all())


async def get_audit_events(
    session: AsyncSession,
    workflow_id: str,
) -> list[DBAuditEvent]:
    """Retrieve all audit events for a workflow ordered chronologically."""
    result = await session.execute(
        select(DBAuditEvent)
        .where(DBAuditEvent.workflow_id == workflow_id)
        .order_by(DBAuditEvent.created_at.asc())
    )
    return list(result.scalars().all())


async def get_latest_approval_request(
    session: AsyncSession,
    workflow_id: str,
) -> DBApprovalRequest | None:
    """Return the most recent approval request for a workflow."""
    result = await session.execute(
        select(DBApprovalRequest)
        .where(DBApprovalRequest.workflow_id == workflow_id)
        .order_by(DBApprovalRequest.created_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def get_pending_learning_queue(
    session: AsyncSession,
    limit: int = 50,
) -> list[DBLearningQueue]:
    """Return unconsumed learning queue entries ordered by priority and creation time."""
    result = await session.execute(
        select(DBLearningQueue)
        .where(DBLearningQueue.consumed == False)  # noqa: E712
        .order_by(DBLearningQueue.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())
