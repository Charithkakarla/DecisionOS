# Contains: mock.py implementation.
from app.agents.context.schemas import ContextExtraction


class MockContextProvider:
    async def extract(self, *, system_prompt: str, user_prompt: str) -> ContextExtraction:
        transcript = _extract_transcript(user_prompt)
        lowered = transcript.lower()

        return ContextExtraction(
            meeting_summary=transcript[:220] if transcript else "No transcript provided.",
            customer_profile="Enterprise buyer (mock inference)",
            pain_points=_find_keywords(lowered, ["delay", "missed", "risk", "escalation", "cost"]),
            decision_makers=_find_keywords(lowered, ["cto", "cfo", "vp", "director", "manager"]),
            budget="Unknown",
            timeline="Urgent" if "deadline" in lowered else "Not explicitly stated",
            competitors=_find_keywords(lowered, ["aws", "azure", "gcp", "competitor"]),
            business_risks=_find_keywords(lowered, ["churn", "compliance", "outage", "revenue"]),
            buying_signals=_find_keywords(lowered, ["pilot", "procurement", "contract", "renewal"]),
            action_items=["Validate requirements", "Schedule stakeholder alignment review"],
            confidence=0.62,
        )


def _extract_transcript(user_prompt: str) -> str:
    marker = "Transcript:\n"
    if marker in user_prompt:
        return user_prompt.split(marker, 1)[1].strip()
    return user_prompt.strip()


def _find_keywords(text: str, candidates: list[str]) -> list[str]:
    return [word for word in candidates if word in text]
