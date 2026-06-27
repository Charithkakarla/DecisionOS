# Contains: service.py implementation.
import asyncio

from app.contracts.strategy import StrategyAgent
from app.schemas.state import WorkflowState


class MockStrategyAgent(StrategyAgent):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        await asyncio.sleep(0)
        state.final_action = "Proceed with phased execution and daily supervisor check-ins."
        state.execution_logs.append("strategy: finalized action plan")
        return state
