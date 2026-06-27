# Contains: service.py implementation.
import time
import uuid
import logging
from app.contracts.decision import DecisionAgent
from app.schemas.state import WorkflowState, DecisionArtifact, AgentExecutionMetadata, AgentExecutionLog
from app.agents.decision.reasoning import BusinessReasoningEngine
from app.core.config import settings

logger = logging.getLogger("decision_os.decision.service")

class DecisionService(DecisionAgent):
    def __init__(self) -> None:
        self.reasoning_engine = BusinessReasoningEngine()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        logger.info("Executing Decision Intelligence Agent...")
        state.execution_logs.append("decision: starting decision analysis worker")
        start_time = time.time()
        
        # Guard: check if extracted context is present
        if not state.context_artifact or not state.context_artifact.payload:
            state.execution_logs.append("decision: failed - no extracted context in state")
            state.draft_recommendation = "Error: context extraction missing."
            return state

        try:
            # Execute the reasoning engine using extracted context and evidence package
            context_payload = state.context_artifact.payload
            evidence_payload = state.knowledge_artifact.payload if state.knowledge_artifact else None
            
            decision_pkg = await self.reasoning_engine.execute_reasoning(
                context=context_payload,
                evidence_package=evidence_payload
            )
            
            # Update state with decision artifact
            opp = decision_pkg.business_scores.get("opportunity_score", 0.0)
            risk = decision_pkg.business_scores.get("risk_score", 0.0)
            conf = decision_pkg.confidence.get("overall_confidence", 0.85)
            
            state.decision_artifact = DecisionArtifact(
                artifact_id=str(uuid.uuid4()),
                workflow_id=state.workflow_id,
                agent_name="decision",
                schema_version="1.0.0",
                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
                provider=decision_pkg.execution_metadata.get("provider_used", "MockDecisionProvider"),
                confidence=conf,
                payload=decision_pkg
            )
            
            # Format draft recommendation for strategist and loop compatibility
            state.draft_recommendation = (
                f"Goal: {decision_pkg.business_goal}\n"
                f"Revenue: ${decision_pkg.analysis.estimated_revenue:,.2f}\n"
                f"Actions proposed: {', '.join([r.title for r in decision_pkg.recommendations])}\n"
                f"Reasoning: {decision_pkg.decision_reasoning}"
            )
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            
            state.execution_logs.append(
                f"decision: completed decision analysis in {elapsed_ms}ms "
                f"(opportunity: {opp:.4f}, risk: {risk:.4f}, confidence: {conf:.4f})"
            )
            
            # Estimate tokens
            in_chars = len(state.transcript)
            out_chars = len(state.draft_recommendation)
            input_tokens = in_chars // 4
            output_tokens = out_chars // 4
            total_tokens = input_tokens + output_tokens
            cost = (input_tokens * 0.000000075) + (output_tokens * 0.00000030) # approx cost scale
            
            # Populate unified metadata
            meta = AgentExecutionMetadata(
                agent_name="Decision Agent",
                provider=decision_pkg.execution_metadata.get("provider_used", "MockDecisionProvider"),
                model=settings.gemini_model,
                latency_ms=elapsed_ms,
                token_usage={"input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": total_tokens},
                estimated_cost=round(cost, 6),
                started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
                completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                status="completed",
                retry_count=0,
                version="1.0.0"
            )
            state.agent_metadata["decision"] = meta
            
            # Maintain backward compatibility log
            log_record = AgentExecutionLog(
                agent_name="Decision Agent",
                started=meta.started_at,
                completed=meta.completed_at,
                duration_ms=elapsed_ms,
                provider=meta.provider,
                prompt_version="1.0.0",
                confidence=conf,
                warnings=decision_pkg.audit_trail[-3:-1] if len(decision_pkg.audit_trail) > 3 else [],
                errors=[],
                evidence_count=decision_pkg.execution_metadata.get("evidence_count", 0)
            )
            state.agent_logs["decision"] = log_record
            
        except Exception as e:
            logger.error(f"Decision agent execution failed: {e}")
            state.execution_logs.append(f"decision: execution failed - {e}")
            state.draft_recommendation = f"Error during decision analysis: {e}"
            
        return state
