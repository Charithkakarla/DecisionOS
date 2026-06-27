# Contains: service.py implementation.
from app.agents.planner.registry import agent_registry
from app.agents.planner.router import next_step
from app.agents.planner.schemas import PlannerConfig
from app.agents.planner.tools import has_empty_transcript
from app.schemas.state import WorkflowState, WorkflowEvent


_ARTIFACT_NAMES: dict[str, str] = {
    "context": "ContextArtifact",
    "knowledge": "KnowledgeArtifact",
    "decision": "DecisionArtifact",
    "strategy": "StrategyArtifact",
    "reflection": "ReflectionArtifact",
    "approval": "ApprovalArtifact",
}


def _now_iso() -> str:
    import datetime

    return datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _extract_agent_event_fields(state: WorkflowState, step: str) -> tuple[str, float, str]:
    artifact_map = {
        "context": state.context_artifact,
        "knowledge": state.knowledge_artifact,
        "decision": state.decision_artifact,
        "strategy": state.strategy_artifact,
        "reflection": state.reflection_artifact,
        "approval": state.approval_artifact,
    }
    artifact = artifact_map.get(step)

    confidence = 0.0
    provider = ""
    if artifact:
        confidence = artifact.confidence
        provider = artifact.provider

    metadata = state.agent_metadata.get(step)
    if metadata:
        provider = metadata.provider or provider

    return _ARTIFACT_NAMES.get(step, ""), confidence, provider


class PlannerService:
    def __init__(self, config: PlannerConfig | None = None) -> None:
        self.config = config or PlannerConfig()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        import time
        import uuid

        if not state.workflow_id:
            state.workflow_id = f"wf-{uuid.uuid4().hex[:8]}"
        if not state.execution_id:
            state.execution_id = f"exec-{uuid.uuid4().hex[:8]}"

        if not state.execution_logs:
            state.execution_logs.append(f"planner: initialized agentic loop for workflow {state.workflow_id} (exec: {state.execution_id})")

        state.workflow_events.append(
            WorkflowEvent(
                event_type="WorkflowStarted",
                timestamp=_now_iso(),
                agent="planner",
                duration_ms=0,
                status="completed",
                artifact_produced="WorkflowExecution",
                confidence=1.0,
                provider="PlannerService",
                details={"workflow_id": state.workflow_id, "execution_id": state.execution_id},
            )
        )

        for _ in range(self.config.max_steps):
            if has_empty_transcript(state):
                state.execution_logs.append("planner: transcript missing, terminating")
                state.final_action = "No action: transcript is empty."
                state.workflow_events.append(
                    WorkflowEvent(
                        event_type="WorkflowTerminated",
                        timestamp=_now_iso(),
                        agent="planner",
                        duration_ms=0,
                        status="failed",
                        artifact_produced="",
                        confidence=0.0,
                        provider="PlannerService",
                        details={"reason": "empty_transcript"},
                    )
                )
                break

            step = next_step(state)
            if not step:
                state.execution_logs.append("planner: workflow complete")
                # Register final state in approval router cache for history/timeline endpoints
                from app.agents.approval.router import register_workflow_state
                register_workflow_state(state.workflow_id, state)
                state.workflow_events.append(
                    WorkflowEvent(
                        event_type="WorkflowCompleted",
                        timestamp=_now_iso(),
                        agent="planner",
                        duration_ms=0,
                        status="completed",
                        artifact_produced="WorkflowExecution",
                        confidence=1.0,
                        provider="PlannerService",
                    )
                )
                break

            agent = agent_registry.get(step)
            if not agent:
                state.execution_logs.append(f"planner: error - no agent registered for step '{step}'")
                state.workflow_events.append(
                    WorkflowEvent(
                        event_type=f"{step.capitalize()}Failed",
                        timestamp=_now_iso(),
                        agent=step,
                        duration_ms=0,
                        status="failed",
                        artifact_produced="",
                        confidence=0.0,
                        provider="",
                        details={"reason": "agent_not_registered"},
                    )
                )
                break

            state.execution_logs.append(f"planner: dispatching {step} worker")
            step_start = time.time()

            try:
                state = await agent.execute(state)
                status = state.agent_metadata.get(step).status if state.agent_metadata.get(step) else "completed"
            except Exception:
                duration_ms = int((time.time() - step_start) * 1000)
                state.workflow_events.append(
                    WorkflowEvent(
                        event_type=f"{step.capitalize()}Failed",
                        timestamp=_now_iso(),
                        agent=step,
                        duration_ms=duration_ms,
                        status="failed",
                        artifact_produced="",
                        confidence=0.0,
                        provider="",
                        details={"reason": "unhandled_exception"},
                    )
                )
                raise

            duration_ms = int((time.time() - step_start) * 1000)
            artifact_name, confidence, provider = _extract_agent_event_fields(state, step)
            event_suffix = "Completed" if status == "completed" else "Failed"
            state.workflow_events.append(
                WorkflowEvent(
                    event_type=f"{step.capitalize()}{event_suffix}",
                    timestamp=_now_iso(),
                    agent=step,
                    duration_ms=duration_ms,
                    status=status,
                    artifact_produced=artifact_name,
                    confidence=confidence,
                    provider=provider,
                )
            )
            continue

        else:
            state.execution_logs.append("planner: max loop steps reached")
            if state.final_action is None:
                state.final_action = "No action: planner reached safety limit."
            state.workflow_events.append(
                WorkflowEvent(
                    event_type="WorkflowTerminated",
                    timestamp=_now_iso(),
                    agent="planner",
                    duration_ms=0,
                    status="failed",
                    artifact_produced="",
                    confidence=0.0,
                    provider="PlannerService",
                    details={"reason": "max_steps_reached"},
                )
            )

        return state
