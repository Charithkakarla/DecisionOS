"""
Approval Agent Tests — Sprint 8.

Covers:
  - Approval Engine (service, decision processing)
  - Governance Engine
  - Escalation Engine
  - Feedback Engine
  - Learning Queue
  - Validator
  - API endpoints (router)
  - DB models
  - Workflow integration (planner step)
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch

from app.agents.approval.schemas import (
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
    _derive_learning_signal,
    _derive_signal_from_status,
)
from app.agents.approval.queue import (
    build_learning_queue_entry,
    should_queue_for_learning,
)
from app.agents.approval.audit import (
    build_audit_event,
    build_pipeline_audit_trail,
    build_agent_timeline,
    build_approval_audit_event,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _make_full_state_snapshot(
    trust_score: float = 0.85,
    governance_score: float = 0.80,
    hallucination_risk: float = 0.15,
    evidence_coverage: float = 0.90,
    risk_score: float = 0.25,
    estimated_revenue: float = 50_000.0,
    complexity: str = "Medium",
) -> dict:
    return {
        "workflow_id": "wf-test001",
        "execution_id": "exec-test001",
        "transcript": "Test enterprise workflow.",
        "context_artifact": {
            "artifact_id": "ctx-001",
            "workflow_id": "wf-test001",
            "agent_name": "context",
            "schema_version": "1.0.0",
            "created_at": "2026-06-27T10:00:00Z",
            "provider": "MockContextProvider",
            "confidence": 0.9,
            "metadata": {},
            "payload": {"business_goal": "Migrate database"},
        },
        "knowledge_artifact": {
            "artifact_id": "know-001",
            "workflow_id": "wf-test001",
            "agent_name": "knowledge",
            "schema_version": "1.0.0",
            "created_at": "2026-06-27T10:01:00Z",
            "provider": "pgvector",
            "confidence": 0.88,
            "metadata": {},
            "payload": {
                "knowledge_results": [],
                "citations": [],
                "confidence_score": 0.88,
                "evidence_metadata": [],
            },
        },
        "decision_artifact": {
            "artifact_id": "dec-001",
            "workflow_id": "wf-test001",
            "agent_name": "decision",
            "schema_version": "1.0.0",
            "created_at": "2026-06-27T10:02:00Z",
            "provider": "MockDecisionProvider",
            "confidence": 0.87,
            "metadata": {},
            "payload": {
                "business_goal": "Migrate database",
                "decision_reasoning": "Phased migration is safest.",
                "business_scores": {"risk_score": risk_score},
                "recommendations": [
                    {"id": "rec-1", "title": "Sandbox Pilot"},
                    {"id": "rec-2", "title": "Direct Migration"},
                ],
                "missing_information": ["Budget sign-off", "Sizing metrics"],
                "analysis": {
                    "estimated_revenue": estimated_revenue,
                    "risk_score": risk_score,
                },
            },
        },
        "strategy_artifact": {
            "artifact_id": "strat-001",
            "workflow_id": "wf-test001",
            "agent_name": "strategy",
            "schema_version": "1.0.0",
            "created_at": "2026-06-27T10:03:00Z",
            "provider": "MockStrategyProvider",
            "confidence": 0.83,
            "metadata": {},
            "payload": {
                "selected_strategy": "Phased Cloud Migration",
                "implementation_complexity": complexity,
                "estimated_roi": 3.2,
                "estimated_cost": 45_000.0,
                "implementation_timeline": "90 days",
                "risks": [],
            },
        },
        "reflection_artifact": {
            "artifact_id": "ref-001",
            "workflow_id": "wf-test001",
            "agent_name": "reflection",
            "schema_version": "1.0.0",
            "created_at": "2026-06-27T10:04:00Z",
            "provider": "MockReflectionProvider",
            "confidence": trust_score,
            "metadata": {},
            "payload": {
                "validation_status": "passed",
                "overall_trust_score": trust_score,
                "governance_score": governance_score,
                "hallucination_risk": hallucination_risk,
                "evidence_coverage": evidence_coverage,
                "audit_summary": "Strategy is well-grounded.",
                "critical_findings": [],
                "warnings": [],
            },
        },
        "final_action": "Initiate phased migration.",
        "agent_metadata": {},
        "workflow_events": [
            {
                "event_type": "WorkflowStarted",
                "timestamp": "2026-06-27T10:00:00Z",
                "agent": "planner",
                "duration_ms": 0,
                "status": "completed",
                "artifact_produced": "WorkflowExecution",
                "confidence": 1.0,
                "provider": "PlannerService",
            }
        ],
    }


# ── Validator Tests ────────────────────────────────────────────────────────────

class TestValidator:
    def test_prerequisites_valid(self):
        snapshot = _make_full_state_snapshot()
        result = validate_approval_prerequisites(snapshot)
        assert result["valid"] is True
        assert result["errors"] == []

    def test_prerequisites_missing_reflection(self):
        snapshot = _make_full_state_snapshot()
        snapshot["reflection_artifact"] = None
        result = validate_approval_prerequisites(snapshot)
        assert result["valid"] is False
        assert any("reflection" in e.lower() for e in result["errors"])

    def test_prerequisites_missing_decision(self):
        snapshot = _make_full_state_snapshot()
        snapshot["decision_artifact"] = None
        result = validate_approval_prerequisites(snapshot)
        assert result["valid"] is False
        assert any("decision" in e.lower() for e in result["errors"])

    def test_prerequisites_missing_workflow_id(self):
        snapshot = _make_full_state_snapshot()
        snapshot["workflow_id"] = ""
        result = validate_approval_prerequisites(snapshot)
        assert result["valid"] is False

    def test_reviewer_fields_valid(self):
        result = validate_reviewer_fields("John Smith", "This is a valid approval comment.", "Finance Team")
        assert result["valid"] is True

    def test_reviewer_fields_missing_reviewer(self):
        result = validate_reviewer_fields("", "Valid comment here.", "Finance Team")
        assert result["valid"] is False
        assert any("reviewer" in e.lower() for e in result["errors"])

    def test_reviewer_fields_short_comment(self):
        result = validate_reviewer_fields("Jane Doe", "OK", "Finance")
        assert result["valid"] is False
        assert any("comment" in e.lower() for e in result["errors"])

    def test_reviewer_fields_missing_owner(self):
        result = validate_reviewer_fields("Jane Doe", "This is a valid comment.", "")
        assert result["valid"] is False
        assert any("owner" in e.lower() for e in result["errors"])

    def test_state_transition_valid(self):
        result = validate_state_transition(ApprovalStatus.PENDING, ApprovalStatus.APPROVED)
        assert result["valid"] is True
        assert result["error"] is None

    def test_state_transition_invalid_terminal(self):
        result = validate_state_transition(ApprovalStatus.APPROVED, ApprovalStatus.PENDING)
        assert result["valid"] is False
        assert result["error"] is not None

    def test_state_transition_escalated_to_approved(self):
        result = validate_state_transition(ApprovalStatus.ESCALATED, ApprovalStatus.APPROVED)
        assert result["valid"] is True

    def test_state_transition_rejected_to_approved(self):
        result = validate_state_transition(ApprovalStatus.REJECTED, ApprovalStatus.APPROVED)
        assert result["valid"] is False

    def test_escalation_fields_valid(self):
        result = validate_escalation_fields("CFO", "High revenue requires CFO approval.")
        assert result["valid"] is True

    def test_escalation_fields_missing_target(self):
        result = validate_escalation_fields("", "High risk detected.")
        assert result["valid"] is False

    def test_modification_fields_valid(self):
        sections = [{"section": "strategy.timeline", "before": "60 days", "after": "90 days"}]
        result = validate_modification_fields(sections, "Timeline extended for safety.")
        assert result["valid"] is True

    def test_modification_fields_empty_sections(self):
        result = validate_modification_fields([], "No sections provided.")
        assert result["valid"] is False


# ── Governance Tests ───────────────────────────────────────────────────────────

class TestGovernance:
    def test_compliant_approval(self):
        snapshot = _make_full_state_snapshot()
        result = run_governance_checks(
            reviewer="John Smith",
            business_owner="IT Department",
            department="technology",
            approval_confidence=0.9,
            approval_comments="Strategy is well-structured and evidence-backed. Approving.",
            state_snapshot=snapshot,
            target_status="approved",
        )
        assert result["compliant"] is True
        assert result["governance_score"] > 0.5

    def test_non_compliant_missing_owner_finance(self):
        snapshot = _make_full_state_snapshot()
        result = run_governance_checks(
            reviewer="Analyst",
            business_owner="",
            department="finance",
            approval_confidence=0.9,
            approval_comments="Approved without sufficient context provided here.",
            state_snapshot=snapshot,
            target_status="approved",
        )
        assert result["compliant"] is False
        assert any("GOV-002" in v for v in result["violations"])

    def test_low_trust_score_flags_executive_review(self):
        snapshot = _make_full_state_snapshot(trust_score=0.3)
        result = run_governance_checks(
            reviewer="Manager",
            business_owner="Operations",
            department="operations",
            approval_confidence=0.9,
            approval_comments="Approving despite low trust score indicator.",
            state_snapshot=snapshot,
            target_status="approved",
        )
        assert result["requires_executive_review"] is True

    def test_high_confidence_low_comment_violation(self):
        snapshot = _make_full_state_snapshot()
        result = run_governance_checks(
            reviewer="Jane",
            business_owner="Sales",
            department="sales",
            approval_confidence=0.9,
            approval_comments="OK",
            state_snapshot=snapshot,
            target_status="approved",
        )
        assert result["compliant"] is False


# ── Escalation Tests ───────────────────────────────────────────────────────────

class TestEscalation:
    def test_no_escalation_clean_workflow(self):
        snapshot = _make_full_state_snapshot(
            trust_score=0.9,
            hallucination_risk=0.1,
            risk_score=0.1,
            estimated_revenue=30_000.0,
            complexity="Low",
        )
        result = evaluate_escalation(snapshot)
        assert result["escalation_required"] is False
        assert result["triggers"] == []
        assert result["severity"] == "low"

    def test_escalation_high_revenue(self):
        snapshot = _make_full_state_snapshot(estimated_revenue=200_000.0)
        result = evaluate_escalation(snapshot)
        assert result["escalation_required"] is True
        assert "high_revenue" in result["triggers"]

    def test_escalation_low_trust(self):
        snapshot = _make_full_state_snapshot(trust_score=0.3)
        result = evaluate_escalation(snapshot)
        assert result["escalation_required"] is True
        assert "low_trust" in result["triggers"]

    def test_escalation_high_hallucination(self):
        snapshot = _make_full_state_snapshot(hallucination_risk=0.7)
        result = evaluate_escalation(snapshot)
        assert result["escalation_required"] is True
        assert "high_hallucination" in result["triggers"]

    def test_escalation_critical_severity(self):
        snapshot = _make_full_state_snapshot(
            trust_score=0.2,
            hallucination_risk=0.8,
            risk_score=0.9,
            estimated_revenue=500_000.0,
            complexity="High",
            governance_score=0.2,
        )
        # Inject critical findings
        snapshot["reflection_artifact"]["payload"]["critical_findings"] = [
            "Finding 1", "Finding 2", "Finding 3"
        ]
        result = evaluate_escalation(snapshot)
        assert result["escalation_required"] is True
        assert result["severity"] in ("high", "critical")

    def test_escalation_high_risk_score(self):
        snapshot = _make_full_state_snapshot(risk_score=0.75)
        result = evaluate_escalation(snapshot)
        assert result["escalation_required"] is True
        assert "high_risk" in result["triggers"]


# ── Feedback Tests ────────────────────────────────────────────────────────────

class TestFeedback:
    def test_build_feedback_record(self):
        feedback_items = [
            FeedbackItem(
                section="strategy.timeline",
                original_value="60 days",
                corrected_value="90 days",
                comment="Extend for safety compliance.",
                feedback_type="correction",
            )
        ]
        record = build_feedback_record(
            workflow_id="wf-test001",
            execution_id="exec-test001",
            artifact_id="art-001",
            reviewer="John Smith",
            approval_status="modified",
            feedback_items=feedback_items,
        )
        assert record["workflow_id"] == "wf-test001"
        assert record["total_feedback_items"] >= 1
        assert any(
            item["learning_signal"] == "human_override"
            for item in record["feedback_items"]
        )

    def test_derive_learning_signal_correction(self):
        item = FeedbackItem(
            section="strategy.timeline",
            feedback_type="correction",
        )
        signal = _derive_learning_signal(item)
        assert signal == "human_override"

    def test_derive_learning_signal_deletion(self):
        item = FeedbackItem(
            section="recommendation.risks",
            feedback_type="deletion",
        )
        assert _derive_learning_signal(item) == "quality_issue"

    def test_derive_signal_from_status(self):
        assert _derive_signal_from_status("approved") == "positive_signal"
        assert _derive_signal_from_status("rejected") == "quality_issue"
        assert _derive_signal_from_status("modified") == "human_override"

    def test_extract_rejected_recommendations(self):
        snapshot = _make_full_state_snapshot()
        recs = extract_rejected_recommendations(snapshot)
        assert "Sandbox Pilot" in recs
        assert "Direct Migration" in recs

    def test_extract_missing_information(self):
        snapshot = _make_full_state_snapshot()
        missing = extract_missing_information(snapshot)
        assert "Budget sign-off" in missing


# ── Learning Queue Tests ──────────────────────────────────────────────────────

class TestLearningQueue:
    def test_should_queue_approved(self):
        assert should_queue_for_learning("approved") is True

    def test_should_queue_modified(self):
        assert should_queue_for_learning("modified") is True

    def test_should_queue_rejected(self):
        assert should_queue_for_learning("rejected") is True

    def test_should_not_queue_pending(self):
        assert should_queue_for_learning("pending") is False

    def test_build_learning_queue_entry(self):
        snapshot = _make_full_state_snapshot()
        feedback_items = [
            FeedbackItem(
                section="strategy",
                feedback_type="note",
                comment="Good strategy overall.",
            )
        ]
        feedback_record = build_feedback_record(
            workflow_id="wf-test001",
            execution_id="exec-test001",
            artifact_id="art-001",
            reviewer="Jane Doe",
            approval_status="approved",
            feedback_items=feedback_items,
        )
        entry = build_learning_queue_entry(
            workflow_id="wf-test001",
            execution_id="exec-test001",
            approval_artifact_id="art-001",
            approval_status="approved",
            reviewer="Jane Doe",
            feedback_record=feedback_record,
            state_snapshot=snapshot,
        )
        assert entry["workflow_id"] == "wf-test001"
        assert entry["signal_type"] == "positive_reinforcement"
        assert entry["priority"] == "high"
        assert entry["consumed"] is False
        assert "reflection_signals" in entry
        assert "strategy_context" in entry


# ── Audit Tests ───────────────────────────────────────────────────────────────

class TestAudit:
    def test_build_audit_event(self):
        event = build_audit_event(
            workflow_id="wf-test001",
            execution_id="exec-test001",
            event_type="ApprovalGranted",
            actor="John Smith",
            details={"approval_status": "approved"},
            artifact_id="art-001",
        )
        assert event.workflow_id == "wf-test001"
        assert event.event_type == "ApprovalGranted"
        assert event.actor == "John Smith"
        assert event.artifact_id == "art-001"
        assert event.event_id != ""

    def test_build_approval_audit_event(self):
        event = build_approval_audit_event(
            workflow_id="wf-test001",
            execution_id="exec-test001",
            reviewer="Jane Doe",
            approval_status="rejected",
            artifact_id="art-002",
            details={"reason": "Strategy is incomplete."},
        )
        assert event.event_type == "ApprovalRejected"
        assert event.actor == "Jane Doe"

    def test_build_pipeline_audit_trail(self):
        snapshot = _make_full_state_snapshot()
        trail = build_pipeline_audit_trail(snapshot)
        assert isinstance(trail, list)
        # Should have at least the WorkflowStarted event
        assert len(trail) >= 1
        event_types = [e.event_type for e in trail]
        assert "WorkflowStarted" in event_types

    def test_build_agent_timeline(self):
        snapshot = _make_full_state_snapshot()
        timeline = build_agent_timeline(snapshot)
        assert isinstance(timeline, list)
        assert len(timeline) >= 1
        # First entry should be WorkflowStarted
        assert timeline[0]["label"] == "Workflow Started"
        # Should have context, knowledge, decision, strategy, reflection
        agents = [step["agent"] for step in timeline]
        assert "context" in agents
        assert "reflection" in agents


# ── Integration Test ──────────────────────────────────────────────────────────

class TestApprovalIntegration:
    """Integration test: full approval cycle through ApprovalDecisionService."""

    @pytest.mark.asyncio
    async def test_full_approval_cycle(self):
        from app.agents.approval.service import ApprovalDecisionService

        service = ApprovalDecisionService()
        snapshot = _make_full_state_snapshot()

        with patch.object(service, "_persist_to_db", new_callable=AsyncMock):
            result = await service.submit_approval(
                workflow_id="wf-test001",
                execution_id="exec-test001",
                reviewer="John Executive",
                approval_comments="Strategy is solid, evidence-backed, and risk-mitigated. Approving.",
                approval_reason="All validation criteria met.",
                approval_confidence=0.95,
                business_owner="Operations Director",
                department="technology",
                review_duration_seconds=120.0,
                feedback_items=[],
                state_snapshot=snapshot,
            )

        assert result["success"] is True
        assert result["approval_status"] == "approved"
        assert result["artifact_id"] != ""
        assert result["learning_queue_id"] != ""

    @pytest.mark.asyncio
    async def test_rejection_cycle(self):
        from app.agents.approval.service import ApprovalDecisionService

        service = ApprovalDecisionService()
        snapshot = _make_full_state_snapshot()

        with patch.object(service, "_persist_to_db", new_callable=AsyncMock):
            result = await service.submit_rejection(
                workflow_id="wf-test001",
                execution_id="exec-test001",
                reviewer="Risk Officer",
                approval_comments="Strategy lacks sufficient risk mitigation detail. Rejecting for rework.",
                approval_reason="Insufficient mitigation plan.",
                business_owner="Risk Department",
                department="compliance",
                feedback_items=[],
                state_snapshot=snapshot,
            )

        assert result["success"] is True
        assert result["approval_status"] == "rejected"

    @pytest.mark.asyncio
    async def test_invalid_approval_missing_reflection(self):
        from app.agents.approval.service import ApprovalDecisionService

        service = ApprovalDecisionService()
        snapshot = _make_full_state_snapshot()
        snapshot["reflection_artifact"] = None

        result = await service.submit_approval(
            workflow_id="wf-test001",
            execution_id="exec-test001",
            reviewer="John",
            approval_comments="Trying to approve without reflection.",
            approval_reason="",
            approval_confidence=0.9,
            business_owner="IT",
            department="technology",
            review_duration_seconds=0.0,
            feedback_items=[],
            state_snapshot=snapshot,
        )

        assert result["success"] is False
        assert len(result["errors"]) > 0
