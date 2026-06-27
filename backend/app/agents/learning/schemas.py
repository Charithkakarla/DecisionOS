from typing import Any
from pydantic import BaseModel, Field

class ProcessLearningRequest(BaseModel):
    workflow_id: str
    execution_id: str
    state_snapshot: dict[str, Any] = Field(default_factory=dict)

class ProcessLearningResponse(BaseModel):
    success: bool
    artifact_id: str
    message: str

class LearningInsightResponse(BaseModel):
    insights: list[dict[str, Any]]

class LearningTrendResponse(BaseModel):
    trends: dict[str, Any]

class LearningMemoryResponse(BaseModel):
    memory: list[dict[str, Any]]

class LearningRecommendationResponse(BaseModel):
    recommendations: list[dict[str, Any]]
