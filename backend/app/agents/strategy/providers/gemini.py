# Contains: providers/gemini.py — Gemini LLM provider for Strategy Intelligence Agent.
import json
import logging
from app.agents.strategy.providers.base import StrategyProvider

logger = logging.getLogger("decision_os.strategy.providers.gemini")


class GeminiStrategyProvider(StrategyProvider):
    def __init__(self, *, api_key: str, model: str = "gemini-2.0-flash") -> None:
        self._api_key = api_key
        self._model = model

    async def generate_strategy(self, *, system_prompt: str, user_prompt: str) -> dict:
        import google.generativeai as genai

        logger.info(f"Calling Gemini Strategy Provider (model={self._model})...")
        genai.configure(api_key=self._api_key)
        model = genai.GenerativeModel(
            model_name=self._model,
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        response = model.generate_content(user_prompt)
        raw_text = response.text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        raw_text = raw_text.strip()

        try:
            result = json.loads(raw_text)
        except json.JSONDecodeError as e:
            logger.error(f"Gemini returned non-JSON response: {e}. Falling back to mock.")
            from app.agents.strategy.providers.mock import MockStrategyProvider
            return await MockStrategyProvider().generate_strategy(
                system_prompt=system_prompt, user_prompt=user_prompt
            )

        logger.info("Gemini Strategy Provider completed successfully.")
        return result
