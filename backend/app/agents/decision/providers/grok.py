# Contains: grok.py implementation.
import httpx
import json
import logging
from app.agents.decision.providers.base import DecisionProvider

logger = logging.getLogger("decision_os.decision.providers.grok")

class GrokDecisionProvider(DecisionProvider):
    def __init__(self, api_key: str, model: str, base_url: str) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        logger.info(f"Initialized Grok Decision Provider with model {model}")

    async def analyze(self, *, system_prompt: str, user_prompt: str) -> dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1
        }
        
        logger.info("Calling Grok API for decision analysis...")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return json.loads(content)
            except Exception as e:
                logger.error(f"Grok decision analysis call failed: {e}")
                raise
