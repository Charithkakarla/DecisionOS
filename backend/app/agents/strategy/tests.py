# Contains: tests.py — Strategy Intelligence Agent test suite (Sprint 6).
import pytest
from app.schemas.state import (
    DecisionPackage,
    DecisionAnalysis,
    Recommendation,
    StrategyPackage,
    BusinessImpactAnalysis,
    ExecutionPhase,
    ScenarioOutcome,
)
from app.agents.strategy.optimizer import optimize_recommendations
from app.agents.strategy.simulator import simulate_scenarios
from app.agents.strategy.comparison import compare_recommendations
from app.agents.strategy.validator import validate_strategy_package, StrategyValidationError
from app.agents.strategy.schemas import OptimizationResult


# ── Shared test fixture helpers ───────────────────────────────────────────────

def _make_recommendation(id_val: str, rank: int, confidence: float = 0.85,
                          risk_level: str = "Low", timeline: str = "14 days",
                          resources: list | None = None) -> Recommendation:
    return Recommendation(
        id=id_val,
        rank=rank,
        title=f"Strategy Option {rank}",
        description=f"Description for option {rank}",
        reasoning=f"Reasoning for option {rank}",
        benefits=["Benefit A", "Benefit B"],
        tradeoffs=["Tradeoff A"],
        risks=["Risk A"],
        risk_level=risk_level,
        timeline=timeline,
        required_resources=resources or ["Resource A", "Resource B"],
        kpis=["KPI 1"],
        confidence=confidence,
        evidence_ids=[f"chunk-{rank}"],
        why_this_recommendation=f"Because this is the best option {rank}.",
        supporting_evidence="Evidence text here.",
        citation=f"Playbook • Page {rank}",
        retrieval_reason="Outlines best practices.",
        document_source=f"Playbook_{rank}.pdf",
        similarity_score=0.90,
        assumptions_made=["Assumption A"],
    )


def _make_decision_package(recs: list[Recommendation]) -> DecisionPackage:
    analysis = DecisionAnalysis(
        business_goal="Migrate database to cloud",
        customer_intent="Reduce operational overhead",
        buying_stage="proposal",
        business_problem="Legacy infrastructure bottlenecks",
        decision_readiness=0.90,
        opportunity_score=0.80,
        risk_score=0.25,
        priority_score=0.85,
        business_value_score=0.75,
        confidence_score=0.82,
        estimated_revenue=175000.0,
        estimated_time_to_close=45,
        recommended_actions=recs,
        reasoning_summary="Phased migration is the safest approach.",
    )
    return DecisionPackage(
        executive_summary="Cloud migration with zero-downtime target.",
        business_goal="Migrate core databases to enterprise cloud.",
        assumptions=["Cloud supports schema compatibility"],
        constraints=["Holiday freeze schedule"],
        tradeoffs=["Phased approach takes longer"],
        decision_reasoning="Sandbox pilot reduces cutover risk.",
        analysis=analysis,
        recommendations=recs,
        business_scores={
            "decision_readiness": 0.90,
            "opportunity_score": 0.80,
            "risk_score": 0.25,
            "business_value_score": 0.75,
            "priority_score": 0.85,
        },
        confidence={
            "overall_confidence": 0.82,
            "confidence_reasoning": "Good context quality.",
        },
        confidence_split={
            "overall_confidence": 0.82,
            "evidence_confidence": 0.70,
            "context_confidence": 1.00,
            "provider_confidence": 0.95,
            "decision_confidence": 1.00,
        },
    )


# ── Test 1: Optimizer ranks recommendations ────────────────────────────────────
def test_optimizer_ranks_recommendations():
    rec1 = _make_recommendation("rec-1", 1, confidence=0.95, risk_level="Low", timeline="7 days")
    rec2 = _make_recommendation("rec-2", 2, confidence=0.75, risk_level="Medium", timeline="21 days")
    rec3 = _make_recommendation("rec-3", 3, confidence=0.50, risk_level="High", timeline="45 days")
    pkg = _make_decision_package([rec1, rec2, rec3])

    result = optimize_recommendations(pkg)

    assert result.best_recommendation_id == "rec-1"
    assert result.composite_score > 0.0
    assert len(result.ranked_recommendation_ids) == 3
    # rec-1 should score highest
    assert result.optimization_scores["rec-1"] > result.optimization_scores["rec-2"]
    assert result.optimization_scores["rec-2"] > result.optimization_scores["rec-3"]


