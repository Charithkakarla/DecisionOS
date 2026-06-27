"""
Audit Engine — Sprint 8.

Responsible for:
  - Building structured audit event records
  - Maintaining the approval audit trail for a workflow
  - Generating the complete audit history timeline
  - Recording every human action as an immutable event

All audit events are structured for both DB persistence (audit_events table)
and in-memory retrieval via the approval history API.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from app.agents.approval.schemas import AuditHistoryEntry

logger = logging.getLogger("decision_os.approval.audit")


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_audit_event(
    workflow_id: str,
    execution_id: str,
    event_type: str,
    actor: str,
    details: dict[str, Any],
    artifact_id: str = "",
) -> AuditHistoryEntry:
    """
    Create a single immutable audit event record.

    Args:
        workflow_id: Workflow being audited.
        execution_id: Execution run ID.
        event_type: Human-readable event type string.
        actor: The agent or human reviewer that triggered this event.
        details: Arbitrary key-value metadata for the event.
        artifact_id: Optional artifact produced by this event.

    Returns:
        AuditHistoryEntry pydantic model.
    """
    return AuditHistoryEntry(
        event_id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        execution_id=execution_id,
        event_type=event_type,
        actor=actor,
        timestamp=_now_iso(),
        details=details,
        artifact_id=artifact_id,
    )


def build_pipeline_audit_trail(
    state_snapshot: dict[str, Any],
) -> list[AuditHistoryEntry]:
    """
    Reconstruct the full pipeline audit trail from workflow_events in the
    state snapshot. Translates WorkflowEvent records into AuditHistoryEntry
    objects for the history API.

    Args:
        state_snapshot: Serialised WorkflowState dict.

    Returns:
        List of AuditHistoryEntry objects ordered chronologically.
    """
    workflow_id = state_snapshot.get("workflow_id", "")
    execution_id = state_snapshot.get("execution_id", "")
    events = state_snapshot.get("workflow_events", [])
    history: list[AuditHistoryEntry] = []

    for ev in events:
        if not isinstance(ev, dict):
            continue
        history.append(
            AuditHistoryEntry(
                event_id=str(uuid.uuid4()),
                workflow_id=workflow_id,
                execution_id=execution_id,
                event_type=ev.get("event_type", "Unknown"),
                actor=ev.get("agent", "system"),
                timestamp=ev.get("timestamp", _now_iso()),
                artifact_id=ev.get("artifact_produced", ""),
                details={
                    "status": ev.get("status", ""),
                    "confidence": ev.get("confidence", 0.0),
                    "provider": ev.get("provider", ""),
                    "duration_ms": ev.get("duration_ms", 0),
                },
            )
        )

    return history


def build_agent_timeline(
    state_snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Build a richer visual timeline suitable for the Audit Timeline frontend
    component. Includes per-agent metadata (latency, confidence, artifact type,
    reviewer, duration).

    Returns:
        List of timeline step dicts ordered by pipeline position.
    """
    workflow_id = state_snapshot.get("workflow_id", "")
    agent_metadata = state_snapshot.get("agent_metadata", {})

    pipeline_steps = [
        ("context", "Context Intelligence"),
        ("knowledge", "Knowledge Intelligence"),
        ("decision", "Decision Intelligence"),
        ("strategy", "Strategy Intelligence"),
        ("reflection", "Reflection & Governance"),
    ]

    timeline: list[dict[str, Any]] = [
        {
            "step": 0,
            "agent": "planner",
            "label": "Workflow Started",
            "timestamp": state_snapshot.get("workflow_events", [{}])[0].get(
                "timestamp", _now_iso()
            ) if state_snapshot.get("workflow_events") else _now_iso(),
            "status": "completed",
            "artifact_type": "WorkflowExecution",
            "confidence": 1.0,
            "provider": "PlannerService",
            "duration_ms": 0,
            "reviewer": None,
        }
    ]

    for i, (key, label) in enumerate(pipeline_steps, start=1):
        artifact_key = f"{key}_artifact"
        artifact = state_snapshot.get(artifact_key)
        meta = agent_metadata.get(key, {})
        if isinstance(meta, dict):
            latency = meta.get("latency_ms", 0)
            provider = meta.get("provider", "")
            status = meta.get("status", "completed" if artifact else "pending")
        else:
            latency = 0
            provider = ""
            status = "completed" if artifact else "pending"

        timeline.append({
            "step": i,
            "agent": key,
            "label": label,
            "timestamp": artifact.get("created_at", "") if isinstance(artifact, dict) else "",
            "status": status,
            "artifact_type": f"{key.capitalize()}Artifact",
            "confidence": (
                artifact.get("confidence", 0.0) if isinstance(artifact, dict) else 0.0
            ),
            "provider": provider,
            "duration_ms": latency,
            "reviewer": None,
        })

    return timeline


def build_approval_audit_event(
    workflow_id: str,
    execution_id: str,
    reviewer: str,
    approval_status: str,
    artifact_id: str,
    details: dict[str, Any],
) -> AuditHistoryEntry:
    """
    Build the approval-specific audit event that marks the human governance action.
    """
    event_type_map = {
        "approved": "ApprovalGranted",
        "modified": "ApprovalModified",
        "escalated": "ApprovalEscalated",
        "rejected": "ApprovalRejected",
        "pending": "ApprovalPending",
    }
    event_type = event_type_map.get(approval_status.lower(), "ApprovalAction")
    return build_audit_event(
        workflow_id=workflow_id,
        execution_id=execution_id,
        event_type=event_type,
        actor=reviewer,
        details=details,
        artifact_id=artifact_id,
    )
