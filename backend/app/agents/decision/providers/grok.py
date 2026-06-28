# Contains: grok.py implementation.
import httpx
import json
import re
import logging
from app.agents.decision.providers.base import DecisionProvider

logger = logging.getLogger("decision_os.decision.providers.grok")


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


class GrokDecisionProvider(DecisionProvider):
    def __init__(self, api_key: str, model: str, base_url: str) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        logger.info(f"Initialized Grok Decision Provider with model {model}")

    async def analyze(self, *, system_prompt: str, user_prompt: str) -> dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        json_system = system_prompt + "\n\nYou MUST respond with valid JSON only. No markdown, no explanation."
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": json_system},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
        }

        logger.info("Calling Grok API for decision analysis...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return _extract_json(content)
            except Exception as e:
                logger.error(f"Grok decision analysis call failed: {e}")
                raise
