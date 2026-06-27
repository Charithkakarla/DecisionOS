# Contains: gemini.py implementation.
import asyncio
import json

from app.agents.context.schemas import ContextExtraction


class GeminiContextProvider:
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

    async def extract(self, *, system_prompt: str, user_prompt: str) -> ContextExtraction:
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        response = await asyncio.to_thread(
            self.model.generate_content,
            full_prompt,
            generation_config=self._genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        payload = json.loads(response.text)
        return ContextExtraction.model_validate(payload)
