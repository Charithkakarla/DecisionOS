# Contains: service.py implementation.
import time
import logging
from app.contracts.decision import DecisionAgent
from app.schemas.state import WorkflowState, AgentMetadata, AgentExecutionLog
from app.agents.decision.reasoning import BusinessReasoningEngine

logger = logging.getLogger("decision_os.decision.service")

class DecisionService(DecisionAgent):
    def __init__(self) -> None:
        self.reasoning_engine = BusinessReasoningEngine()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        logger.info("Executing Decision Intelligence Agent...")
        state.execution_logs.append("decision: starting decision analysis worker")
        start_time = time.time()
        
        # Guard: check if extracted context is present
        if not state.extracted_context:
            state.execution_logs.append("decision: failed - no extracted context in state")
            state.draft_recommendation = "Error: context extraction missing."
            return state

        try:
            # Execute the reasoning engine using extracted context and evidence package
            decision_pkg = await self.reasoning_engine.execute_reasoning(
                context=state.extracted_context,
                evidence_package=state.evidence_package
            )
            
            # Update state with decision package
            state.decision_package = decision_pkg
            
            # Format draft recommendation for strategist and loop compatibility
            state.draft_recommendation = (
                f"Goal: {decision_pkg.business_goal}\n"
                f"Revenue: ${decision_pkg.analysis.estimated_revenue:,.2f}\n"
                f"Actions proposed: {', '.join([r.title for r in decision_pkg.recommendations])}\n"
                f"Reasoning: {decision_pkg.decision_reasoning}"
            )
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            opp = decision_pkg.business_scores["opportunity_score"]
            risk = decision_pkg.business_scores["risk_score"]
            conf = decision_pkg.confidence["overall_confidence"]
            
            state.execution_logs.append(
                f"decision: completed decision analysis in {elapsed_ms}ms "
                f"(opportunity: {opp:.4f}, risk: {risk:.4f}, confidence: {conf:.4f})"
            )
            
            # Append shared infrastructure AgentMetadata and AgentExecutionLog (Sprint 5.5)
            # Estimate tokens: 1 token roughly 4 characters
            in_chars = len(state.transcript)
            out_chars = len(state.draft_recommendation)
            input_tokens = in_chars // 4
            output_tokens = out_chars // 4
            total_tokens = input_tokens + output_tokens
            cost = (input_tokens * 0.000000075) + (output_tokens * 0.00000030) # approx cost scale
            
            meta = AgentMetadata(
                execution_time_ms=elapsed_ms,
                latency_ms=elapsed_ms,
                provider=decision_pkg.execution_metadata.get("provider_used", "MockDecisionProvider"),
                token_usage={"input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": total_tokens},
                retry_count=0,
                status="completed",
                cost=round(cost, 6)
            )
            
            log_record = AgentExecutionLog(
                agent_name="Decision Agent",
                started=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
                completed=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=elapsed_ms,
                provider=meta.provider,
                prompt_version="1.0.0",
                confidence=conf,
                warnings=decision_pkg.audit_trail[-3:-1] if len(decision_pkg.audit_trail) > 3 else [],
                errors=[],
                evidence_count=decision_pkg.execution_metadata.get("evidence_count", 0)
            )
            
            # Store in shared state trackers
            state.agent_metadata["decision"] = meta
            state.agent_logs["decision"] = log_record
            
        except Exception as e:
            logger.error(f"Decision agent execution failed: {e}")
            state.execution_logs.append(f"decision: execution failed - {e}")
            state.draft_recommendation = f"Error during decision analysis: {e}"
            
        return state
