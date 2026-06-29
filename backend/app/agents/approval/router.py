"""
Approval Router — Sprint 8 Human Approval & Enterprise Governance Layer.

FastAPI router exposing:
  POST /api/v1/approval/submit    — approve a workflow
  POST /api/v1/approval/modify    — approve with modifications
  POST /api/v1/approval/escalate  — escalate to executive reviewer
  POST /api/v1/approval/reject    — reject the workflow
  GET  /api/v1/approval/history/{workflow_id} — full audit history

Each endpoint:
  1. Validates the request
  2. Delegates to ApprovalDecisionService
  3. Returns a structured ApprovalResponse
"""

from __future__ import annotations

import logging
from typing import Dict

from fastapi import APIRouter, HTTPException

from app.schemas.state import WorkflowState
from app.agents.approval.schemas import (
    ApprovalEscalateRequest,
    ApprovalModifyRequest,
    ApprovalRejectRequest,
    ApprovalResponse,
    ApprovalStatus,
    ApprovalSubmitRequest,
    AuditHistoryEntry,
    AuditHistoryResponse,
)
from app.agents.approval.service import ApprovalDecisionService
from app.agents.approval.audit import build_pipeline_audit_trail, build_agent_timeline
from app.core.database import SessionLocal
from app.agents.approval.repository import get_approval_history, get_audit_events

logger = logging.getLogger("decision_os.approval.router")
router = APIRouter(prefix="/api/v1/approval", tags=["approval"])

# In-memory cache shared with reflection router for state retrieval
# The approval router reads states stored by the planner run
_workflow_state_cache: Dict[str, WorkflowState] = {}

# Singleton decision service
_decision_service = ApprovalDecisionService()


def should_execute(state: WorkflowState) -> bool:
    """
    Execute Approval Agent after Reflection Agent completes.
    Approval artifact starts as None and is created in PENDING state.
    """
    return (
        state.reflection_artifact is not None
        and state.approval_artifact is None
    )


def register_workflow_state(workflow_id: str, state: WorkflowState) -> None:
    """
    Allow external modules (planner, reflection router) to register a
    completed WorkflowState so the approval router can access it.
    """
    _workflow_state_cache[workflow_id] = state


def get_cached_state(workflow_id: str) -> WorkflowState | None:
    """Retrieve a cached WorkflowState by workflow_id."""
    return _workflow_state_cache.get(workflow_id)


# ── POST /api/v1/approval/submit ──────────────────────────────────────────────

@router.post("/submit", response_model=ApprovalResponse)
async def submit_approval(request: ApprovalSubmitRequest) -> ApprovalResponse:
    """
    Submit a full approval decision for a workflow.

    The state_snapshot field should contain the serialised WorkflowState
    returned by the agent run endpoint.
    """
    logger.info(
        f"Approval submit: workflow_id='{request.workflow_id}' reviewer='{request.reviewer}'"
    )

    result = await _decision_service.submit_approval(
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        reviewer=request.reviewer,
        approval_comments=request.approval_comments,
        approval_reason=request.approval_reason,
        approval_confidence=request.approval_confidence,
        business_owner=request.business_owner,
        department=request.department,
        review_duration_seconds=request.review_duration_seconds,
        feedback_items=request.feedback_items,
        state_snapshot=request.state_snapshot,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=422,
            detail={"errors": result.get("errors", ["Approval submission failed."])},
        )

    if "updated_state" in result:
        register_workflow_state(request.workflow_id, result["updated_state"])

    return ApprovalResponse(
        success=True,
        approval_status=ApprovalStatus.APPROVED,
        artifact_id=result["artifact_id"],
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        message=result["message"],
        learning_queue_id=result.get("learning_queue_id", ""),
    )


# ── POST /api/v1/approval/modify ──────────────────────────────────────────────

@router.post("/modify", response_model=ApprovalResponse)
async def modify_approval(request: ApprovalModifyRequest) -> ApprovalResponse:
    """
    Submit an approval decision with reviewer modifications.

    modified_sections must contain at least one before/after diff.
    """
    logger.info(
        f"Approval modify: workflow_id='{request.workflow_id}' reviewer='{request.reviewer}'"
    )

    result = await _decision_service.submit_modification(
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        reviewer=request.reviewer,
        approval_comments=request.approval_comments,
        modified_sections=request.modified_sections,
        approval_confidence=request.approval_confidence,
        business_owner=request.business_owner,
        department=request.department,
        review_duration_seconds=request.review_duration_seconds,
        feedback_items=request.feedback_items,
        state_snapshot=request.state_snapshot,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=422,
            detail={"errors": result.get("errors", ["Modification submission failed."])},
        )

    if "updated_state" in result:
        register_workflow_state(request.workflow_id, result["updated_state"])

    return ApprovalResponse(
        success=True,
        approval_status=ApprovalStatus.MODIFIED,
        artifact_id=result["artifact_id"],
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        message=result["message"],
        learning_queue_id=result.get("learning_queue_id", ""),
    )


# ── POST /api/v1/approval/escalate ────────────────────────────────────────────

