# Contains: providers/grok.py — Grok LLM provider for Strategy Intelligence Agent.
import json
import re
import logging
from app.agents.strategy.providers.base import StrategyProvider

logger = logging.getLogger("decision_os.strategy.providers.grok")


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


class GrokStrategyProvider(StrategyProvider):
    def __init__(self, *, api_key: str, model: str, base_url: str) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url

    async def generate_strategy(self, *, system_prompt: str, user_prompt: str) -> dict:
        from openai import AsyncOpenAI

        logger.info(f"Calling Grok Strategy Provider (model={self._model})...")
        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url)

        json_system = system_prompt + "\n\nYou MUST respond with valid JSON only. No markdown, no explanation."
        response = await client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": json_system},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )
        raw_text = response.choices[0].message.content or "{}"

        try:
            result = _extract_json(raw_text)
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"Grok returned non-JSON response: {e}. Falling back to mock.")
            from app.agents.strategy.providers.mock import MockStrategyProvider
            return await MockStrategyProvider().generate_strategy(
                system_prompt=system_prompt, user_prompt=user_prompt
            )

        logger.info("Grok Strategy Provider completed successfully.")
        return result
