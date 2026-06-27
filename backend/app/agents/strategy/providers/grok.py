# Contains: providers/grok.py — Grok LLM provider for Strategy Intelligence Agent.
import json
import logging
from app.agents.strategy.providers.base import StrategyProvider

logger = logging.getLogger("decision_os.strategy.providers.grok")


class GrokStrategyProvider(StrategyProvider):
    def __init__(self, *, api_key: str, model: str, base_url: str) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url

    async def generate_strategy(self, *, system_prompt: str, user_prompt: str) -> dict:
        from openai import AsyncOpenAI

        logger.info(f"Calling Grok Strategy Provider (model={self._model})...")
        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url)

        response = await client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw_text = response.choices[0].message.content or "{}"

        try:
            result = json.loads(raw_text)
        except json.JSONDecodeError as e:
            logger.error(f"Grok returned non-JSON response: {e}. Falling back to mock.")
            from app.agents.strategy.providers.mock import MockStrategyProvider
            return await MockStrategyProvider().generate_strategy(
                system_prompt=system_prompt, user_prompt=user_prompt
            )

        logger.info("Grok Strategy Provider completed successfully.")
        return result