@router.post("/escalate", response_model=ApprovalResponse)
async def escalate_approval(request: ApprovalEscalateRequest) -> ApprovalResponse:
    """
    Escalate a workflow to an executive reviewer.

    escalated_to and escalation_reason are required.
    """
    logger.info(
        f"Approval escalate: workflow_id='{request.workflow_id}' "
        f"escalated_to='{request.escalated_to}' reviewer='{request.reviewer}'"
    )

    result = await _decision_service.submit_escalation(
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        reviewer=request.reviewer,
        escalated_to=request.escalated_to,
        escalation_reason=request.escalation_reason,
        approval_comments=request.approval_comments,
        business_owner=request.business_owner,
        department=request.department,
        state_snapshot=request.state_snapshot,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=422,
            detail={"errors": result.get("errors", ["Escalation submission failed."])},
        )

    if "updated_state" in result:
        register_workflow_state(request.workflow_id, result["updated_state"])

    return ApprovalResponse(
        success=True,
        approval_status=ApprovalStatus.ESCALATED,
        artifact_id=result["artifact_id"],
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        message=result["message"],
        learning_queue_id=result.get("learning_queue_id", ""),
    )


# ── POST /api/v1/approval/reject ──────────────────────────────────────────────

@router.post("/reject", response_model=ApprovalResponse)
async def reject_approval(request: ApprovalRejectRequest) -> ApprovalResponse:
    """
    Reject a workflow. The workflow state transitions to REJECTED and a
    negative learning signal is queued for Sprint 9.
    """
    logger.info(
        f"Approval reject: workflow_id='{request.workflow_id}' reviewer='{request.reviewer}'"
    )

    result = await _decision_service.submit_rejection(
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        reviewer=request.reviewer,
        approval_comments=request.approval_comments,
        approval_reason=request.approval_reason,
        business_owner=request.business_owner,
        department=request.department,
        feedback_items=request.feedback_items,
        state_snapshot=request.state_snapshot,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=422,
            detail={"errors": result.get("errors", ["Rejection submission failed."])},
        )

    if "updated_state" in result:
        register_workflow_state(request.workflow_id, result["updated_state"])

    return ApprovalResponse(
        success=True,
        approval_status=ApprovalStatus.REJECTED,
        artifact_id=result["artifact_id"],
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        message=result["message"],
        learning_queue_id=result.get("learning_queue_id", ""),
    )


# ── GET /api/v1/approval/history/{workflow_id} ────────────────────────────────

@router.get("/history/{workflow_id}", response_model=AuditHistoryResponse)
async def get_approval_history_endpoint(workflow_id: str) -> AuditHistoryResponse:
    """
    Return the complete audit history for a workflow.

    Includes:
    - Full pipeline timeline (all agent events)
    - All approval actions taken (from DB)
    - All system audit events (from DB)
    """
    logger.info(f"Approval history requested for workflow_id='{workflow_id}'")

    history_entries: list[AuditHistoryEntry] = []

    # ── 1. Build pipeline timeline from cached state ───────────────────
    cached_state = _workflow_state_cache.get(workflow_id)
    if cached_state:
        pipeline_events = build_pipeline_audit_trail(
            cached_state.model_dump(mode="json")
        )
        history_entries.extend(pipeline_events)

    # ── 2. Load approval history from DB ──────────────────────────────
    async with SessionLocal() as session:
        try:
            db_history = await get_approval_history(session, workflow_id)
            for record in db_history:
                history_entries.append(
                    AuditHistoryEntry(
                        event_id=str(record.id),
                        workflow_id=record.workflow_id,
                        execution_id=record.execution_id,
                        event_type=f"Approval{record.approval_status.capitalize()}",
                        actor=record.reviewer or "system",
                        timestamp=record.created_at.isoformat() + "Z"
                        if record.created_at
                        else "",
                        artifact_id=record.artifact_id,
                        details=record.details or {},
                    )
                )

            # ── 3. Load audit events from DB ──────────────────────────
            db_audit_events = await get_audit_events(session, workflow_id)
            for ev in db_audit_events:
                history_entries.append(
                    AuditHistoryEntry(
                        event_id=ev.event_id,
                        workflow_id=ev.workflow_id,
                        execution_id=ev.execution_id,
                        event_type=ev.event_type,
                        actor=ev.actor,
                        timestamp=ev.created_at.isoformat() + "Z"
                        if ev.created_at
                        else "",
                        artifact_id=ev.artifact_id or "",
                        details=ev.details or {},
                    )
                )
        except Exception as exc:
            logger.warning(
                f"DB history retrieval failed for workflow '{workflow_id}': {exc}"
            )

    if not history_entries and not cached_state:
        raise HTTPException(
            status_code=404,
            detail=f"No approval history found for workflow '{workflow_id}'.",
        )

    # Deduplicate by event_id (pipeline events + DB events may overlap)
    seen: set[str] = set()
    unique_entries: list[AuditHistoryEntry] = []
    for entry in history_entries:
        if entry.event_id not in seen:
            seen.add(entry.event_id)
            unique_entries.append(entry)

    # Sort chronologically
    unique_entries.sort(key=lambda e: e.timestamp)

    return AuditHistoryResponse(
        workflow_id=workflow_id,
        total_events=len(unique_entries),
        events=unique_entries,
    )


# ── GET /api/v1/approval/timeline/{workflow_id} ───────────────────────────────

@router.get("/timeline/{workflow_id}")
async def get_approval_timeline(workflow_id: str) -> dict:
    """
    Return the enriched visual pipeline timeline for the frontend Audit Timeline component.

    Includes per-agent metadata: timestamp, confidence, provider, duration, artifact type.
    """
    cached_state = _workflow_state_cache.get(workflow_id)
    if not cached_state:
        raise HTTPException(
            status_code=404,
            detail=f"Timeline not available for workflow '{workflow_id}'. "
                   "Run the agent pipeline first.",
        )

    timeline = build_agent_timeline(cached_state.model_dump(mode="json"))
    return {"workflow_id": workflow_id, "timeline": timeline}