# ── Test 2: Simulator generates three distinct scenarios ──────────────────────
def test_simulator_generates_three_scenarios():
    rec1 = _make_recommendation("rec-1", 1, confidence=0.90)
    rec2 = _make_recommendation("rec-2", 2, confidence=0.75)
    rec3 = _make_recommendation("rec-3", 3, confidence=0.55)
    pkg = _make_decision_package([rec1, rec2, rec3])

    opt = OptimizationResult(
        best_recommendation_id="rec-1",
        best_recommendation_title="Strategy Option 1",
        ranked_recommendation_ids=["rec-1", "rec-2", "rec-3"],
        ranked_recommendation_titles=["Strategy Option 1", "Strategy Option 2", "Strategy Option 3"],
        optimization_scores={"rec-1": 0.82, "rec-2": 0.65, "rec-3": 0.45},
        complexity="Medium",
        composite_score=0.82,
    )

    sim_result, scenarios = simulate_scenarios(pkg, opt)

    assert len(scenarios) == 3
    scenario_types = {s.scenario_type for s in scenarios}
    assert scenario_types == {"optimistic", "realistic", "conservative"}

    # Optimistic should have higher ROI than conservative
    opt_scenario = next(s for s in scenarios if s.scenario_type == "optimistic")
    cons_scenario = next(s for s in scenarios if s.scenario_type == "conservative")
    assert opt_scenario.expected_roi > cons_scenario.expected_roi

    # Optimistic should have higher probability than conservative
    assert opt_scenario.success_probability > cons_scenario.success_probability

    # Conservative should have higher cost than optimistic
    assert cons_scenario.estimated_cost >= opt_scenario.estimated_cost


# ── Test 3: Comparison Engine returns a winner ────────────────────────────────
def test_comparison_engine_returns_winner():
    rec1 = _make_recommendation("rec-1", 1, confidence=0.95, risk_level="Low")
    rec2 = _make_recommendation("rec-2", 2, confidence=0.70, risk_level="Medium")
    rec3 = _make_recommendation("rec-3", 3, confidence=0.45, risk_level="High")
    pkg = _make_decision_package([rec1, rec2, rec3])

    opt = OptimizationResult(
        best_recommendation_id="rec-1",
        best_recommendation_title="Strategy Option 1",
        ranked_recommendation_ids=["rec-1", "rec-2", "rec-3"],
        ranked_recommendation_titles=["Strategy Option 1", "Strategy Option 2", "Strategy Option 3"],
        optimization_scores={"rec-1": 0.87, "rec-2": 0.60, "rec-3": 0.35},
        complexity="Low",
        composite_score=0.87,
    )

    result = compare_recommendations(pkg, opt)

    assert result.winner_title != ""
    assert len(result.entries) == 3
    assert result.winner_title == "Strategy Option 1"
    assert result.comparison_summary != ""


# ── Test 4: Validator accepts a valid StrategyPackage ─────────────────────────
def test_validator_valid_package():
    pkg = StrategyPackage(
        selected_strategy="Phased Migration",
        business_rationale="Safest approach.",
        expected_business_outcome="Zero-downtime migration.",
        estimated_success_probability=0.82,
        estimated_roi=98000.0,
        implementation_complexity="Medium",
        implementation_timeline="45 days",
        estimated_cost=45000.0,
        business_impact=BusinessImpactAnalysis(
            revenue_increase=98000.0,
            operational_savings=21000.0,
        ),
        execution_plan=[
            ExecutionPhase(
                name="Phase 1 — Setup",
                description="Configure sandbox environment.",
                duration_days=7,
                milestones=["Sandbox ready"],
                owner="DB Architect",
            )
        ],
        priority="High",
        confidence=0.82,
        scenarios=[
            ScenarioOutcome(scenario_type="optimistic", expected_roi=122500.0,
                           success_probability=0.97, timeline_days=41, estimated_cost=45000.0),
            ScenarioOutcome(scenario_type="realistic", expected_roi=98000.0,
                           success_probability=0.82, timeline_days=45, estimated_cost=45000.0),
            ScenarioOutcome(scenario_type="conservative", expected_roi=78400.0,
                           success_probability=0.67, timeline_days=54, estimated_cost=49500.0),
        ],
        selected_scenario="realistic",
    )
    # Should pass without raising
    validate_strategy_package(pkg)


