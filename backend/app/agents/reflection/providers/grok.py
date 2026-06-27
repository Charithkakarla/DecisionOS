# Contains: grok.py implementation.
import json
import logging
from app.agents.reflection.providers.base import ReflectionProvider

logger = logging.getLogger("decision_os.reflection.providers.grok")

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
        logger.info(f"Initialized Grok Reflection Provider with model {model} and base {base_url}")

    async def evaluate_explainability(self, *, system_prompt: str, user_prompt: str) -> dict:
        logger.info("Calling Grok API for strategy explainability...")
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            text = response.choices[0].message.content or "{}"
            payload = json.loads(text.strip())
            return payload
        except Exception as e:
            logger.error(f"Grok reflection call failed: {e}")
            raise
