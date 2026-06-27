# Contains: tests.py implementation.
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.state import (
    WorkflowState,
    ContextArtifact,
    KnowledgeArtifact,
    DecisionArtifact,
    StrategyArtifact,
    EvidencePackage,
    DecisionPackage,
    StrategyPackage,
    KnowledgeResult,
    Recommendation,
    DecisionAnalysis,
    AgentExecutionMetadata,
)
from app.agents.reflection.validator import validate_artifacts
from app.agents.reflection.consistency import check_consistency
from app.agents.reflection.evidence import verify_evidence
from app.agents.reflection.hallucination import detect_hallucinations
from app.agents.reflection.confidence import calculate_trust_score
from app.agents.reflection.governance import verify_governance
from app.agents.reflection.service import ReflectionService
from app.agents.reflection.report import generate_report


client = TestClient(app)

# --- Test Fixtures Helper ---
def _build_test_state() -> WorkflowState:
    rec1 = Recommendation(
        id="rec-1",
        rank=1,
        title="Migration Option A",
        description="Phased cloud database migration.",
        reasoning="Reduces downtime.",
        why_this_recommendation="High scalability support.",
        supporting_evidence="Migrate replica first.",
        citation="Playbook Page 2",
        retrieval_reason="Outlines replicator safety.",
        document_source="Playbook.pdf",
        similarity_score=0.90,
        confidence=0.90,
        timeline="14 days",
        evidence_ids=["chunk-1"]
    )
    
    dec_analysis = DecisionAnalysis(
        business_goal="Migrate DB to cloud",
        customer_intent="Increase reliability",
        buying_stage="proposal",
        business_problem="On-prem latency constraints",
        decision_readiness=1.0,
        opportunity_score=0.85,
        risk_score=0.20,
        priority_score=0.90,
        business_value_score=0.80,
        confidence_score=0.85,
        estimated_revenue=150000.0,
        recommended_actions=[rec1],
        reasoning_summary="Replicating first is optimal."
    )
    
    dec_package = DecisionPackage(
        business_goal="Migrate DB to cloud",
        decision_reasoning="Reduces single point of failure risk.",
        recommendations=[rec1],
        business_scores={"opportunity_score": 0.85, "risk_score": 0.20, "priority_score": 0.90},
        confidence={"overall_confidence": 0.85},
        confidence_split={"overall_confidence": 0.85},
        analysis=dec_analysis,
        audit_trail=["Decision run logged"]
    )
    
    strategy_package = StrategyPackage(
        selected_strategy="Migrate Option A",
        business_rationale="Matches optimized decision pathway.",
        estimated_success_probability=0.85,
        estimated_roi=1.5,
        estimated_cost=50000.0,
        implementation_complexity="Medium",
        implementation_timeline="14 days",
        priority="High",
        confidence=0.85,
        execution_plan=[]
    )
    
    state = WorkflowState(
        workflow_id="wf-12345",
        execution_id="exec-12345",
        transcript="We want to migrate our database to the cloud to solve latency.",
        context_artifact=ContextArtifact(
            artifact_id="art-1",
            workflow_id="wf-12345",
            agent_name="context",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            provider="Mock",
            payload={
                "meeting_summary": "Migrate database.",
                "budget": "$150,000",
                "timeline": "60 days",
                "pain_points": ["On-prem latency"]
            }
        ),
        knowledge_artifact=KnowledgeArtifact(
            artifact_id="art-2",
            workflow_id="wf-12345",
            agent_name="knowledge",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            provider="Mock",
            payload=EvidencePackage(
                knowledge_results=[
                    KnowledgeResult(
                        id="chunk-1",
                        document_name="Playbook.pdf",
                        section="Rollout safety",
                        page=2,
                        content="Migrate replica first to isolate errors.",
                        similarity_score=0.90,
                        citation="Playbook Page 2",
                        source_type="pdf"
                    )
                ],
                citations=["Playbook Page 2"],
                confidence_score=0.90
            )
        ),
        decision_artifact=DecisionArtifact(
            artifact_id="art-3",
            workflow_id="wf-12345",
            agent_name="decision",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            provider="Mock",
            payload=dec_package
        ),
        strategy_artifact=StrategyArtifact(
            artifact_id="art-4",
            workflow_id="wf-12345",
            agent_name="strategy",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            provider="Mock",
            payload=strategy_package
        ),
        final_action="Strategy generated successfully."
    )
    
    # Inject metadata to comply with governance checks
    for name in ["context", "decision", "strategy"]:
        state.agent_metadata[name] = AgentExecutionMetadata(
            agent_name=f"{name} Agent",
            provider="Mock",
            model="mock",
            latency_ms=120.0,
            token_usage={"total_tokens": 1000},
            estimated_cost=0.01,
            started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            status="completed",
            version="1.0.0"
        )
    return state