# ── Test 5: Validator rejects invalid probability ─────────────────────────────
def test_validator_invalid_probability():
    from pydantic import ValidationError as PydanticValidationError

    # Pydantic enforces le=1.0 at construction time — instantiation must raise
    with pytest.raises((PydanticValidationError, StrategyValidationError)):
        StrategyPackage(
            selected_strategy="Invalid Strategy",
            estimated_success_probability=1.5,  # invalid: > 1.0
            estimated_roi=50000.0,
            implementation_complexity="Low",
            priority="High",
            confidence=0.80,
            execution_plan=[
                ExecutionPhase(
                    name="Phase 1",
                    description="Test phase",
                    duration_days=7,
                    owner="Lead",
                )
            ],
            scenarios=[
                ScenarioOutcome(scenario_type="optimistic", expected_roi=60000.0,
                               success_probability=1.0, timeline_days=7, estimated_cost=5000.0),
                ScenarioOutcome(scenario_type="realistic", expected_roi=50000.0,
                               success_probability=1.0, timeline_days=10, estimated_cost=5000.0),
                ScenarioOutcome(scenario_type="conservative", expected_roi=40000.0,
                               success_probability=1.0, timeline_days=12, estimated_cost=6000.0),
            ],
            selected_scenario="realistic",
        )


# ── Test 6: Mock provider returns expected keys ───────────────────────────────
@pytest.mark.asyncio
async def test_mock_provider_returns_expected_keys():
    from app.agents.strategy.providers.mock import MockStrategyProvider
    provider = MockStrategyProvider()
    result = await provider.generate_strategy(system_prompt="sys", user_prompt="usr")

    required_keys = [
        "selected_strategy", "business_rationale", "expected_business_outcome",
        "execution_plan", "dependencies", "mitigation_plan", "stakeholder_plan",
        "risks", "required_resources", "alternative_strategies", "supporting_evidence",
    ]
    for key in required_keys:
        assert key in result, f"Missing key '{key}' in mock provider output."

    assert isinstance(result["execution_plan"], list)
    assert len(result["execution_plan"]) >= 3


# ── Test 7: Full pipeline integration ─────────────────────────────────────────
@pytest.mark.asyncio
async def test_full_pipeline_integration():
    from app.schemas.state import WorkflowState, EvidencePackage
    from app.agents.strategy.service import StrategyService

    from app.schemas.state import ContextArtifact, KnowledgeArtifact, DecisionArtifact
    import time

    rec1 = _make_recommendation("rec-1", 1, confidence=0.95, risk_level="Low", timeline="7 days")
    rec2 = _make_recommendation("rec-2", 2, confidence=0.75, risk_level="Medium", timeline="21 days")
    rec3 = _make_recommendation("rec-3", 3, confidence=0.50, risk_level="High", timeline="45 days")
    pkg = _make_decision_package([rec1, rec2, rec3])

    state = WorkflowState(
        transcript="Enterprise cloud database migration discussion.",
        context_artifact=ContextArtifact(
            artifact_id="art-context",
            workflow_id="wf-123",
            agent_name="context",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            provider="Mock",
            payload={
                "meeting_summary": "Legacy DB migration to cloud.",
                "customer_profile": "Enterprise client",
                "pain_points": ["Legacy latency"],
                "decision_makers": ["CIO"],
                "budget": "$200,000",
                "timeline": "45 days",
            }
        ),
        knowledge_artifact=KnowledgeArtifact(
            artifact_id="art-knowledge",
            workflow_id="wf-123",
            agent_name="knowledge",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            provider="Mock",
            payload=EvidencePackage(confidence_score=0.70)
        ),
        decision_artifact=DecisionArtifact(
            artifact_id="art-decision",
            workflow_id="wf-123",
            agent_name="decision",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            provider="Mock",
            payload=pkg
        ),
        draft_recommendation="Draft: Proceed with phased migration.",
    )

    service = StrategyService()
    result_state = await service.execute(state)

    assert result_state.strategy_artifact is not None
    sp = result_state.strategy_artifact.payload
    assert sp.selected_strategy != ""
    assert sp.estimated_success_probability >= 0.0
    assert sp.estimated_roi >= 0.0
    assert len(sp.execution_plan) >= 1
    assert len(sp.scenarios) == 3
    assert sp.selected_scenario in {"optimistic", "realistic", "conservative"}
    assert sp.priority in {"Critical", "High", "Medium", "Low"}
    assert result_state.final_action is not None
    assert "strategy" in result_state.agent_metadata
    assert "strategy" in result_state.agent_logs
