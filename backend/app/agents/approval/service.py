"""
Approval Service — Sprint 8 Human Approval & Enterprise Governance Layer.

Orchestrates the full approval cycle:
  1. Validate prerequisites (reflection complete, all artifacts present)
  2. Run governance checks (policies, reviewer requirements, compliance)
  3. Evaluate escalation signals (auto-detect if escalation is needed)
  4. Collect and structure human feedback
  5. Build the ApprovalArtifact and update WorkflowState
  6. Write audit events to the audit trail
  7. Populate the LearningQueue for Sprint 9
  8. Dispatch notifications (via interface stubs)
  9. Persist to database

This service also registers as a pipeline agent so the Planner can
route to it after the Reflection Agent completes.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from app.contracts.approval import ApprovalAgent
from app.core.config import settings
from app.schemas.state import ApprovalArtifact, AgentExecutionMetadata, WorkflowState
from app.agents.approval.schemas import (
    ApprovalPayload,
    ApprovalStatus,
    FeedbackItem,
    ModifiedSection,
)
from app.agents.approval.validator import (
    validate_approval_prerequisites,
    validate_reviewer_fields,
    validate_state_transition,
    validate_escalation_fields,
    validate_modification_fields,
)
from app.agents.approval.governance import run_governance_checks
from app.agents.approval.escalation import evaluate_escalation
from app.agents.approval.feedback import (
    build_feedback_record,
    extract_rejected_recommendations,
    extract_missing_information,
)
from app.agents.approval.audit import (
    build_approval_audit_event,
    build_pipeline_audit_trail,
    build_agent_timeline,
)
from app.agents.approval.queue import (
    build_learning_queue_entry,
    enqueue_learning_record,
    should_queue_for_learning,
)
from app.agents.approval.notifications import (
    notify_workflow_completed,
    notify_escalation_required,
    notify_learning_ready,
)

logger = logging.getLogger("decision_os.approval.service")


class ApprovalService(ApprovalAgent):
    """
    Pipeline-integrated approval agent.

    When invoked by the Planner, it sets approval_artifact to a PENDING
    record — signalling the frontend that human review is required.
    The actual approval decision is submitted via the approval API endpoints.
    """

    async def execute(self, state: WorkflowState) -> WorkflowState:
        """
        Create a PENDING ApprovalArtifact on the workflow state.

        The Planner calls this after reflection completes. The artifact is
        set to PENDING so the frontend knows to present the approval UI.
        The reviewer then submits their decision via the REST API.
        """
        logger.info(
            f"Approval Agent: initialising pending approval for workflow {state.workflow_id}"
        )
        state.execution_logs.append("approval: creating pending approval record")
        start_time = time.time()

        snapshot = state.model_dump(mode="json")
        escalation_result = evaluate_escalation(snapshot)

        payload = ApprovalPayload(
            approval_status=ApprovalStatus.PENDING,
            reviewer="",
            review_timestamp="",
            approval_comments="",
            escalation_required=escalation_result["escalation_required"],
            escalation_reason=escalation_result["escalation_reason"],
            escalated_to=escalation_result["escalated_to"],
            schema_version="1.0.0",
        )

        state.approval_artifact = ApprovalArtifact(
            artifact_id=str(uuid.uuid4()),
            workflow_id=state.workflow_id,
            agent_name="approval",
            schema_version="1.0.0",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            provider="ApprovalService",
            confidence=0.0,
            payload=payload.model_dump(),
        )

        elapsed_ms = int((time.time() - start_time) * 1000)
        state.execution_logs.append(
            f"approval: pending approval created in {elapsed_ms}ms "
            f"(escalation_required={escalation_result['escalation_required']})"
        )

        meta = AgentExecutionMetadata(
            agent_name="Approval Agent",
            provider="ApprovalService",
            model="human",
            latency_ms=elapsed_ms,
            token_usage={},
            estimated_cost=0.0,
            started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
            completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            status="pending",
            retry_count=0,
            version="1.0.0",
        )
        state.agent_metadata["approval"] = meta

        return state


class ApprovalDecisionService:
    """
    Handles explicit human approval decisions submitted via the REST API.

    Separate from ApprovalService (the pipeline agent) to keep concerns distinct.
    Each method corresponds to one approval action endpoint.
    """

    async def submit_approval(
        self,
        workflow_id: str,
        execution_id: str,
        reviewer: str,
        approval_comments: str,
        approval_reason: str,
        approval_confidence: float,
        business_owner: str,
        department: str,
        review_duration_seconds: float,
        feedback_items: list[FeedbackItem],
        state_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        return await self._process_decision(
            workflow_id=workflow_id,
            execution_id=execution_id,
            reviewer=reviewer,
            target_status=ApprovalStatus.APPROVED,
            approval_comments=approval_comments,
            approval_reason=approval_reason,
            approval_confidence=approval_confidence,
            business_owner=business_owner,
            department=department,
            review_duration_seconds=review_duration_seconds,
            feedback_items=feedback_items,
            modified_sections=[],
            escalated_to="",
            escalation_reason="",
            state_snapshot=state_snapshot,
        )

    async def submit_modification(
        self,
        workflow_id: str,
        execution_id: str,
        reviewer: str,
        approval_comments: str,
        modified_sections: list[ModifiedSection],
        approval_confidence: float,
        business_owner: str,
        department: str,
        review_duration_seconds: float,
        feedback_items: list[FeedbackItem],
        state_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        # Validate modification-specific fields
        mod_dicts = [m.model_dump() for m in modified_sections]
        mod_validation = validate_modification_fields(mod_dicts, approval_comments)
        if not mod_validation["valid"]:
            return {
                "success": False,
                "errors": mod_validation["errors"],
                "artifact_id": "",
                "learning_queue_id": "",
            }

        return await self._process_decision(
            workflow_id=workflow_id,
            execution_id=execution_id,
            reviewer=reviewer,
            target_status=ApprovalStatus.MODIFIED,
            approval_comments=approval_comments,
            approval_reason="Strategy accepted with modifications.",
            approval_confidence=approval_confidence,
            business_owner=business_owner,
            department=department,
            review_duration_seconds=review_duration_seconds,
            feedback_items=feedback_items,
            modified_sections=modified_sections,
            escalated_to="",
            escalation_reason="",
            state_snapshot=state_snapshot,
        )

    async def submit_escalation(
        self,
        workflow_id: str,
        execution_id: str,
        reviewer: str,
        escalated_to: str,
        escalation_reason: str,
        approval_comments: str,
        business_owner: str,
        department: str,
        state_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        esc_validation = validate_escalation_fields(escalated_to, escalation_reason)
        if not esc_validation["valid"]:
            return {
                "success": False,
                "errors": esc_validation["errors"],
                "artifact_id": "",
                "learning_queue_id": "",
            }

        return await self._process_decision(
            workflow_id=workflow_id,
            execution_id=execution_id,
            reviewer=reviewer,
            target_status=ApprovalStatus.ESCALATED,
            approval_comments=approval_comments or escalation_reason,
            approval_reason=escalation_reason,
            approval_confidence=0.5,
            business_owner=business_owner,
            department=department,
            review_duration_seconds=0.0,
            feedback_items=[],
            modified_sections=[],
            escalated_to=escalated_to,
            escalation_reason=escalation_reason,
            state_snapshot=state_snapshot,
        )

    async def submit_rejection(
        self,
        workflow_id: str,
        execution_id: str,
        reviewer: str,
        approval_comments: str,
        approval_reason: str,
        business_owner: str,
        department: str,
        feedback_items: list[FeedbackItem],
        state_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        return await self._process_decision(
            workflow_id=workflow_id,
            execution_id=execution_id,
            reviewer=reviewer,
            target_status=ApprovalStatus.REJECTED,
            approval_comments=approval_comments,
            approval_reason=approval_reason,
            approval_confidence=1.0,
            business_owner=business_owner,
            department=department,
            review_duration_seconds=0.0,
            feedback_items=feedback_items,
            modified_sections=[],
            escalated_to="",
            escalation_reason="",
            state_snapshot=state_snapshot,
        )

    # ── Core decision processing ──────────────────────────────────────────────

    async def _process_decision(
        self,
        workflow_id: str,
        execution_id: str,
        reviewer: str,
        target_status: ApprovalStatus,
        approval_comments: str,
        approval_reason: str,
        approval_confidence: float,
        business_owner: str,
        department: str,
        review_duration_seconds: float,
        feedback_items: list[FeedbackItem],
        modified_sections: list[ModifiedSection],
        escalated_to: str,
        escalation_reason: str,
        state_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Core approval processing pipeline. Called by all four action methods.
        """
        start_ts = time.time()
        artifact_id = str(uuid.uuid4())
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # ── 1. Prerequisite validation ────────────────────────────────────
        prereq = validate_approval_prerequisites(state_snapshot)
        if not prereq["valid"]:
            logger.warning(
                f"Prerequisite validation failed for workflow '{workflow_id}': {prereq['errors']}"
            )
            return {
                "success": False,
                "errors": prereq["errors"],
                "artifact_id": "",
                "learning_queue_id": "",
            }

        # ── 2. Reviewer field validation ──────────────────────────────────
        reviewer_validation = validate_reviewer_fields(
            reviewer=reviewer,
            approval_comments=approval_comments,
            business_owner=business_owner,
        )
        if not reviewer_validation["valid"]:
            return {
                "success": False,
                "errors": reviewer_validation["errors"],
                "artifact_id": "",
                "learning_queue_id": "",
            }

        # ── 3. State transition validation ────────────────────────────────
        current_status = ApprovalStatus.PENDING
        existing_artifact = state_snapshot.get("approval_artifact")
        if existing_artifact and isinstance(existing_artifact, dict):
            existing_payload = existing_artifact.get("payload", {})
            current_raw = existing_payload.get("approval_status", "pending")
            try:
                current_status = ApprovalStatus(current_raw)
            except ValueError:
                current_status = ApprovalStatus.PENDING

        transition = validate_state_transition(current_status, target_status)
        if not transition["valid"]:
            return {
                "success": False,
                "errors": [transition["error"]],
                "artifact_id": "",
                "learning_queue_id": "",
            }

        # ── 4. Governance checks ──────────────────────────────────────────
        governance_result = run_governance_checks(
            reviewer=reviewer,
            business_owner=business_owner,
            department=department,
            approval_confidence=approval_confidence,
            approval_comments=approval_comments,
            state_snapshot=state_snapshot,
            target_status=target_status.value,
        )

        # ── 5. Escalation evaluation ──────────────────────────────────────
        escalation_eval = evaluate_escalation(state_snapshot)
        if escalation_eval["escalation_required"] and target_status == ApprovalStatus.APPROVED:
            if not escalated_to:
                escalated_to = escalation_eval.get("escalated_to", "")
            if not escalation_reason:
                escalation_reason = escalation_eval.get("escalation_reason", "")

        # ── 6. Extract cross-artifact references ─────────────────────────
        def _get_artifact_id(key: str) -> str:
            a = state_snapshot.get(key)
            if isinstance(a, dict):
                return a.get("artifact_id", "")
            return ""

        # ── 7. Build approval payload ─────────────────────────────────────
        mod_section_models = [
            ModifiedSection(**m.model_dump()) if isinstance(m, ModifiedSection) else ModifiedSection(**m)
            for m in modified_sections
        ]

        payload = ApprovalPayload(
            approval_status=target_status,
            reviewer=reviewer,
            review_timestamp=now_iso,
            approval_comments=approval_comments,
            approval_reason=approval_reason,
            modified_sections=mod_section_models,
            escalation_required=escalation_eval["escalation_required"] or bool(escalated_to),
            escalation_reason=escalation_reason,
            escalated_to=escalated_to,
            feedback_items=feedback_items,
            review_duration_seconds=review_duration_seconds,
            approval_confidence=approval_confidence,
            business_owner=business_owner,
            department=department,
            workflow_report_reference=workflow_id,
            decision_reference=_get_artifact_id("decision_artifact"),
            strategy_reference=_get_artifact_id("strategy_artifact"),
            reflection_reference=_get_artifact_id("reflection_artifact"),
            execution_metadata=state_snapshot.get("agent_metadata", {}),
            trust_score_at_review=governance_result["trust_score_at_review"],
            governance_score_at_review=governance_result["governance_score_at_review"],
            hallucination_risk_at_review=governance_result["hallucination_risk_at_review"],
            schema_version="1.0.0",
        )

        # ── 8. Build feedback record ──────────────────────────────────────
        mod_dicts = [m.model_dump() for m in mod_section_models]
        feedback_record = build_feedback_record(
            workflow_id=workflow_id,
            execution_id=execution_id,
            artifact_id=artifact_id,
            reviewer=reviewer,
            approval_status=target_status.value,
            feedback_items=feedback_items,
            modified_sections=mod_dicts,
            approval_comments=approval_comments,
        )

        # ── 9. Build audit event ──────────────────────────────────────────
        audit_event = build_approval_audit_event(
            workflow_id=workflow_id,
            execution_id=execution_id,
            reviewer=reviewer,
            approval_status=target_status.value,
            artifact_id=artifact_id,
            details={
                "approval_comments": approval_comments,
                "approval_reason": approval_reason,
                "business_owner": business_owner,
                "department": department,
                "governance_compliant": governance_result["compliant"],
                "governance_violations": governance_result["violations"],
                "escalation_triggers": escalation_eval["triggers"],
                "review_duration_seconds": review_duration_seconds,
                "feedback_item_count": len(feedback_items),
            },
        )

        # ── 10. Learning queue ────────────────────────────────────────────
        learning_queue_id = ""
        if should_queue_for_learning(target_status.value):
            queue_entry = build_learning_queue_entry(
                workflow_id=workflow_id,
                execution_id=execution_id,
                approval_artifact_id=artifact_id,
                approval_status=target_status.value,
                reviewer=reviewer,
                feedback_record=feedback_record,
                state_snapshot=state_snapshot,
            )
            learning_queue_id = queue_entry["queue_id"]
            enqueue_learning_record(queue_entry)

        # ── 11. Notifications ─────────────────────────────────────────────
        if target_status == ApprovalStatus.ESCALATED and escalated_to:
            await notify_escalation_required(
                workflow_id=workflow_id,
                escalated_to=escalated_to,
                escalation_reason=escalation_reason,
            )
        elif target_status in (ApprovalStatus.APPROVED, ApprovalStatus.MODIFIED, ApprovalStatus.REJECTED):
            await notify_workflow_completed(
                workflow_id=workflow_id,
                reviewer=reviewer,
                approval_status=target_status.value,
                business_owner=business_owner,
            )
        if learning_queue_id:
            await notify_learning_ready(
                workflow_id=workflow_id,
                queue_id=learning_queue_id,
                signal_type=feedback_record.get("feedback_items", [{}])[0].get(
                    "learning_signal", "note"
                ) if feedback_record.get("feedback_items") else "note",
            )

        # ── 12. DB persistence ────────────────────────────────────────────
        await self._persist_to_db(
            artifact_id=artifact_id,
            workflow_id=workflow_id,
            execution_id=execution_id,
            payload=payload,
            feedback_record=feedback_record,
            audit_event=audit_event,
            learning_queue_id=learning_queue_id,
        )

        elapsed_ms = int((time.time() - start_ts) * 1000)
        logger.info(
            f"Approval decision processed: workflow='{workflow_id}' "
            f"status='{target_status.value}' reviewer='{reviewer}' "
            f"artifact_id='{artifact_id}' elapsed={elapsed_ms}ms"
        )

        return {
            "success": True,
            "approval_status": target_status.value,
            "artifact_id": artifact_id,
            "workflow_id": workflow_id,
            "execution_id": execution_id,
            "message": (
                f"Workflow '{workflow_id}' has been {target_status.value} by '{reviewer}'."
            ),
            "learning_queue_id": learning_queue_id,
            "governance_compliant": governance_result["compliant"],
            "governance_violations": governance_result["violations"],
            "governance_warnings": governance_result["warnings"],
            "escalation_required": escalation_eval["escalation_required"],
            "escalation_triggers": escalation_eval["triggers"],
            "audit_event_id": audit_event.event_id,
            "payload": payload.model_dump(),
        }

    async def _persist_to_db(
        self,
        artifact_id: str,
        workflow_id: str,
        execution_id: str,
        payload: ApprovalPayload,
        feedback_record: dict[str, Any],
        audit_event: Any,
        learning_queue_id: str,
    ) -> None:
        """Persist all approval records to the database non-blocking."""
        from app.core.database import SessionLocal
        from app.agents.approval.repository import (
            save_approval_request,
            save_approval_history,
            save_review_feedback,
            save_learning_queue,
            save_audit_event,
        )

        async with SessionLocal() as session:
            try:
                await save_approval_request(
                    session=session,
                    artifact_id=artifact_id,
                    workflow_id=workflow_id,
                    execution_id=execution_id,
                    payload=payload.model_dump(),
                )
                await save_approval_history(
                    session=session,
                    workflow_id=workflow_id,
                    execution_id=execution_id,
                    artifact_id=artifact_id,
                    approval_status=payload.approval_status.value,
                    reviewer=payload.reviewer,
                    details=payload.model_dump(),
                )
                if feedback_record.get("feedback_items"):
                    await save_review_feedback(
                        session=session,
                        workflow_id=workflow_id,
                        execution_id=execution_id,
                        artifact_id=artifact_id,
                        feedback_record=feedback_record,
                    )
                if learning_queue_id:
                    await save_learning_queue(
                        session=session,
                        queue_id=learning_queue_id,
                        workflow_id=workflow_id,
                        execution_id=execution_id,
                        artifact_id=artifact_id,
                        approval_status=payload.approval_status.value,
                        reviewer=payload.reviewer,
                    )
                await save_audit_event(
                    session=session,
                    event_id=audit_event.event_id,
                    workflow_id=workflow_id,
                    execution_id=execution_id,
                    event_type=audit_event.event_type,
                    actor=audit_event.actor,
                    artifact_id=artifact_id,
                    details=audit_event.details,
                )
                logger.info(f"All approval records persisted for workflow '{workflow_id}'.")
            except Exception as exc:
                logger.warning(f"DB persistence partially failed for workflow '{workflow_id}': {exc}")
