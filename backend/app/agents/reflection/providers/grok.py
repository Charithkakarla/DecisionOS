# Contains: grok.py implementation.
import json
import re
import logging
from app.agents.reflection.providers.base import ReflectionProvider

logger = logging.getLogger("decision_os.reflection.providers.grok")


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


class GrokReflectionProvider(ReflectionProvider):
    def __init__(self, api_key: str, model: str, base_url: str) -> None:
        try:
            import openai
        except ImportError as exc:
            raise RuntimeError(
                "OpenAI SDK is not installed. Add openai to requirements."
            ) from exc

        self.client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        logger.info(f"Initialized Grok Reflection Provider with model {model}")

    async def evaluate_explainability(self, *, system_prompt: str, user_prompt: str) -> dict:
        logger.info("Calling Grok API for strategy explainability...")
        try:
            json_system = system_prompt + "\n\nYou MUST respond with valid JSON only. No markdown, no explanation."
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": json_system},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
            )
            text = response.choices[0].message.content or "{}"
            return _extract_json(text)
        except Exception as e:
            logger.error(f"Grok reflection call failed: {e}")
            raise
