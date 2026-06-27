# Contains: schemas.py implementation.
from typing import List
from pydantic import BaseModel, Field

class ReflectionPayload(BaseModel):
    validation_status: str = Field(default="passed", pattern="^(passed|failed)$")
    overall_trust_score: float = Field(default=0.0, ge=0.0, le=1.0)
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_coverage: float = Field(default=0.0, ge=0.0, le=1.0)
    business_alignment_score: float = Field(default=0.0, ge=0.0, le=1.0)
    strategy_consistency_score: float = Field(default=0.0, ge=0.0, le=1.0)
    hallucination_risk: float = Field(default=0.0, ge=0.0, le=1.0)
    governance_score: float = Field(default=0.0, ge=0.0, le=1.0)
    explainability_score: float = Field(default=0.0, ge=0.0, le=1.0)
    audit_summary: str = ""
    warnings: List[str] = Field(default_factory=list)
    critical_findings: List[str] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    contradictions: List[str] = Field(default_factory=list)
    unsupported_claims: List[str] = Field(default_factory=list)
    improvement_suggestions: List[str] = Field(default_factory=list)
    validation_timestamp: str = ""
    validation_version: str = "1.0.0"
    supporting_evidence: List[dict] = Field(default_factory=list)
    execution_metadata: dict = Field(default_factory=dict)
