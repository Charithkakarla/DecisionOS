# Contains: workflow.py implementation.
from app.agents.planner.service import PlannerService
from app.schemas.state import WorkflowState


async def run_workflow(state: WorkflowState) -> WorkflowState:
    planner = PlannerService()
    return await planner.execute(state)
