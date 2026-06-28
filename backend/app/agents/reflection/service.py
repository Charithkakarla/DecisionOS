# Contains: service.py implementation.
import time
import uuid
import logging
from pathlib import Path

from app.contracts.reflection import ReflectionAgent
from app.core.config import settings
from app.schemas.state import WorkflowState, ReflectionArtifact, AgentExecutionMetadata, AgentExecutionLog
from app.agents.reflection.schemas import ReflectionPayload
from app.agents.reflection.validator import validate_artifacts
from app.agents.reflection.consistency import check_consistency
from app.agents.reflection.evidence import verify_evidence
from app.agents.reflection.hallucination import detect_hallucinations
from app.agents.reflection.confidence import calculate_trust_score
from app.agents.reflection.governance import verify_governance
from app.agents.reflection.explainability import run_explainability_audit
from app.agents.reflection.auditor import compile_audit_report
from app.agents.reflection.providers.base import ReflectionProvider
from app.agents.reflection.providers.gemini import GeminiReflectionProvider
from app.agents.reflection.providers.grok import GrokReflectionProvider
from app.agents.reflection.providers.mock import MockReflectionProvider
from app.core.provider_utils import is_retryable_error, log_fallback

logger = logging.getLogger("decision_os.reflection.service")

_PROMPT_DIR = Path(__file__).resolve().parent / "prompts"

def _build_provider() -> ReflectionProvider:
    provider_name = settings.context_provider.lower()
    if provider_name == "gemini" and settings.gemini_api_key:
        return GeminiReflectionProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
    if provider_name == "grok" and settings.grok_api_key:
        return GrokReflectionProvider(
            api_key=settings.grok_api_key,
            model=settings.grok_model,
            base_url=settings.grok_base_url,
        )
    logger.warning("No LLM key found or provider is mock. Falling back to MockReflectionProvider.")
    return MockReflectionProvider()


def _grok_provider() -> ReflectionProvider | None:
    if settings.grok_api_key:
        return GrokReflectionProvider(
            api_key=settings.grok_api_key,
            model=settings.grok_model,
            base_url=settings.grok_base_url,
        )
    return None

class ReflectionService(ReflectionAgent):
    def __init__(self) -> None:
        self._provider = _build_provider()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        logger.info("Executing Reflection & AI Governance Agent...")
        state.execution_logs.append("reflection: starting strategy audit and validation worker")
        start_time = time.time()

        # 1. Validator
        validation_results = validate_artifacts(state)
        val_status = "passed" if validation_results["valid"] else "failed"

        # 2. Consistency
        consistency_results = check_consistency(state)
        consistency_score = consistency_results["consistency_score"]

        # 3. Evidence Linkage
        evidence_results = verify_evidence(state)
        evidence_coverage = evidence_results["evidence_coverage"]

        # 4. Hallucination Risk
        hallucination_results = detect_hallucinations(state)
        hallucination_risk = hallucination_results["hallucination_risk"]

        # 5. Governance verification
        governance_results = verify_governance(state)
        governance_score = governance_results["governance_score"]

        # 6. Explainability Audit via LLM Provider
        system_prompt = (_PROMPT_DIR / "system.txt").read_text(encoding="utf-8")
        user_template = (_PROMPT_DIR / "user.txt").read_text(encoding="utf-8")

        explainability_results = await run_explainability_audit(
            state=state,
            provider=self._provider,
            system_prompt=system_prompt,
            user_template=user_template,
            fallback_provider=_grok_provider(),
        )
        explainability_score = explainability_results.get("explainability_score", 0.90)

        # 7. Trust score computation (confidence)
        trust_results = calculate_trust_score(
            state=state,
            validation_status=val_status,
            evidence_coverage=evidence_coverage,
            consistency_score=consistency_score,
            hallucination_risk=hallucination_risk,
            governance_score=governance_score
        )
        overall_trust = trust_results["overall_trust_score"]
        overall_confidence = trust_results["overall_confidence"]

        # 8. Executive audit compilation
        audit_findings = compile_audit_report(
            validation_results=validation_results,
            consistency_results=consistency_results,
            evidence_results=evidence_results,
            hallucination_results=hallucination_results,
            trust_results=trust_results,
            explainability_results=explainability_results
        )

        # Assemble ReflectionPayload
        payload = ReflectionPayload(
            validation_status=val_status,
            overall_trust_score=overall_trust,
            overall_confidence=overall_confidence,
            evidence_coverage=evidence_coverage,
            business_alignment_score=consistency_score,
            strategy_consistency_score=consistency_score,
            hallucination_risk=hallucination_risk,
            governance_score=governance_score,
            explainability_score=explainability_score,
            audit_summary=audit_findings["audit_verdict"],
            warnings=audit_findings["warnings"],
            critical_findings=audit_findings["critical_findings"],
            missing_information=audit_findings["missing_information"],
            contradictions=audit_findings["contradictions"],
            unsupported_claims=audit_findings["unsupported_claims"],
            improvement_suggestions=audit_findings["improvement_suggestions"],
            validation_timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            validation_version="1.0.0",
            supporting_evidence=evidence_results["supporting_evidence"],
            execution_metadata={
                "explainability_summary": explainability_results.get("executive_summary", ""),
                "why_selected": explainability_results.get("why_selected", ""),
                "why_alternatives_rejected": explainability_results.get("why_alternatives_rejected", ""),
                "evidence_influence": explainability_results.get("evidence_influence", ""),
                "business_reasoning_summary": explainability_results.get("business_reasoning_summary", "")
            }
        )

        # Wrap in ReflectionArtifact
        state.reflection_artifact = ReflectionArtifact(
            artifact_id=str(uuid.uuid4()),
            workflow_id=state.workflow_id,
            agent_name="reflection",
            schema_version="1.0.0",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
            provider=self._provider.__class__.__name__,
            confidence=overall_trust,
            payload=payload
        )

        elapsed_ms = int((time.time() - start_time) * 1000)
        state.execution_logs.append(
            f"reflection: completed audit in {elapsed_ms}ms with status '{val_status}' "
            f"(trust: {overall_trust:.4f}, governance: {governance_score:.4f}, contradictions: {len(payload.contradictions)})"
        )

        # Record AgentExecutionMetadata
        in_chars = len(state.transcript)
        out_chars = len(str(payload.model_dump()))
        input_tokens = in_chars // 4
        output_tokens = out_chars // 4
        total_tokens = input_tokens + output_tokens
        cost = (input_tokens * 0.000000075) + (output_tokens * 0.00000030)

        meta = AgentExecutionMetadata(
            agent_name="Reflection Agent",
            provider=self._provider.__class__.__name__,
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
        state.agent_metadata["reflection"] = meta

        # Record AgentExecutionLog for compatibility
        log_record = AgentExecutionLog(
            agent_name="Reflection Agent",
            started=meta.started_at,
            completed=meta.completed_at,
            duration_ms=elapsed_ms,
            provider=meta.provider,
            prompt_version="1.0.0",
            confidence=overall_trust,
            warnings=payload.warnings,
            errors=payload.critical_findings,
            evidence_count=len(payload.supporting_evidence)
        )
        state.agent_logs["reflection"] = log_record

        return state
