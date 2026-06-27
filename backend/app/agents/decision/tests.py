# Contains: tests.py implementation.
import pytest
from app.agents.decision.confidence import calculate_confidence
from app.agents.decision.scoring import calculate_business_scores
from app.agents.decision.validator import validate_decision_package, DecisionValidationError
from app.schemas.state import DecisionPackage, DecisionAnalysis, Recommendation

def test_calculate_confidence():
    context = {
        "meeting_summary": "Prospect wants core cloud database migration.",
        "customer_profile": "Enterprise client",
        "pain_points": ["Legacy latency", "Scaling issues"],
        "decision_makers": ["CIO"],
        "budget": "$200,000",
        "timeline": "60 days"
    }
    evidence_list = [
        {"similarity": 0.9, "citation": "SOP Page 1"},
        {"similarity": 0.8, "citation": "SOP Page 2"}
    ]
    
    res = calculate_confidence(context, evidence_list)
    assert res["overall_confidence"] > 0.0
    assert "overall_confidence" in res
    assert "confidence_split" in res
    assert res["confidence_split"]["context_confidence"] == 1.0
    assert res["confidence_split"]["decision_confidence"] == 1.0

def test_calculate_business_scores():
    raw_data = {
        "buying_stage": "proposal",
        "estimated_revenue": 150000.0,
        "estimated_time_to_close": 45,
        "urgency": "high",
        "missing_information": ["Budget confirmation"],
        "business_risks": ["Migration downtime"]
    }
    conf_metrics = {
        "confidence_split": {
            "overall_confidence": 0.85,
            "evidence_confidence": 0.7,
            "context_confidence": 1.0,
            "provider_confidence": 0.95,
            "decision_confidence": 1.0
        }
    }
    
    scores = calculate_business_scores(raw_data, conf_metrics)
    assert scores["decision_readiness"] == 1.0
    assert scores["opportunity_score"] > 0.0
    assert scores["risk_score"] > 0.0
    assert scores["priority_score"] > 0.0

def create_mock_rec(id_val: str, rank_val: int) -> Recommendation:
    return Recommendation(
        id=id_val,
        rank=rank_val,
        title=f"Phased Migration {rank_val}",
        description="Migrate in phases.",
        reasoning="Minimizes baseline downtime.",
        why_this_recommendation="Ensures SLA parameters are satisfied.",
        business_impact="None",
        risk_level="Low",
        expected_outcome="Database migrated",
        confidence=0.9,
        supporting_evidence="Migrate secondary endpoints first",
        citation="Playbook Page 1",
        retrieval_reason="Guidelines",
        document_source="Playbook.pdf",
        similarity_score=0.92
    )

def test_validator_valid():
    rec1 = create_mock_rec("rec-1", 1)
    rec2 = create_mock_rec("rec-2", 2)
    rec3 = create_mock_rec("rec-3", 3)
    
    analysis = DecisionAnalysis(
        business_goal="Migrate DB",
        customer_intent="Upgrade",
        buying_stage="proposal",
        business_problem="Latency",
        decision_readiness=1.0,
        opportunity_score=0.8,
        risk_score=0.2,
        priority_score=0.9,
        business_value_score=0.8,
        confidence_score=0.85,
        estimated_revenue=150000.0,
        estimated_time_to_close=30,
        recommended_actions=[rec1, rec2, rec3],
        reasoning_summary="Optimal approach",
    )
    pkg = DecisionPackage(
        executive_summary="Executive brief.",
        business_goal="Migrate DB",
        assumptions=[],
        constraints=[],
        tradeoffs=[],
        decision_reasoning="Reasoning info",
        analysis=analysis,
        recommendations=[rec1, rec2, rec3],
        business_scores={
            "decision_readiness": 1.0,
            "opportunity_score": 0.8,
            "risk_score": 0.2,
            "priority_score": 0.9,
            "business_value_score": 0.8
        },
        confidence={
            "overall_confidence": 0.85,
            "confidence_reasoning": "Good parameters"
        },
        confidence_split={
            "overall_confidence": 0.85,
            "evidence_confidence": 0.7,
            "context_confidence": 1.0,
            "provider_confidence": 0.95,
            "decision_confidence": 1.0
        }
    )
    
    # Should pass without raising exceptions
    validate_decision_package(pkg)

def test_validator_invalid_revenue():
    rec1 = create_mock_rec("rec-1", 1)
    rec2 = create_mock_rec("rec-2", 2)
    rec3 = create_mock_rec("rec-3", 3)
    
    analysis = DecisionAnalysis(
        business_goal="Migrate DB",
        customer_intent="Upgrade",
        buying_stage="proposal",
        business_problem="Latency",
        decision_readiness=1.0,
        opportunity_score=0.8,
        risk_score=0.2,
        priority_score=0.9,
        business_value_score=0.8,
        confidence_score=0.85,
        estimated_revenue=150000.0,  # Instantiate with valid positive revenue first
        estimated_time_to_close=30,
        recommended_actions=[rec1, rec2, rec3],
        reasoning_summary="Optimal approach",
    )
    pkg = DecisionPackage(
        executive_summary="Executive brief.",
        business_goal="Migrate DB",
        assumptions=[],
        constraints=[],
        tradeoffs=[],
        decision_reasoning="Reasoning info",
        analysis=analysis,
        recommendations=[rec1, rec2, rec3],
        business_scores={
            "decision_readiness": 1.0,
            "opportunity_score": 0.8,
            "risk_score": 0.2,
            "priority_score": 0.9,
            "business_value_score": 0.8
        },
        confidence={
            "overall_confidence": 0.85,
            "confidence_reasoning": "Good parameters"
        },
        confidence_split={
            "overall_confidence": 0.85,
            "evidence_confidence": 0.7,
            "context_confidence": 1.0,
            "provider_confidence": 0.95,
            "decision_confidence": 1.0
        }
    )
    
    # Mutate to invalid negative revenue to trigger custom validation
    pkg.analysis.estimated_revenue = -100.0
    
    with pytest.raises(DecisionValidationError):
        validate_decision_package(pkg)
