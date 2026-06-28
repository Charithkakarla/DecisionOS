# Contains: grok.py implementation.
import json
import logging
import re

import httpx

from app.agents.context.schemas import ContextExtraction

logger = logging.getLogger("decision_os.context.providers.grok")


def _extract_json(text: str) -> dict:
    """Extract JSON from response text, handling markdown code blocks."""
    text = text.strip()
    # Strip markdown fences
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


class GrokContextProvider:
    def __init__(self, api_key: str, model: str, base_url: str) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    async def extract(self, *, system_prompt: str, user_prompt: str) -> ContextExtraction:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        # Append JSON instruction to system prompt instead of using response_format
        json_system = system_prompt + "\n\nYou MUST respond with valid JSON only. No markdown, no explanation."
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": json_system},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if not response.is_success:
                logger.error(f"Grok API {response.status_code}: {response.text}")
            response.raise_for_status()
            body = response.json()

        content = body["choices"][0]["message"]["content"]
        parsed = _extract_json(content)
        return ContextExtraction.model_validate(parsed)
