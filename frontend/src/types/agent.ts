// Contains: agent.ts implementation.
export interface KnowledgeResult {
  id: string;
  document_name: string;
  section: string | null;
  page: number | null;
  content: string;
  similarity_score: number;
  citation: string;
  source_type: string;
}

export interface EvidencePackage {
  knowledge_results: KnowledgeResult[];
  citations: string[];
  confidence_score: number;
  evidence_metadata: Record<string, any>[];
}

export interface AgentMetadata {
  execution_time_ms: number;
  latency_ms: number;
  provider: string;
  token_usage: Record<string, number>;
  retry_count: number;
  status: string;
  cost: number;
}

export interface AgentExecutionLog {
  agent_name: string;
  started: string;
  completed: string;
  duration_ms: number;
  provider: string;
  prompt_version: string;
  confidence: number;
  warnings: string[];
  errors: string[];
  evidence_count: number;
}

export interface AgentExecutionMetadata {
  agent_name: string;
  provider: string;
  model: string;
  latency_ms: number;
  token_usage: Record<string, number>;
  estimated_cost: number;
  started_at: string;
  completed_at: string;
  status: string;
  retry_count: number;
  version: string;
}

export interface WorkflowEvent {
  event_type: string;
  timestamp: string;
  agent: string;
  duration_ms: number;
  status: string;
  artifact_produced: string;
  confidence: number;
  provider: string;
  details: Record<string, unknown>;
}

export interface Recommendation {
  id: string;
  rank: number;
  title: string;
  description: string;
  reasoning: string;
  benefits: string[];
  tradeoffs: string[];
  risks: string[];
  risk_level: "High" | "Medium" | "Low";
  timeline: string;
  required_resources: string[];
  kpis: string[];
  confidence: number;
  evidence_ids: string[];
  why_this_recommendation: string;
  supporting_evidence: string;
  citation: string;
  retrieval_reason: string;
  document_source: string;
  similarity_score: number;
  assumptions_made: string[];
}

export interface DecisionAnalysis {
  business_goal: string;
  customer_intent: string;
  buying_stage: string;
  business_problem: string;
  decision_readiness: number;
  opportunity_score: number;
  risk_score: number;
  priority_score: number;
  business_value_score: number;
  confidence_score: number;
  estimated_revenue: number;
  estimated_time_to_close: number;
  stakeholders: string[];
  business_risks: string[];
  business_opportunities: string[];
  missing_information: string[];
  recommended_actions: Recommendation[];
  reasoning_summary: string;
  evidence_used: string[];
  affected_kpis: string[];
  next_required_information: string[];
}

export interface TraceableEvidence {
  document_id: string;
  chunk_id: string;
  similarity_score: number;
  quoted_evidence: string;
  confidence: number;
}

export interface DecisionPackage {
  executive_summary: string;
  business_goal: string;
  assumptions: string[];
  constraints: string[];
  tradeoffs: string[];
  decision_reasoning: string;
  business_scores: Record<string, number>;
  confidence: {
    overall_confidence: number;
    dimension_scores?: Record<string, number>;
    confidence_reasoning: string;
  };
  confidence_split: Record<string, number>;
  recommendations: Recommendation[];
  missing_information: string[];
  evidence_used: TraceableEvidence[];
  generated_at: string;
  schema_version: string;
  
  // Backward-compatible fields
  analysis?: DecisionAnalysis;
  evidence?: Record<string, any>[];
  execution_metadata?: {
    provider_used: string;
    execution_time_ms: number;
    evidence_count: number;
    timestamp: string;
  };
  audit_trail?: string[];
}

// ── Sprint 6 — Strategy Intelligence Agent types ──────────────────────────────

export interface ExecutionPhase {
  name: string;
  description: string;
  duration_days: number;
  milestones: string[];
  owner: string;
  dependencies: string[];
  status: "planned" | "in_progress" | "completed" | "blocked";
}

export interface ScenarioOutcome {
  scenario_type: "optimistic" | "realistic" | "conservative";
  expected_roi: number;
  success_probability: number;
  timeline_days: number;
  estimated_cost: number;
  key_risks: string[];
  success_criteria: string[];
  revenue_impact: number;
  operational_savings: number;
  customer_retention_impact: number;
}

export interface BusinessImpactAnalysis {
  revenue_increase: number;
  operational_savings: number;
  customer_retention: number;
  risk_reduction: number;
  productivity_improvement: number;
  decision_cycle_reduction: number;
  revenue_increase_explanation: string;
  operational_savings_explanation: string;
}

export interface StrategyPackage {
  selected_strategy: string;
  alternative_strategies: string[];
  business_rationale: string;
  expected_business_outcome: string;
  estimated_success_probability: number;
  estimated_roi: number;
  implementation_complexity: "Low" | "Medium" | "High";
  implementation_timeline: string;
  estimated_cost: number;
  business_impact: BusinessImpactAnalysis;
  execution_plan: ExecutionPhase[];
  dependencies: string[];
  risks: string[];
  mitigation_plan: string[];
  required_resources: string[];
  stakeholder_plan: string[];
  priority: "Critical" | "High" | "Medium" | "Low";
  confidence: number;
  supporting_evidence: string[];
  execution_metadata: Record<string, unknown>;
  scenarios: ScenarioOutcome[];
  selected_scenario: "optimistic" | "realistic" | "conservative";
  schema_version: string;
  generated_at: string;
}

// ── Sprint 7 Artifact Types ──────────────────────────────────────────────────

