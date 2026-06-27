# Contains: service.py implementation.
from pathlib import Path

from app.agents.context.providers.base import ContextProvider
from app.agents.context.providers.gemini import GeminiContextProvider
from app.agents.context.providers.grok import GrokContextProvider
from app.agents.context.providers.mock import MockContextProvider
from app.contracts.context import ContextAgent
from app.core.config import settings
from app.schemas.state import WorkflowState


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
        system_prompt = _load_prompt("system.txt")
        user_template = _load_prompt("user.txt")
        user_prompt = user_template.replace("{transcript}", state.transcript)

        extraction = await self.provider.extract(system_prompt=system_prompt, user_prompt=user_prompt)
        state.extracted_context = extraction.model_dump(mode="json")
        state.execution_logs.append(
            f"context: extracted enterprise context using {self.provider.__class__.__name__}"
        )
        return state


def _load_prompt(filename: str) -> str:
    prompt_path = Path(__file__).resolve().parent / "prompts" / filename
    return prompt_path.read_text(encoding="utf-8")
