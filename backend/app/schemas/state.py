# Contains: state.py implementation.
from typing import Any
from pydantic import BaseModel, Field

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

# Shared Agent Infrastructure Schema (Sprint 5.5)
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

class WorkflowState(BaseModel):
    transcript: str
    extracted_context: dict[str, Any] | None = None
    relevant_playbooks: list[str] | None = None
    draft_recommendation: str | None = None
    final_action: str | None = None
    execution_logs: list[str] = Field(default_factory=list)
    evidence_package: EvidencePackage | None = None
    decision_package: DecisionPackage | None = None
    
    # Generic execution audit tracking (Sprint 5.5)
    agent_logs: dict[str, AgentExecutionLog] = Field(default_factory=dict)
    agent_metadata: dict[str, AgentMetadata] = Field(default_factory=dict)

# Backward-compatible alias for Phase 1 naming.
AgentState = WorkflowState