export interface BaseArtifact<T> {
  artifact_id: string;
  workflow_id: string;
  agent_name: string;
  schema_version: string;
  created_at: string;
  provider: string;
  confidence: number;
  metadata: Record<string, any>;
  payload: T;
}

export type ContextArtifact = BaseArtifact<Record<string, any>>;
export type KnowledgeArtifact = BaseArtifact<EvidencePackage>;
export type DecisionArtifact = BaseArtifact<DecisionPackage>;
export type StrategyArtifact = BaseArtifact<StrategyPackage>;
export interface ReflectionPayload {
  validation_status: "passed" | "failed";
  overall_trust_score: number;
  overall_confidence: number;
  evidence_coverage: number;
  business_alignment_score: number;
  strategy_consistency_score: number;
  hallucination_risk: number;
  governance_score: number;
  explainability_score: number;
  audit_summary: string;
  warnings: string[];
  critical_findings: string[];
  missing_information: string[];
  contradictions: string[];
  unsupported_claims: string[];
  improvement_suggestions: string[];
  validation_timestamp: string;
  validation_version: string;
  supporting_evidence: Record<string, any>[];
  execution_metadata: {
    explainability_summary: string;
    why_selected: string;
    why_alternatives_rejected: string;
    evidence_influence: string;
    business_reasoning_summary: string;
  };
}

export type ReflectionArtifact = BaseArtifact<ReflectionPayload>;
export type LearningArtifact = BaseArtifact<Record<string, any>>;

// ── Sprint 8 — Human Approval & Enterprise Governance Layer types ─────────

export type ApprovalStatusType = "approved" | "modified" | "escalated" | "rejected" | "pending";

export interface FeedbackItem {
  section: string;
  original_value: string;
  corrected_value: string;
  comment: string;
  feedback_type: "correction" | "addition" | "deletion" | "note";
}

export interface ModifiedSection {
  section: string;
  before: string;
  after: string;
  change_reason: string;
}

export interface ApprovalPayload {
  approval_status: ApprovalStatusType;
  reviewer: string;
  review_timestamp: string;
  approval_comments: string;
  approval_reason: string;
  modified_sections: ModifiedSection[];
  escalation_required: boolean;
  escalation_reason: string;
  escalated_to: string;
  feedback_items: FeedbackItem[];
  review_duration_seconds: number;
  approval_confidence: number;
  business_owner: string;
  department: string;
  workflow_report_reference: string;
  decision_reference: string;
  strategy_reference: string;
  reflection_reference: string;
  execution_metadata: Record<string, unknown>;
  trust_score_at_review: number;
  governance_score_at_review: number;
  hallucination_risk_at_review: number;
  schema_version: string;
}

export type ApprovalArtifact = BaseArtifact<ApprovalPayload>;

export interface ApprovalSubmitRequest {
  workflow_id: string;
  execution_id: string;
  reviewer: string;
  approval_comments: string;
  approval_reason: string;
  approval_confidence: number;
  business_owner: string;
  department: string;
  review_duration_seconds: number;
  feedback_items: FeedbackItem[];
  state_snapshot: Record<string, unknown>;
}

export interface ApprovalModifyRequest {
  workflow_id: string;
  execution_id: string;
  reviewer: string;
  approval_comments: string;
  modified_sections: ModifiedSection[];
  approval_confidence: number;
  business_owner: string;
  department: string;
  review_duration_seconds: number;
  feedback_items: FeedbackItem[];
  state_snapshot: Record<string, unknown>;
}

export interface ApprovalEscalateRequest {
  workflow_id: string;
  execution_id: string;
  reviewer: string;
  escalated_to: string;
  escalation_reason: string;
  approval_comments: string;
  business_owner: string;
  department: string;
  state_snapshot: Record<string, unknown>;
}

export interface ApprovalRejectRequest {
  workflow_id: string;
  execution_id: string;
  reviewer: string;
  approval_comments: string;
  approval_reason: string;
  business_owner: string;
  department: string;
  feedback_items: FeedbackItem[];
  state_snapshot: Record<string, unknown>;
}

export interface ApprovalResponse {
  success: boolean;
  approval_status: ApprovalStatusType;
  artifact_id: string;
  workflow_id: string;
  execution_id: string;
  message: string;
  learning_queue_id: string;
}

export interface AuditHistoryEntry {
  event_id: string;
  workflow_id: string;
  execution_id: string;
  event_type: string;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
  artifact_id: string;
}

export interface AuditHistoryResponse {
  workflow_id: string;
  total_events: number;
  events: AuditHistoryEntry[];
}

export interface TimelineStep {
  step: number;
  agent: string;
  label: string;
  timestamp: string;
  status: string;
  artifact_type: string;
  confidence: number;
  provider: string;
  duration_ms: number;
  reviewer: string | null;
}

export interface WorkflowState {
  workflow_id?: string;
  execution_id?: string;
  transcript: string;
  
  context_artifact: ContextArtifact | null;
  knowledge_artifact: KnowledgeArtifact | null;
  decision_artifact: DecisionArtifact | null;
  strategy_artifact: StrategyArtifact | null;
  reflection_artifact: ReflectionArtifact | null;
  approval_artifact: ApprovalArtifact | null;
  learning_artifact: LearningArtifact | null;

  execution_logs: string[];
  workflow_events: WorkflowEvent[];
  draft_recommendation: string | null;
  final_action: string | null;

  agent_logs: Record<string, AgentExecutionLog>; // kept for backward compatibility
  agent_metadata: Record<string, AgentExecutionMetadata>;
}

export type AgentState = WorkflowState;
