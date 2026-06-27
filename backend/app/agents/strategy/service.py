# Contains: service.py — Strategy Intelligence Agent service (Sprint 6).
# Replaces MockStrategyAgent. Implements the full strategy pipeline:
#   DecisionPackage → Optimizer → Simulator → Provider → Comparison → Validator → StrategyPackage
import json
import logging
import time
import uuid
from pathlib import Path

from app.contracts.strategy import StrategyAgent
from app.core.config import settings
from app.schemas.state import (
    WorkflowState,
    StrategyPackage,
    BusinessImpactAnalysis,
    ExecutionPhase,
    AgentExecutionMetadata,
    AgentExecutionLog,
    StrategyArtifact,
)
from app.agents.strategy.optimizer import optimize_recommendations
from app.agents.strategy.simulator import simulate_scenarios
from app.agents.strategy.comparison import compare_recommendations
from app.agents.strategy.validator import validate_strategy_package
from app.agents.strategy.providers.base import StrategyProvider
from app.agents.strategy.providers.gemini import GeminiStrategyProvider
from app.agents.strategy.providers.grok import GrokStrategyProvider
from app.agents.strategy.providers.mock import MockStrategyProvider

logger = logging.getLogger("decision_os.strategy.service")

_PROMPT_DIR = Path(__file__).resolve().parent / "prompts"


def _build_provider() -> StrategyProvider:
    provider_name = settings.context_provider.lower()
    if provider_name == "gemini" and settings.gemini_api_key:
        return GeminiStrategyProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
    if provider_name == "grok" and settings.grok_api_key:
        return GrokStrategyProvider(
            api_key=settings.grok_api_key,
            model=settings.grok_model,
            base_url=settings.grok_base_url,
        )
    logger.warning("No LLM key found or provider is mock. Falling back to MockStrategyProvider.")
    return MockStrategyProvider()


def _parse_execution_phases(raw_plan: list) -> list[ExecutionPhase]:
    """Convert raw LLM phase dicts into validated ExecutionPhase objects."""
    phases = []
    for item in raw_plan:
        if not isinstance(item, dict):
            continue
        try:
            phase = ExecutionPhase(
                name=item.get("name") or "Unnamed Phase",
                description=item.get("description") or "No description provided.",
                duration_days=max(1, int(item.get("duration_days") or 7)),
                milestones=item.get("milestones") or [],
                owner=item.get("owner") or "Project Lead",
                dependencies=item.get("dependencies") or [],
                status=item.get("status") or "planned",
            )
            phases.append(phase)
        except Exception as e:
            logger.warning(f"Skipping malformed execution phase: {e}")
    return phases


def _derive_priority(success_probability: float, opportunity_score: float) -> str:
    """Derive priority from success probability and opportunity score."""
    combined = (success_probability * 0.6) + (opportunity_score * 0.4)
    if combined >= 0.85:
        return "Critical"
    if combined >= 0.65:
        return "High"
    if combined >= 0.40:
        return "Medium"
    return "Low"


def _select_best_scenario(success_probability: float) -> str:
    """
    Select which scenario to surface as the recommended one.
    Conservative if probability < 0.45, Optimistic if > 0.75, Realistic otherwise.
    """
    if success_probability < 0.45:
        return "conservative"
    if success_probability > 0.75:
        return "optimistic"
    return "realistic"


