# Contains: state.py implementation.
from typing import Any
from pydantic import BaseModel, Field
from app.agents.reflection.schemas import ReflectionPayload

class KnowledgeResult(BaseModel):
    id: str
    document_name: str
    section: str | None = None
    page: int | None = None
    content: str
    similarity_score: float
    citation: str
    source_type: str

class EvidencePackage(BaseModel):
    knowledge_results: list[KnowledgeResult] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    confidence_score: float = 0.0
    evidence_metadata: list[dict[str, Any]] = Field(default_factory=list)

# Shared Agent Infrastructure Schema (Sprint 5.5) - kept for backward compatibility
class AgentMetadata(BaseModel):
    execution_time_ms: float = 0.0
    latency_ms: float = 0.0
    provider: str = ""
    token_usage: dict[str, int] = Field(default_factory=dict) # input, output, total
    retry_count: int = 0
    status: str = "completed"
    cost: float = 0.0

class AgentExecutionLog(BaseModel):
    agent_name: str
    started: str
    completed: str
    duration_ms: float
    provider: str
    prompt_version: str
    confidence: float
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    evidence_count: int = 0

# Sprint 7.1 Unified Agent Execution Metadata
class AgentExecutionMetadata(BaseModel):
    agent_name: str
    provider: str = ""
    model: str = ""
    latency_ms: float = 0.0
    token_usage: dict[str, int] = Field(default_factory=dict) # input_tokens, output_tokens, total_tokens
    estimated_cost: float = 0.0
    started_at: str = ""
    completed_at: str = ""
    status: str = "completed" # completed, failed, running
    retry_count: int = 0
    version: str = "1.0.0"

# Expanded Recommendation Schema (Sprint 5)
class Recommendation(BaseModel):
    id: str
    rank: int
    title: str
    description: str
    reasoning: str
    benefits: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    risk_level: str = Field(default="Medium", pattern="^(High|Medium|Low)$")
    timeline: str = ""
    required_resources: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_ids: list[str] = Field(default_factory=list)
    why_this_recommendation: str
    supporting_evidence: str
    citation: str
    retrieval_reason: str
    document_source: str
    similarity_score: float
    assumptions_made: list[str] = Field(default_factory=list)

# Core Decision Analysis attributes
class DecisionAnalysis(BaseModel):
    business_goal: str
    customer_intent: str
    buying_stage: str
    business_problem: str
    decision_readiness: float = Field(ge=0.0, le=1.0)
    opportunity_score: float = Field(ge=0.0, le=1.0)
    risk_score: float = Field(ge=0.0, le=1.0)
    priority_score: float = Field(ge=0.0, le=1.0)
    business_value_score: float = Field(ge=0.0, le=1.0)
    confidence_score: float = Field(ge=0.0, le=1.0)
    estimated_revenue: float = Field(default=0.0, ge=0.0)
    estimated_time_to_close: int = Field(default=30, ge=0)
    stakeholders: list[str] = Field(default_factory=list)
    business_risks: list[str] = Field(default_factory=list)
    business_opportunities: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    recommended_actions: list[Recommendation] = Field(default_factory=list)
    reasoning_summary: str
    evidence_used: list[str] = Field(default_factory=list)
    affected_kpis: list[str] = Field(default_factory=list)
    next_required_information: list[str] = Field(default_factory=list)

# Expanded Decision Package Schema (Sprint 5)
class DecisionPackage(BaseModel):
    executive_summary: str = ""
    business_goal: str = ""
    assumptions: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)
    decision_reasoning: str = ""
    business_scores: dict[str, float] = Field(default_factory=dict)
    confidence: dict[str, Any] = Field(default_factory=dict)
    confidence_split: dict[str, float] = Field(default_factory=dict) # Overall, Evidence, Context, Provider, Decision
    recommendations: list[Recommendation] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    evidence_used: list[dict[str, Any]] = Field(default_factory=list) # Traceable evidence (Document ID, Chunk ID, similarity, Quote, confidence)
    generated_at: str = ""
    schema_version: str = "1.1.0"
    
    # Kept for backward compatibility
    analysis: DecisionAnalysis | None = None
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    execution_metadata: dict[str, Any] = Field(default_factory=dict)
    audit_trail: list[str] = Field(default_factory=list)

# Sprint 6 — Strategy Intelligence Agent Schemas
class ExecutionPhase(BaseModel):
    """A single phase in the strategy execution roadmap."""
    name: str
    description: str
    duration_days: int = Field(ge=1)
    milestones: list[str] = Field(default_factory=list)
    owner: str = ""
    dependencies: list[str] = Field(default_factory=list)
    status: str = Field(default="planned", pattern="^(planned|in_progress|completed|blocked)$")

class ScenarioOutcome(BaseModel):
    """One of three strategic planning scenarios (Optimistic / Realistic / Conservative)."""
    scenario_type: str = Field(pattern="^(optimistic|realistic|conservative)$")
    expected_roi: float = Field(ge=0.0)
    success_probability: float = Field(ge=0.0, le=1.0)
    timeline_days: int = Field(ge=1)
    estimated_cost: float = Field(ge=0.0)
    key_risks: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)
    revenue_impact: float = 0.0
    operational_savings: float = 0.0
    customer_retention_impact: float = 0.0

class BusinessImpactAnalysis(BaseModel):
    """Structured business impact breakdown across key dimensions."""
    revenue_increase: float = 0.0
    operational_savings: float = 0.0
    customer_retention: float = 0.0        # 0–1 fraction
    risk_reduction: float = 0.0            # 0–1 fraction
    productivity_improvement: float = 0.0  # 0–1 fraction
    decision_cycle_reduction: float = 0.0  # days saved
    revenue_increase_explanation: str = ""
    operational_savings_explanation: str = ""

