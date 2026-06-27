# Contains: validator.py implementation.
from typing import Dict, Any
from app.schemas.state import WorkflowState

class ReflectionValidationError(Exception):
    pass

def validate_artifacts(state: WorkflowState) -> Dict[str, Any]:
    results = {
        "valid": True,
        "errors": [],
        "warnings": []
    }
    
    # 1. Check basic ids
    if not state.workflow_id:
        results["errors"].append("WorkflowState missing workflow_id")
    if not state.execution_id:
        results["errors"].append("WorkflowState missing execution_id")

    # 2. Check Context Artifact
    if not state.context_artifact or not state.context_artifact.payload:
        results["errors"].append("Missing ContextArtifact payload")
    
    # 3. Check Decision Artifact
    if not state.decision_artifact or not state.decision_artifact.payload:
        results["errors"].append("Missing DecisionArtifact payload")
    else:
        decision_pkg = state.decision_artifact.payload
        # Check Business scores are in range [0, 1]
        for name, val in decision_pkg.business_scores.items():
            if not (0.0 <= val <= 1.0):
                results["errors"].append(f"Decision business score '{name}' out of bounds: {val}")
        
        # Check required fields
        if not decision_pkg.business_goal:
            results["warnings"].append("DecisionPackage business_goal is empty")
        if not decision_pkg.recommendations:
            results["errors"].append("DecisionPackage must contain at least one recommendation")
        else:
            for r in decision_pkg.recommendations:
                if not (0.0 <= r.confidence <= 1.0):
                    results["errors"].append(f"Recommendation '{r.id}' confidence out of bounds: {r.confidence}")
                if r.rank < 1:
                    results["errors"].append(f"Recommendation '{r.id}' has invalid rank: {r.rank}")
    
    # 4. Check Strategy Artifact
    if not state.strategy_artifact or not state.strategy_artifact.payload:
        results["errors"].append("Missing StrategyArtifact payload")
    else:
        strategy_pkg = state.strategy_artifact.payload
        if strategy_pkg.estimated_roi < 0.0:
            results["errors"].append(f"Strategy estimated ROI cannot be negative: {strategy_pkg.estimated_roi}")
        if strategy_pkg.estimated_cost < 0.0:
            results["errors"].append(f"Strategy estimated cost cannot be negative: {strategy_pkg.estimated_cost}")
        if not (0.0 <= strategy_pkg.estimated_success_probability <= 1.0):
            results["errors"].append(f"Strategy success probability out of bounds: {strategy_pkg.estimated_success_probability}")
        if not strategy_pkg.execution_plan:
            results["errors"].append("Strategy execution plan must contain at least one phase")
        for phase in strategy_pkg.execution_plan:
            if phase.duration_days < 1:
                results["errors"].append(f"Execution phase '{phase.name}' has invalid duration: {phase.duration_days}")

    if results["errors"]:
        results["valid"] = False

    return results