class StrategyService(StrategyAgent):
    def __init__(self) -> None:
        self._provider: StrategyProvider = _build_provider()

    async def execute(self, state: WorkflowState) -> WorkflowState:
        logger.info("Executing Strategy Intelligence Agent...")
        state.execution_logs.append("strategy: starting strategy intelligence worker")
        start_time = time.time()

        # ── Guard: Decision Package must exist ──────────────────────────────────
        if not state.decision_artifact or not state.decision_artifact.payload:
            state.execution_logs.append("strategy: failed — no decision_package in state")
            state.final_action = "Error: decision package missing — cannot generate strategy."
            return state

        decision_pkg = state.decision_artifact.payload

        try:
            # ── Step 1: Log decision package loaded ────────────────────────────
            state.execution_logs.append(
                f"strategy: decision package loaded "
                f"({len(decision_pkg.recommendations)} recommendations)"
            )

            # ── Step 2: Deterministic Optimizer ────────────────────────────────
            opt_result = optimize_recommendations(decision_pkg)
            state.execution_logs.append(
                f"strategy: optimizer selected '{opt_result.best_recommendation_title}' "
                f"(score={opt_result.composite_score:.4f})"
            )

            # ── Step 3: Business Simulator — 3 scenarios ───────────────────────
            simulation_result, scenario_outcomes = simulate_scenarios(decision_pkg, opt_result)
            state.execution_logs.append(
                f"strategy: simulation completed — "
                f"optimistic ROI={simulation_result.optimistic_roi:.2f}, "
                f"realistic ROI={simulation_result.realistic_roi:.2f}, "
                f"conservative ROI={simulation_result.conservative_roi:.2f}"
            )

            # ── Step 4: LLM Provider (strategy enrichment) ─────────────────────
            system_prompt = (_PROMPT_DIR / "system.txt").read_text(encoding="utf-8")
            user_template = (_PROMPT_DIR / "user.txt").read_text(encoding="utf-8")

            decision_pkg_dict = {
                "executive_summary": decision_pkg.executive_summary,
                "business_goal": decision_pkg.business_goal,
                "assumptions": decision_pkg.assumptions,
                "constraints": decision_pkg.constraints,
                "tradeoffs": decision_pkg.tradeoffs,
                "decision_reasoning": decision_pkg.decision_reasoning,
                "business_scores": decision_pkg.business_scores,
                "recommendations": [
                    {
                        "id": r.id,
                        "rank": r.rank,
                        "title": r.title,
                        "description": r.description,
                        "timeline": r.timeline,
                        "required_resources": r.required_resources,
                        "risks": r.risks,
                        "risk_level": r.risk_level,
                        "confidence": r.confidence,
                    }
                    for r in decision_pkg.recommendations
                ],
                "missing_information": decision_pkg.missing_information,
            }
            opt_result_dict = {
                "best_recommendation_title": opt_result.best_recommendation_title,
                "ranked_titles": opt_result.ranked_recommendation_titles,
                "optimization_scores": opt_result.optimization_scores,
                "complexity": opt_result.complexity,
            }

            user_prompt = user_template.replace(
                "{decision_package_json}", json.dumps(decision_pkg_dict, indent=2)
            )
            user_prompt = user_prompt.replace(
                "{context_json}", json.dumps(state.context_artifact.payload if state.context_artifact else {}, indent=2)
            )
            user_prompt = user_prompt.replace(
                "{optimization_result_json}", json.dumps(opt_result_dict, indent=2)
            )

            provider_used = self._provider.__class__.__name__
            try:
                raw_strategy = await self._provider.generate_strategy(
                    system_prompt=system_prompt, user_prompt=user_prompt
                )
            except Exception as exc:
                logger.error(f"Provider {provider_used} failed: {exc}. Falling back to mock.")
                state.execution_logs.append(f"strategy: provider fallback triggered ({exc})")
                raw_strategy = await MockStrategyProvider().generate_strategy(
                    system_prompt=system_prompt, user_prompt=user_prompt
                )
                provider_used = "MockStrategyProvider (fallback)"

            # ── Step 5: Parse execution plan ───────────────────────────────────
            raw_phases = raw_strategy.get("execution_plan") or []
            execution_phases = _parse_execution_phases(raw_phases)

            # Ensure minimum 1 phase
            if not execution_phases:
                execution_phases = [
                    ExecutionPhase(
                        name="Phase 1 — Initial Execution",
                        description="Execute the primary strategy according to the selected recommendation.",
                        duration_days=14,
                        milestones=["Kickoff completed", "Initial deliverables validated"],
                        owner="Project Lead",
                    )
                ]

            # ── Step 6: Comparison Engine ──────────────────────────────────────
            comparison_result = compare_recommendations(decision_pkg, opt_result)
            state.execution_logs.append(
                f"strategy: comparison complete — winner '{comparison_result.winner_title}'"
            )

            # ── Step 7: Assemble Business Impact Analysis ──────────────────────
            business_impact = BusinessImpactAnalysis(
                revenue_increase=simulation_result.base_revenue_impact,
                operational_savings=simulation_result.base_operational_savings,
                customer_retention=simulation_result.base_customer_retention,
                risk_reduction=simulation_result.base_risk_reduction,
                productivity_improvement=simulation_result.base_productivity_improvement,
                decision_cycle_reduction=simulation_result.base_decision_cycle_reduction,
                revenue_increase_explanation=(
                    f"Estimated revenue uplift of ${simulation_result.base_revenue_impact:,.2f} "
                    f"based on opportunity score of {decision_pkg.business_scores.get('opportunity_score', 0):.0%}."
                ),
                operational_savings_explanation=(
                    f"Operational savings of ${simulation_result.base_operational_savings:,.2f} "
                    f"projected from infrastructure consolidation and automation gains."
                ),
            )

            # ── Step 8: Derive summary metrics ────────────────────────────────
            realistic_prob = simulation_result.realistic_probability
            realistic_roi = simulation_result.realistic_roi
            opportunity_score = decision_pkg.business_scores.get("opportunity_score", 0.5)
            overall_confidence = decision_pkg.confidence_split.get("overall_confidence", 0.5)
            selected_scenario = _select_best_scenario(realistic_prob)
            priority = _derive_priority(realistic_prob, opportunity_score)

            # Total execution timeline = sum of all phase durations
            total_days = sum(p.duration_days for p in execution_phases)
            implementation_timeline = f"{total_days} days"

            # ── Step 9: Assemble StrategyPackage ──────────────────────────────
            strategy_pkg = StrategyPackage(
                selected_strategy=raw_strategy.get("selected_strategy")
                    or opt_result.best_recommendation_title,
                alternative_strategies=raw_strategy.get("alternative_strategies") or [],
                business_rationale=raw_strategy.get("business_rationale") or comparison_result.winner_reasoning,
                expected_business_outcome=raw_strategy.get("expected_business_outcome") or "",
                estimated_success_probability=realistic_prob,
                estimated_roi=realistic_roi,
                implementation_complexity=opt_result.complexity,
                implementation_timeline=implementation_timeline,
                estimated_cost=simulation_result.realistic_cost,
                business_impact=business_impact,
                execution_plan=execution_phases,
                dependencies=raw_strategy.get("dependencies") or [],
                risks=raw_strategy.get("risks") or [],
                mitigation_plan=raw_strategy.get("mitigation_plan") or [],
                required_resources=raw_strategy.get("required_resources") or [],
                stakeholder_plan=raw_strategy.get("stakeholder_plan") or [],
                priority=priority,
                confidence=round(overall_confidence, 4),
                supporting_evidence=raw_strategy.get("supporting_evidence") or decision_pkg.audit_trail[-3:],
                execution_metadata={
                    "provider_used": provider_used,
                    "execution_time_ms": int((time.time() - start_time) * 1000),
                    "optimizer_score": opt_result.composite_score,
                    "scenarios_simulated": 3,
                    "comparison_winner": comparison_result.winner_title,
                    "comparison_summary": comparison_result.comparison_summary,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
                scenarios=scenario_outcomes,
                selected_scenario=selected_scenario,
                schema_version="1.0.0",
                generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )

            # ── Step 10: Validate ──────────────────────────────────────────────
            validate_strategy_package(strategy_pkg)

            # ── Step 11: Update WorkflowState ─────────────────────────────────
            state.strategy_artifact = StrategyArtifact(
                artifact_id=str(uuid.uuid4()),
                workflow_id=state.workflow_id,
                agent_name="strategy",
                schema_version="1.0.0",
                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
                provider=provider_used,
                confidence=strategy_pkg.confidence,
                payload=strategy_pkg
            )
            
            state.final_action = (
                f"Strategy: {strategy_pkg.selected_strategy} | "
                f"Priority: {strategy_pkg.priority} | "
                f"ROI: ${strategy_pkg.estimated_roi:,.2f} | "
                f"Timeline: {strategy_pkg.implementation_timeline}"
            )

            elapsed_ms = int((time.time() - start_time) * 1000)
            state.execution_logs.append(
                f"strategy: completed in {elapsed_ms}ms — "
                f"strategy='{strategy_pkg.selected_strategy}', "
                f"priority={strategy_pkg.priority}, "
                f"ROI=${strategy_pkg.estimated_roi:,.2f}, "
                f"probability={strategy_pkg.estimated_success_probability:.0%}, "
                f"phases={len(strategy_pkg.execution_plan)}"
            )

            # ── Step 12: Agent Metadata & Execution Log (Sprint 5.5 pattern) ──
            in_chars = len(json.dumps(decision_pkg_dict))
            out_chars = len(json.dumps(raw_strategy))
            input_tokens = in_chars // 4
            output_tokens = out_chars // 4
            total_tokens = input_tokens + output_tokens
            cost = (input_tokens * 0.000000075) + (output_tokens * 0.00000030)

            # Populate unified agent execution metadata
            meta = AgentExecutionMetadata(
                agent_name="Strategy Agent",
                provider=provider_used,
                model=settings.gemini_model,
                latency_ms=elapsed_ms,
                token_usage={
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens,
                },
                estimated_cost=round(cost, 6),
                started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time)),
                completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                status="completed",
                retry_count=0,
                version="1.0.0"
            )
            state.agent_metadata["strategy"] = meta
            
            # Maintain backward compatibility log
            log_record = AgentExecutionLog(
                agent_name="Strategy Agent",
                started=meta.started_at,
                completed=meta.completed_at,
                duration_ms=elapsed_ms,
                provider=provider_used,
                prompt_version="1.0.0",
                confidence=strategy_pkg.confidence,
                warnings=[],
                errors=[],
                evidence_count=len(strategy_pkg.supporting_evidence),
            )
            state.agent_logs["strategy"] = log_record

        except Exception as exc:
            logger.error(f"Strategy agent execution failed: {exc}")
            state.execution_logs.append(f"strategy: execution failed — {exc}")
            state.final_action = f"Error during strategy generation: {exc}"

        return state
