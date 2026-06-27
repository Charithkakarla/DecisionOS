# Contains: gemini.py implementation.
import asyncio
import json
import logging
from app.agents.decision.providers.base import DecisionProvider

logger = logging.getLogger("decision_os.decision.providers.gemini")

class GeminiDecisionProvider(DecisionProvider):
    def __init__(self, api_key: str, model: str) -> None:
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise RuntimeError(
                "Google Generative AI SDK is not installed. Add google-generativeai to requirements."
            ) from exc

        self._genai = genai
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name=model)
        logger.info(f"Initialized Gemini Decision Provider with model {model}")

    async def analyze(self, *, system_prompt: str, user_prompt: str) -> dict:
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        logger.info("Calling Gemini API for decision analysis...")
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                full_prompt,
                generation_config=self._genai.types.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            text = response.text.strip()
            # Remove markdown JSON wrappers if the model still generated them
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            
            payload = json.loads(text.strip())
            return payload
        except Exception as e:
            logger.error(f"Gemini decision analysis call failed: {e}")
            raise
