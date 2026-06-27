# Contains: schemas.py — internal Pydantic models for the Strategy Intelligence Agent.
from pydantic import BaseModel, Field


class StrategyAnalysisInput(BaseModel):
    """Input structure passed to the LLM provider for strategy enrichment."""
    selected_recommendation_title: str
    selected_recommendation_description: str
    selected_recommendation_reasoning: str
    alternative_titles: list[str] = Field(default_factory=list)
    optimization_score: float = 0.0
    business_goal: str = ""
    estimated_revenue: float = 0.0
    decision_reasoning: str = ""
    context_summary: str = ""


class OptimizationResult(BaseModel):
    """Output of the deterministic Strategy Optimizer."""
    best_recommendation_id: str
    best_recommendation_title: str
    ranked_recommendation_ids: list[str] = Field(default_factory=list)
    ranked_recommendation_titles: list[str] = Field(default_factory=list)
    optimization_scores: dict[str, float] = Field(default_factory=dict)
    complexity: str = "Medium"  # Low | Medium | High
    composite_score: float = 0.0


class SimulationResult(BaseModel):
    """Output of the Business Simulator covering all three scenarios."""
    optimistic_roi: float = 0.0
    realistic_roi: float = 0.0
    conservative_roi: float = 0.0
    optimistic_probability: float = 0.0
    realistic_probability: float = 0.0
    conservative_probability: float = 0.0
    optimistic_timeline_days: int = 30
    realistic_timeline_days: int = 30
    conservative_timeline_days: int = 30
    optimistic_cost: float = 0.0
    realistic_cost: float = 0.0
    conservative_cost: float = 0.0
    base_revenue_impact: float = 0.0
    base_operational_savings: float = 0.0
    base_customer_retention: float = 0.0
    base_risk_reduction: float = 0.0
    base_productivity_improvement: float = 0.0
    base_decision_cycle_reduction: float = 0.0


class ComparisonEntry(BaseModel):
    """A single option's comparison metrics."""
    title: str
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    business_impact: str = ""
    risk_level: str = "Medium"
    complexity: str = "Medium"
    timeline: str = ""
    roi: float = 0.0
    composite_score: float = 0.0


class ComparisonResult(BaseModel):
    """Output of the Comparison Engine — side-by-side analysis of all options."""
    entries: list[ComparisonEntry] = Field(default_factory=list)
    winner_title: str = ""
    winner_reasoning: str = ""
    comparison_summary: str = ""
