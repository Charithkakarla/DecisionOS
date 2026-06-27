"""
Approval Agent Schemas — Sprint 8 Human Approval & Enterprise Governance Layer.

Defines all Pydantic models for the approval workflow including:
  - ApprovalStatus enum
  - ApprovalPayload (the content inside ApprovalArtifact)
  - Request / response models for every approval API endpoint
  - FeedbackItem for inline human corrections
"""

from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


# ── Approval Status ──────────────────────────────────────────────────────────

class ApprovalStatus(str, Enum):
    APPROVED = "approved"
    MODIFIED = "modified"
    ESCALATED = "escalated"
    REJECTED = "rejected"
    PENDING = "pending"


# ── Feedback Item ────────────────────────────────────────────────────────────

class FeedbackItem(BaseModel):
    """A single piece of structured human feedback attached to a review."""

    section: str = Field(description="The section or field being corrected, e.g. 'strategy.selected_strategy'")
    original_value: str = Field(default="", description="The AI-generated value before the correction")
    corrected_value: str = Field(default="", description="The human-corrected value")
    comment: str = Field(default="", description="Free-text note from the reviewer")
    feedback_type: str = Field(
        default="correction",
        description="One of: correction, addition, deletion, note",
    )


# ── Modified Section ─────────────────────────────────────────────────────────

class ModifiedSection(BaseModel):
    """Records a single inline before/after change made during a 'MODIFIED' review."""

    section: str
    before: str
    after: str
    change_reason: str = ""


# ── Approval Payload ─────────────────────────────────────────────────────────

class ApprovalPayload(BaseModel):
    """
    Full payload stored inside ApprovalArtifact.payload.

    This is the enterprise governance record for a single review cycle.
    """

    # Core decision fields
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    reviewer: str = Field(description="Name or ID of the human reviewer")
    review_timestamp: str = Field(description="ISO-8601 UTC timestamp when the review was submitted")
    approval_comments: str = Field(default="", description="Primary comment from the reviewer")
    approval_reason: str = Field(default="", description="Structured rationale for the decision")

    # Modification tracking
    modified_sections: list[ModifiedSection] = Field(
        default_factory=list,
        description="Inline before/after diffs when status is MODIFIED",
    )

    # Escalation
    escalation_required: bool = False
    escalation_reason: str = ""
    escalated_to: str = ""

    # Human feedback items
    feedback_items: list[FeedbackItem] = Field(
        default_factory=list,
        description="Structured corrections and notes from the reviewer",
    )

    # Timing
    review_duration_seconds: float = Field(
        default=0.0,
        description="Wall-clock seconds the reviewer spent on this review",
    )

    # Confidence the reviewer has in their own decision
    approval_confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Reviewer's confidence in their approval decision (0–1)",
    )

    # Org metadata
    business_owner: str = ""
    department: str = ""

    # Cross-artifact references
    workflow_report_reference: str = ""
    decision_reference: str = ""
    strategy_reference: str = ""
    reflection_reference: str = ""

    # Execution metadata snapshot captured at review time
    execution_metadata: dict[str, Any] = Field(default_factory=dict)

    # Governance scores captured from the reflection artifact at review time
    trust_score_at_review: float = Field(default=0.0, ge=0.0, le=1.0)
    governance_score_at_review: float = Field(default=0.0, ge=0.0, le=1.0)
    hallucination_risk_at_review: float = Field(default=0.0, ge=0.0, le=1.0)

    # Schema versioning
    schema_version: str = "1.0.0"


# ── API Request Models ───────────────────────────────────────────────────────

class ApprovalSubmitRequest(BaseModel):
    """Request body for POST /api/v1/approval/submit (full approval)."""

    workflow_id: str
    execution_id: str
    reviewer: str
    approval_comments: str
    approval_reason: str = ""
    approval_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    business_owner: str = ""
    department: str = ""
    review_duration_seconds: float = 0.0
    feedback_items: list[FeedbackItem] = Field(default_factory=list)
    # snapshot of the full state to build the artifact
    state_snapshot: dict[str, Any] = Field(default_factory=dict)


class ApprovalModifyRequest(BaseModel):
    """Request body for POST /api/v1/approval/modify."""

    workflow_id: str
    execution_id: str
    reviewer: str
    approval_comments: str
    modified_sections: list[ModifiedSection] = Field(default_factory=list)
    approval_confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    business_owner: str = ""
    department: str = ""
    review_duration_seconds: float = 0.0
    feedback_items: list[FeedbackItem] = Field(default_factory=list)
    state_snapshot: dict[str, Any] = Field(default_factory=dict)


class ApprovalEscalateRequest(BaseModel):
    """Request body for POST /api/v1/approval/escalate."""

    workflow_id: str
    execution_id: str
    reviewer: str
    escalated_to: str = Field(description="Name of the executive or body receiving the escalation")
    escalation_reason: str
    approval_comments: str = ""
    business_owner: str = ""
    department: str = ""
    state_snapshot: dict[str, Any] = Field(default_factory=dict)


class ApprovalRejectRequest(BaseModel):
    """Request body for POST /api/v1/approval/reject."""

    workflow_id: str
    execution_id: str
    reviewer: str
    approval_comments: str
    approval_reason: str = ""
    business_owner: str = ""
    department: str = ""
    feedback_items: list[FeedbackItem] = Field(default_factory=list)
    state_snapshot: dict[str, Any] = Field(default_factory=dict)


# ── API Response Models ──────────────────────────────────────────────────────

class ApprovalResponse(BaseModel):
    """Standard response returned by all approval action endpoints."""

    success: bool
    approval_status: ApprovalStatus
    artifact_id: str
    workflow_id: str
    execution_id: str
    message: str
    learning_queue_id: str = ""


class AuditHistoryEntry(BaseModel):
    """A single entry in the approval audit history."""

    event_id: str
    workflow_id: str
    execution_id: str
    event_type: str
    actor: str
    timestamp: str
    details: dict[str, Any] = Field(default_factory=dict)
    artifact_id: str = ""


class AuditHistoryResponse(BaseModel):
    """Response for GET /api/v1/approval/history/{workflow_id}."""

    workflow_id: str
    total_events: int
    events: list[AuditHistoryEntry]


# ── Observability Metrics ────────────────────────────────────────────────────

class ApprovalObservabilityMetrics(BaseModel):
    """Tracks approval-layer observability metrics for a workflow."""

    workflow_id: str
    approval_time_seconds: float = 0.0
    reviewer_actions: list[str] = Field(default_factory=list)
    final_status: ApprovalStatus = ApprovalStatus.PENDING
    escalation_count: int = 0
    modification_count: int = 0
    feedback_item_count: int = 0
    average_review_duration_seconds: float = 0.0
