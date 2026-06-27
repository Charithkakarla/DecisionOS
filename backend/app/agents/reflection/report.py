# Contains: report.py implementation.
from typing import Dict, Any, List
from pydantic import BaseModel, Field

class WorkflowReport(BaseModel):
    workflow_id: str
    execution_id: str
    executive_summary: str = ""
    business_context: Dict[str, Any] = Field(default_factory=dict)
    evidence_used: List[Dict[str, Any]] = Field(default_factory=list)
    decision_summary: Dict[str, Any] = Field(default_factory=dict)
    strategy_summary: Dict[str, Any] = Field(default_factory=dict)
    reflection_summary: Dict[str, Any] = Field(default_factory=dict)
    overall_trust_score: float = 0.0
    governance_score: float = 0.0
    audit_findings: Dict[str, Any] = Field(default_factory=dict)
    execution_metadata: Dict[str, Any] = Field(default_factory=dict)
    artifact_versions: Dict[str, str] = Field(default_factory=dict)
    final_recommendation: str = ""

def generate_report(state: Any) -> WorkflowReport:
    workflow_id = state.workflow_id
    execution_id = state.execution_id
    
    context = state.context_artifact.payload if state.context_artifact else {}
    
    evidence = []
    if state.knowledge_artifact and state.knowledge_artifact.payload:
        for res in state.knowledge_artifact.payload.knowledge_results:
            evidence.append({
                "document": res.document_name,
                "page": res.page,
                "section": res.section,
                "content_snippet": res.content[:150] + "..." if len(res.content) > 150 else res.content
            })
            
    decision = {}
    if state.decision_artifact and state.decision_artifact.payload:
        dec = state.decision_artifact.payload
        decision = {
            "business_goal": dec.business_goal,
            "decision_reasoning": dec.decision_reasoning,
            "recommendations": [r.title for r in dec.recommendations]
        }
        
    strategy = {}
    if state.strategy_artifact and state.strategy_artifact.payload:
        strat = state.strategy_artifact.payload
        strategy = {
            "selected_strategy": strat.selected_strategy,
            "business_rationale": strat.business_rationale,
            "estimated_roi": strat.estimated_roi,
            "estimated_cost": strat.estimated_cost,
            "implementation_timeline": strat.implementation_timeline
        }
        
    reflection = {}
    overall_trust = 0.0
    gov_score = 0.0
    audit_findings = {}
    if state.reflection_artifact and state.reflection_artifact.payload:
        ref = state.reflection_artifact.payload
        reflection = {
            "validation_status": ref.validation_status,
            "audit_summary": ref.audit_summary,
            "explainability_summary": ref.execution_metadata.get("explainability_summary", "")
        }
        overall_trust = ref.overall_trust_score
        gov_score = ref.governance_score
        audit_findings = {
            "verdict": ref.audit_summary,
            "warnings": ref.warnings,
            "critical_findings": ref.critical_findings,
            "improvement_suggestions": ref.improvement_suggestions
        }
        
    meta = {}
    for agent_name, agent_meta in state.agent_metadata.items():
        meta[agent_name] = {
            "provider": agent_meta.provider,
            "latency_ms": agent_meta.latency_ms,
            "cost": agent_meta.estimated_cost
        }
        
    versions = {
        "context": state.context_artifact.schema_version if state.context_artifact else "1.0.0",
        "knowledge": state.knowledge_artifact.schema_version if state.knowledge_artifact else "1.0.0",
        "decision": state.decision_artifact.schema_version if state.decision_artifact else "1.0.0",
        "strategy": state.strategy_artifact.schema_version if state.strategy_artifact else "1.0.0",
        "reflection": state.reflection_artifact.schema_version if state.reflection_artifact else "1.0.0",
    }
    
    return WorkflowReport(
        workflow_id=workflow_id,
        execution_id=execution_id,
        executive_summary=reflection.get("audit_summary", "Autonomous workflow completed. Strategy generated and queued for human audit."),
        business_context=context,
        evidence_used=evidence,
        decision_summary=decision,
        strategy_summary=strategy,
        reflection_summary=reflection,
        overall_trust_score=overall_trust,
        governance_score=gov_score,
        audit_findings=audit_findings,
        execution_metadata=meta,
        artifact_versions=versions,
        final_recommendation=state.final_action or ""
    )
