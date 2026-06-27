# Contains: service.py implementation.
from app.agents.planner.registry import agent_registry
from app.agents.planner.router import next_step
from app.agents.planner.schemas import PlannerConfig
from app.agents.planner.tools import has_empty_transcript
from app.schemas.state import WorkflowState


class PlannerService:
    def __init__(self, config: PlannerConfig | None = None) -> None:
        self.config = config or PlannerConfig()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        if not state.execution_logs:
            state.execution_logs.append("planner: initialized agentic loop")

        for _ in range(self.config.max_steps):
            if has_empty_transcript(state):
                state.execution_logs.append("planner: transcript missing, terminating")
                state.final_action = "No action: transcript is empty."
                break

            step = next_step(state)
            if not step:
                state.execution_logs.append("planner: workflow complete")
                break

            agent = agent_registry.get(step)
            if not agent:
                state.execution_logs.append(f"planner: error - no agent registered for step '{step}'")
                break

            state.execution_logs.append(f"planner: dispatching {step} worker")
            state = await agent.execute(state)
            continue

        else:
            state.execution_logs.append("planner: max loop steps reached")
            if state.final_action is None:
                state.final_action = "No action: planner reached safety limit."

        return state
