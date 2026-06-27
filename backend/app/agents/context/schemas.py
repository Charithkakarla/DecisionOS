# Contains: schemas.py implementation.
from pydantic import BaseModel, Field


class ContextExtraction(BaseModel):
    meeting_summary: str
    customer_profile: str
    pain_points: list[str] = Field(default_factory=list)
    decision_makers: list[str] = Field(default_factory=list)
    budget: str | None = None
    timeline: str | None = None
    competitors: list[str] = Field(default_factory=list)
    business_risks: list[str] = Field(default_factory=list)
    buying_signals: list[str] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
