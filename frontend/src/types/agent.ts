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

export interface WorkflowState {
  transcript: string;
  extracted_context: Record<string, unknown> | null;
  relevant_playbooks: string[] | null;
  draft_recommendation: string | null;
  final_action: string | null;
  execution_logs: string[];
  evidence_package: EvidencePackage | null;
  decision_package: DecisionPackage | null;
  
  // Shared Agent Execution tracking
  agent_logs: Record<string, AgentExecutionLog>;
  agent_metadata: Record<string, AgentMetadata>;
}

export type AgentState = WorkflowState;
