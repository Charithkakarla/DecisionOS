# Contains: service.py implementation.
import time
import uuid
from pathlib import Path

from app.agents.context.providers.base import ContextProvider
from app.agents.context.providers.gemini import GeminiContextProvider
from app.agents.context.providers.grok import GrokContextProvider
from app.agents.context.providers.mock import MockContextProvider
from app.contracts.context import ContextAgent
from app.core.config import settings
from app.schemas.state import WorkflowState, ContextArtifact, AgentExecutionMetadata


class ContextService(ContextAgent):
    def __init__(self) -> None:
        self.provider_name = settings.context_provider.lower()
        self.provider = self._build_provider()

    def _build_provider(self) -> ContextProvider:
        if self.provider_name == "gemini" and settings.gemini_api_key:
            return GeminiContextProvider(api_key=settings.gemini_api_key, model=settings.gemini_model)
        if self.provider_name == "grok" and settings.grok_api_key:
            return GrokContextProvider(
                api_key=settings.grok_api_key,
                model=settings.grok_model,
                base_url=settings.grok_base_url,
            )
        return MockContextProvider()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        start_time = time.time()
        state.execution_logs.append("context: starting context intelligence extraction")
        
        system_prompt = _load_prompt("system.txt")
        user_template = _load_prompt("user.txt")
        user_prompt = user_template.replace("{transcript}", state.transcript)

        extraction = await self.provider.extract(system_prompt=system_prompt, user_prompt=user_prompt)
        payload = extraction.model_dump(mode="json")
        
        state.context_artifact = ContextArtifact(
            artifact_id=str(uuid.uuid4()),
            workflow_id=state.workflow_id,
            agent_name="context",
            schema_version="1.0.0",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
            provider=self.provider.__class__.__name__,
            confidence=0.95,
            payload=payload
        )
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        state.execution_logs.append(
            f"context: extracted enterprise context using {self.provider.__class__.__name__} in {elapsed_ms}ms"
        )
        
        # Calculate execution metadata
        in_chars = len(state.transcript)
        out_chars = len(str(payload))
        input_tokens = in_chars // 4
        output_tokens = out_chars // 4
        total_tokens = input_tokens + output_tokens
        cost = (input_tokens * 0.000000075) + (output_tokens * 0.00000030)
        
        meta = AgentExecutionMetadata(
            agent_name="Context Agent",
            provider=self.provider.__class__.__name__,
            model=settings.gemini_model if self.provider_name == "gemini" else "mock",
            latency_ms=elapsed_ms,
            token_usage={"input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": total_tokens},
            estimated_cost=round(cost, 6),
            started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
            completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            status="completed",
            retry_count=0,
            version="1.0.0"
        )
        state.agent_metadata["context"] = meta
        
        return state


def _load_prompt(filename: str) -> str:
    prompt_path = Path(__file__).resolve().parent / "prompts" / filename
    return prompt_path.read_text(encoding="utf-8")