class StrategyPackage(BaseModel):
    """The primary output of the Strategy Intelligence Agent."""
    selected_strategy: str = ""
    alternative_strategies: list[str] = Field(default_factory=list)
    business_rationale: str = ""
    expected_business_outcome: str = ""
    estimated_success_probability: float = Field(default=0.0, ge=0.0, le=1.0)
    estimated_roi: float = Field(default=0.0, ge=0.0)
    implementation_complexity: str = Field(default="Medium", pattern="^(Low|Medium|High)$")
    implementation_timeline: str = ""
    estimated_cost: float = Field(default=0.0, ge=0.0)
    business_impact: BusinessImpactAnalysis = Field(default_factory=BusinessImpactAnalysis)
    execution_plan: list[ExecutionPhase] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    mitigation_plan: list[str] = Field(default_factory=list)
    required_resources: list[str] = Field(default_factory=list)
    stakeholder_plan: list[str] = Field(default_factory=list)
    priority: str = Field(default="High", pattern="^(Critical|High|Medium|Low)$")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    supporting_evidence: list[str] = Field(default_factory=list)
    execution_metadata: dict[str, Any] = Field(default_factory=dict)
    scenarios: list[ScenarioOutcome] = Field(default_factory=list)
    selected_scenario: str = Field(default="realistic", pattern="^(optimistic|realistic|conservative)$")
    schema_version: str = "1.0.0"
    generated_at: str = ""

# --- Sprint 7 Artifact System Schemas ---

class BaseArtifact(BaseModel):
    artifact_id: str
    workflow_id: str
    agent_name: str
    schema_version: str = "1.0.0"
    created_at: str
    provider: str
    confidence: float = 0.0
    metadata: dict[str, Any] = Field(default_factory=dict)

class ContextArtifact(BaseArtifact):
    payload: dict[str, Any]

class KnowledgeArtifact(BaseArtifact):
    payload: EvidencePackage

class DecisionArtifact(BaseArtifact):
    payload: DecisionPackage

class StrategyArtifact(BaseArtifact):
    payload: StrategyPackage

class ReflectionArtifact(BaseArtifact):
    payload: ReflectionPayload

class ApprovalArtifact(BaseArtifact):
    payload: dict[str, Any]

class LearningPayload(BaseModel):
    learning_summary: str = ""
    organizational_insights: list[str] = Field(default_factory=list)
    accepted_patterns: list[str] = Field(default_factory=list)
    rejected_patterns: list[str] = Field(default_factory=list)
    strategy_success_patterns: list[str] = Field(default_factory=list)
    common_risks: list[str] = Field(default_factory=list)
    common_failures: list[str] = Field(default_factory=list)
    reviewer_preferences: list[str] = Field(default_factory=list)
    prompt_improvement_suggestions: list[str] = Field(default_factory=list)
    knowledge_gaps: list[str] = Field(default_factory=list)
    recommended_playbook_updates: list[str] = Field(default_factory=list)
    performance_trends: dict[str, Any] = Field(default_factory=dict)
    organizational_memory_reference: str = ""
    learning_timestamp: str = ""
    execution_metadata: dict[str, Any] = Field(default_factory=dict)

class LearningArtifact(BaseArtifact):
    payload: LearningPayload


class WorkflowEvent(BaseModel):
    event_type: str
    timestamp: str
    agent: str
    duration_ms: int = 0
    status: str = "completed"
    artifact_produced: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    provider: str = ""
    details: dict[str, Any] = Field(default_factory=dict)

class WorkflowState(BaseModel):
    workflow_id: str = ""
    execution_id: str = ""
    transcript: str
    
    # Artifact fields replacing packages
    context_artifact: ContextArtifact | None = None
    knowledge_artifact: KnowledgeArtifact | None = None
    decision_artifact: DecisionArtifact | None = None
    strategy_artifact: StrategyArtifact | None = None
    reflection_artifact: ReflectionArtifact | None = None
    approval_artifact: ApprovalArtifact | None = None
    learning_artifact: LearningArtifact | None = None

    execution_logs: list[str] = Field(default_factory=list)
    workflow_events: list[WorkflowEvent] = Field(default_factory=list)
    draft_recommendation: str | None = None
    final_action: str | None = None

    # Performance audit metadata tracking (Unified metadata)
    agent_logs: dict[str, AgentExecutionLog] = Field(default_factory=dict) # kept for backwards compatibility
    agent_metadata: dict[str, AgentExecutionMetadata] = Field(default_factory=dict)

    # Legacy attributes properties for backwards compatibility in python code
    @property
    def extracted_context(self) -> dict[str, Any] | None:
        return self.context_artifact.payload if self.context_artifact else None

    @property
    def relevant_playbooks(self) -> list[str] | None:
        if self.knowledge_artifact and self.knowledge_artifact.payload:
            return list(set([res.document_name for res in self.knowledge_artifact.payload.knowledge_results]))
        return None

    @property
    def evidence_package(self) -> EvidencePackage | None:
        return self.knowledge_artifact.payload if self.knowledge_artifact else None

    @property
    def decision_package(self) -> DecisionPackage | None:
        return self.decision_artifact.payload if self.decision_artifact else None

    @property
    def strategy_package(self) -> StrategyPackage | None:
        return self.strategy_artifact.payload if self.strategy_artifact else None

# Backward-compatible alias.
AgentState = WorkflowState
