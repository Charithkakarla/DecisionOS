# Contains: service.py implementation.
import time
import uuid
import logging
from pathlib import Path

from app.agents.context.providers.base import ContextProvider
from app.agents.context.providers.gemini import GeminiContextProvider
from app.agents.context.providers.grok import GrokContextProvider
from app.agents.context.providers.mock import MockContextProvider
from app.contracts.context import ContextAgent
from app.core.config import settings
from app.core.provider_utils import is_retryable_error, log_fallback
from app.schemas.state import WorkflowState, ContextArtifact, AgentExecutionMetadata

logger = logging.getLogger("decision_os.context.service")


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

    def _grok_provider(self) -> ContextProvider | None:
        if settings.grok_api_key:
            return GrokContextProvider(
                api_key=settings.grok_api_key,
                model=settings.grok_model,
                base_url=settings.grok_base_url,
            )
        return None

    async def execute(self, state: WorkflowState) -> WorkflowState:
        start_time = time.time()
        state.execution_logs.append("context: starting context intelligence extraction")

        system_prompt = _load_prompt("system.txt")
        user_template = _load_prompt("user.txt")
        user_prompt = user_template.replace("{transcript}", state.transcript)

        provider_used = self.provider
        provider_label = provider_used.__class__.__name__

        try:
            extraction = await provider_used.extract(system_prompt=system_prompt, user_prompt=user_prompt)
        except Exception as exc:
            if is_retryable_error(exc):
                # Try Grok fallback
                grok = self._grok_provider()
                if grok:
                    log_fallback("context", provider_label, "GrokContextProvider", exc)
                    state.execution_logs.append("context: Gemini quota exceeded — falling back to Grok")
                    provider_used = grok
                    provider_label = "GrokContextProvider"
                    extraction = await provider_used.extract(system_prompt=system_prompt, user_prompt=user_prompt)
                else:
                    log_fallback("context", provider_label, "MockContextProvider", exc)
                    state.execution_logs.append("context: quota exceeded, no Grok key — falling back to Mock")
                    provider_used = MockContextProvider()
                    provider_label = "MockContextProvider"
                    extraction = await provider_used.extract(system_prompt=system_prompt, user_prompt=user_prompt)
            else:
                raise
        payload = extraction.model_dump(mode="json")

        state.context_artifact = ContextArtifact(
            artifact_id=str(uuid.uuid4()),
            workflow_id=state.workflow_id,
            agent_name="context",
            schema_version="1.0.0",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
            provider=provider_label,
            confidence=0.95,
            payload=payload
        )

        elapsed_ms = int((time.time() - start_time) * 1000)
        state.execution_logs.append(
            f"context: extracted enterprise context using {provider_label} in {elapsed_ms}ms"
        )

        in_chars = len(state.transcript)
        out_chars = len(str(payload))
        input_tokens = in_chars // 4
        output_tokens = out_chars // 4
        total_tokens = input_tokens + output_tokens
        cost = (input_tokens * 0.000000075) + (output_tokens * 0.00000030)

        meta = AgentExecutionMetadata(
            agent_name="Context Agent",
            provider=provider_label,
            model=settings.gemini_model if "Gemini" in provider_label else settings.grok_model if "Grok" in provider_label else "mock",
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
