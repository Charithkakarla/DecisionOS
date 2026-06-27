# Contains: governance.py implementation.
from typing import Dict, Any

from app.schemas.state import WorkflowState

def verify_governance(state: WorkflowState) -> Dict[str, Any]:
    issues = []
    points = 1.0
    
    # 1. Verify artifacts existence
    required_artifacts = ["context_artifact", "knowledge_artifact", "decision_artifact", "strategy_artifact"]
    for art in required_artifacts:
        val = getattr(state, art, None)
        if not val or not val.payload:
            issues.append(f"Missing required artifact: {art}")
            points -= 0.20
            
    # 2. Check artifact versions match
    if state.context_artifact and state.decision_artifact:
        if state.context_artifact.workflow_id != state.decision_artifact.workflow_id:
            issues.append("Workflow ID mismatch between Context and Decision artifacts")
            points -= 0.1
            
    # 3. Prompt versions tracked
    for name in ["context", "decision", "strategy"]:
        meta = state.agent_metadata.get(name)
        if not meta or not meta.version:
            issues.append(f"Prompt version tracking not recorded for agent: {name}")
            points -= 0.05
            
    # 4. Provider recorded
    for name in ["context", "decision", "strategy"]:
        meta = state.agent_metadata.get(name)
        if not meta or not meta.provider:
            issues.append(f"Model provider not recorded for agent: {name}")
            points -= 0.05
            
    # 5. Execution metadata complete
    for name in ["context", "decision", "strategy"]:
        meta = state.agent_metadata.get(name)
        if not meta or meta.latency_ms == 0.0:
            issues.append(f"Performance latency telemetry missing for agent: {name}")
            points -= 0.05

    # 6. Audit trail complete
    if state.decision_artifact and state.decision_artifact.payload:
        dec = state.decision_artifact.payload
        if not getattr(dec, "audit_trail", None):
            issues.append("DecisionPackage has no audit trail records")
            points -= 0.1

    points = max(0.0, min(1.0, points))
    
    return {
        "governance_score": round(points, 4),
        "governance_issues": issues
    }