# --- Unit Tests ---

def test_validator():
    state = _build_test_state()
    # Validator checks validity of strategy phases
    from app.schemas.state import ExecutionPhase
    state.strategy_artifact.payload.execution_plan = [
        ExecutionPhase(name="Phase 1", description="Description", duration_days=7)
    ]
    res = validate_artifacts(state)
    assert res["valid"] is True
    assert not res["errors"]


def test_consistency():
    state = _build_test_state()
    res = check_consistency(state)
    assert res["goal_match"] is True
    assert res["consistency_score"] >= 0.8


def test_evidence():
    state = _build_test_state()
    res = verify_evidence(state)
    assert res["evidence_coverage"] == 1.0
    assert not res["broken_references"]


def test_hallucination():
    state = _build_test_state()
    res = detect_hallucinations(state)
    assert res["hallucination_risk"] == 0.0
    assert not res["unsupported_claims"]


def test_confidence():
    state = _build_test_state()
    res = calculate_trust_score(
        state=state,
        validation_status="passed",
        evidence_coverage=1.0,
        consistency_score=1.0,
        hallucination_risk=0.0,
        governance_score=1.0
    )
    assert res["overall_trust_score"] > 0.8
    assert "context_quality" in res["dimension_scores"]


def test_governance():
    state = _build_test_state()
    res = verify_governance(state)
    assert res["governance_score"] == 1.0
    assert not res["governance_issues"]


@pytest.mark.asyncio
async def test_reflection_service():
    from app.schemas.state import ExecutionPhase
    state = _build_test_state()
    state.strategy_artifact.payload.execution_plan = [
        ExecutionPhase(name="Phase 1", description="Description", duration_days=7)
    ]
    
    service = ReflectionService()
    updated_state = await service.execute(state)
    
    assert updated_state.reflection_artifact is not None
    payload = updated_state.reflection_artifact.payload
    assert payload.validation_status == "passed"
    assert payload.overall_trust_score > 0.5
    assert "reflection" in updated_state.agent_metadata


def test_report_generation():
    state = _build_test_state()
    # Inject mock reflection artifact first
    from app.schemas.state import ReflectionArtifact
    from app.agents.reflection.schemas import ReflectionPayload
    
    state.reflection_artifact = ReflectionArtifact(
        artifact_id="art-5",
        workflow_id=state.workflow_id,
        agent_name="reflection",
        created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        provider="Mock",
        confidence=0.9,
        payload=ReflectionPayload(
            validation_status="passed",
            overall_trust_score=0.92,
            audit_summary="Approved",
            validation_timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ")
        )
    )
    
    report = generate_report(state)
    assert report.workflow_id == state.workflow_id
    assert report.overall_trust_score == 0.92
    assert "context" in report.artifact_versions


# --- API Route Tests ---

def test_api_validate_endpoint():
    from app.schemas.state import ExecutionPhase
    state = _build_test_state()
    state.strategy_artifact.payload.execution_plan = [
        ExecutionPhase(name="Phase 1", description="Description", duration_days=7)
    ]
    
    # Post WorkflowState to validator API
    response = client.post("/api/v1/reflection/validate", json=state.model_dump(mode="json"))
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["agent_name"] == "reflection"
    assert res_data["payload"]["validation_status"] == "passed"
    
    # Verify report is accessible after validation caches the state
    report_response = client.get(f"/api/v1/reflection/report/{state.workflow_id}")
    assert report_response.status_code == 200
    report_data = report_response.json()
    assert report_data["workflow_id"] == state.workflow_id
    assert report_data["overall_trust_score"] > 0.5
