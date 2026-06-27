# Contains: router.py implementation.
from app.agents.context.router import should_execute as should_run_context
from app.agents.decision.router import should_execute as should_run_decision
from app.agents.knowledge.router import should_execute as should_run_knowledge
from app.agents.strategy.router import should_execute as should_run_strategy
from app.agents.reflection.router import should_execute as should_run_reflection
from app.agents.approval.router import should_execute as should_run_approval
from app.agents.learning.router import should_execute as should_run_learning
from app.schemas.state import WorkflowState

def next_step(state: WorkflowState) -> str | None:
    if should_run_context(state):
        return "context"
    if should_run_knowledge(state):
        return "knowledge"
    if should_run_decision(state):
        return "decision"
    if should_run_strategy(state):
        return "strategy"
    if should_run_reflection(state):
        return "reflection"
    if should_run_approval(state):
        return "approval"
    if should_run_learning(state):
        return "learning"
    return None
