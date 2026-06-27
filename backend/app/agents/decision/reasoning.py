# Contains: reasoning.py implementation.
from typing import Any
import time
import json
import logging
from app.core.config import settings
from app.schemas.state import DecisionPackage, DecisionAnalysis, Recommendation
from app.agents.decision.confidence import calculate_confidence
from app.agents.decision.scoring import calculate_business_scores
from app.agents.decision.rules import BusinessRuleEngine
from app.agents.decision.validator import validate_decision_package, DecisionValidationError
from app.agents.decision.providers.base import DecisionProvider
from app.agents.decision.providers.gemini import GeminiDecisionProvider
from app.agents.decision.providers.grok import GrokDecisionProvider
from app.agents.decision.providers.mock import MockDecisionProvider

logger = logging.getLogger("decision_os.decision.reasoning")

class BusinessReasoningEngine:
    def __init__(self) -> None:
        self.provider = self._build_provider()
        self.rule_engine = BusinessRuleEngine()

    def _build_provider(self) -> DecisionProvider:
        provider_name = settings.context_provider.lower()
        if provider_name == "gemini" and settings.gemini_api_key:
            return GeminiDecisionProvider(api_key=settings.gemini_api_key, model=settings.gemini_model)
        if provider_name == "grok" and settings.grok_api_key:
            return GrokDecisionProvider(
                api_key=settings.grok_api_key,
                model=settings.grok_model,
                base_url=settings.grok_base_url,
            )
        logger.warning("No LLM key or provider is mock. Falling back to MockDecisionProvider.")
        return MockDecisionProvider()

    async def execute_reasoning(self, context: dict, evidence_package: Any) -> DecisionPackage:
        logger.info("Running reasoning pipeline: Context -> Evidence -> LLM Reasoning -> Rule Engine -> Scoring -> Ranking")
        start_time = time.time()
        audit_trail = ["Reasoning engine pipeline initialized."]

        # 1. Prepare prompts
        from pathlib import Path
        prompt_dir = Path(__file__).resolve().parent / "prompts"
        system_prompt = (prompt_dir / "system.txt").read_text(encoding="utf-8")
        user_template = (prompt_dir / "user.txt").read_text(encoding="utf-8")
        
        # Format evidence package for LLM review
        evidence_list = []
        if evidence_package and hasattr(evidence_package, "knowledge_results"):
            for res in evidence_package.knowledge_results:
                evidence_list.append({
                    "id": res.id,
                    "citation": res.citation,
                    "content": res.content,
                    "source": res.document_name,
                    "similarity": res.similarity_score
                })
        
        user_prompt = user_template.replace("{context_json}", json.dumps(context, indent=2))
        user_prompt = user_prompt.replace("{evidence_json}", json.dumps(evidence_list, indent=2))
        
        # 2. Query LLM provider (LLM Reasoning)
        provider_used = self.provider.__class__.__name__
        try:
            raw_analysis = await self.provider.analyze(system_prompt=system_prompt, user_prompt=user_prompt)
            audit_trail.append(f"Retrieved assessments from {provider_used}.")
        except Exception as e:
            logger.error(f"Provider {provider_used} failed: {e}. Initiated mock fallback.")
            audit_trail.append(f"Provider {provider_used} failed. Initiated mock fallback.")
            mock_provider = MockDecisionProvider()
            raw_analysis = await mock_provider.analyze(system_prompt=system_prompt, user_prompt=user_prompt)

        # 3. Deterministic Business Rule Engine Checks
        rule_results = self.rule_engine.evaluate_rules(context, raw_analysis)
        warnings = rule_results["warnings"]
        audit_trail.append(f"Deterministic business rule check complete: {len(warnings)} warnings flagged.")

        # 4. Split Confidence Calculation
        conf_results = calculate_confidence(context, evidence_list, provider_used)
        audit_trail.append("Split confidence scoring complete.")

        # 5. Deterministic Business Scoring
        score_results = calculate_business_scores(raw_analysis, conf_results)
        audit_trail.append("Deterministic business metrics calculation complete.")

        # 6. Recommendation Ranking & Traceable Evidence Joining
        recommendations = []
        raw_recs = raw_analysis.get("recommended_actions") or []
        
        # Enforce exactly 3 recommendations
        while len(raw_recs) < 3:
            raw_recs.append({
                "id": f"rec-pad-{len(raw_recs)+1}",
                "rank": len(raw_recs) + 1,
                "title": "General Phased Discovery",
                "description": "Gather operational sizing parameters before proceeding.",
                "reasoning": "Standard protocol fallback option.",
                "benefits": ["Reduces baseline uncertainty"],
                "tradeoffs": ["Requires extra meeting session"],
                "risks": ["Slight timeline expansion"],
                "timeline": "7 days",
                "required_resources": ["Sales Engineer"],
                "kpis": ["Discovery completed"],
                "confidence": 0.5,
                "evidence_ids": [],
                "why_this_recommendation": "To ensure correct deployment scale configurations.",
                "supporting_evidence": "Discovery procedures align target needs.",
                "citation": "Standard Playbook • Page 1",
                "retrieval_reason": "Outlines discovery guidelines.",
                "document_source": "Playbook.docx",
                "similarity_score": 0.7,
                "assumptions_made": []
            })
            
        raw_recs = raw_recs[:3] # Keep exactly 3
        
        traceable_evidence_used = []
        evidence_used_citations = []
        
        for idx, rec in enumerate(raw_recs):
            matched_evidence = None
            rec_citation = rec.get("citation")
            
            if evidence_package and hasattr(evidence_package, "knowledge_results"):
                for real_chunk in evidence_package.knowledge_results:
                    if real_chunk.citation == rec_citation or real_chunk.document_name in str(rec.get("document_source")):
                        matched_evidence = real_chunk
                        break
            
            # Populate evidence traceability fields
            if matched_evidence:
                citation_str = matched_evidence.citation
                source_str = matched_evidence.document_name
                sim_score = matched_evidence.similarity_score
                supporting_text = matched_evidence.content
                chunk_id = matched_evidence.id
                
                trace_item = {
                    "document_id": source_str,
                    "chunk_id": chunk_id,
                    "similarity_score": sim_score,
                    "quoted_evidence": supporting_text,
                    "confidence": sim_score
                }
                traceable_evidence_used.append(trace_item)
                evidence_used_citations.append(citation_str)
                evidence_ids_list = [chunk_id]
                audit_trail.append(f"Linked action {idx+1} to verified chunk ID: '{chunk_id}'")
            else:
                citation_str = rec.get("citation") or "General Knowledge Base"
                source_str = rec.get("document_source") or "Internal SOP"
                sim_score = float(rec.get("similarity_score") or 0.0)
                supporting_text = rec.get("supporting_evidence") or "Standard compliance guidelines."
                chunk_id = "default-chunk-id"
                
                trace_item = {
                    "document_id": source_str,
                    "chunk_id": chunk_id,
                    "similarity_score": sim_score,
                    "quoted_evidence": supporting_text,
                    "confidence": sim_score
                }
                traceable_evidence_used.append(trace_item)
                evidence_ids_list = rec.get("evidence_ids") or []
                audit_trail.append(f"Linked action {idx+1} to mock reference: '{citation_str}'")

            rec_obj = Recommendation(
                id=rec.get("id") or f"rec-{idx+1}",
                rank=idx + 1,
                title=rec.get("title") or "Unnamed Recommendation",
                description=rec.get("description") or "No description provided.",
                reasoning=rec.get("reasoning") or "Option details reasoning.",
                benefits=rec.get("benefits") or [],
                tradeoffs=rec.get("tradeoffs") or [],
                risks=rec.get("risks") or [],
                timeline=rec.get("timeline") or "7 days",
                required_resources=rec.get("required_resources") or [],
                kpis=rec.get("kpis") or [],
                confidence=float(rec.get("confidence") or 0.5),
                evidence_ids=evidence_ids_list,
                why_this_recommendation=rec.get("why_this_recommendation") or "Explainability details",
                supporting_evidence=supporting_text,
                citation=citation_str,
                retrieval_reason=rec.get("retrieval_reason") or "Validates core action guidelines.",
                document_source=source_str,
                similarity_score=sim_score,
                assumptions_made=rec.get("assumptions_made") or []
            )
            recommendations.append(rec_obj)

        # 7. Assemble core DecisionAnalysis object for backward compatibility
        analysis_obj = DecisionAnalysis(
            business_goal=raw_analysis.get("business_goal") or "Primary goal optimization",
            customer_intent=raw_analysis.get("customer_intent") or "Evaluate services",
            buying_stage=raw_analysis.get("buying_stage") or "discovery",
            business_problem=raw_analysis.get("business_problem") or "Operations bottlenecks",
            decision_readiness=score_results["decision_readiness"],
            opportunity_score=score_results["opportunity_score"],
            risk_score=score_results["risk_score"],
            priority_score=score_results["priority_score"],
            business_value_score=score_results["business_value_score"],
            confidence_score=conf_results["overall_confidence"],
            estimated_revenue=float(raw_analysis.get("estimated_revenue") or 0.0),
            estimated_time_to_close=int(raw_analysis.get("estimated_time_to_close") or 30),
            stakeholders=raw_analysis.get("stakeholders") or [],
            business_risks=raw_analysis.get("business_risks") or [],
            business_opportunities=raw_analysis.get("business_opportunities") or [],
            missing_information=raw_analysis.get("missing_information") or [],
            recommended_actions=recommendations,
            reasoning_summary=raw_analysis.get("reasoning_summary") or "Core assessment summary",
            evidence_used=evidence_used_citations,
            affected_kpis=raw_analysis.get("affected_kpis") or [],
            next_required_information=raw_analysis.get("next_required_information") or []
        )

        # 8. Assemble final expanded DecisionPackage
        exec_metadata = {
            "provider_used": provider_used,
            "execution_time_ms": int((time.time() - start_time) * 1000),
            "evidence_count": len(evidence_list),
            "timestamp": str(time.time())
        }
        
        decision_pkg = DecisionPackage(
            executive_summary=raw_analysis.get("executive_summary") or raw_analysis.get("reasoning_summary") or "Executive brief.",
            business_goal=raw_analysis.get("business_goal") or "Primary goal optimization",
            assumptions=raw_analysis.get("assumptions") or [],
            constraints=raw_analysis.get("constraints") or [],
            tradeoffs=raw_analysis.get("tradeoffs") or [],
            decision_reasoning=raw_analysis.get("decision_reasoning") or "Reasoning details.",
            business_scores=score_results,
            confidence=conf_results,
            confidence_split=conf_results["confidence_split"],
            recommendations=recommendations,
            missing_information=raw_analysis.get("missing_information") or [],
            evidence_used=traceable_evidence_used,
            generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            schema_version="1.1.0",
            
            # Backward-compatible fields
            analysis=analysis_obj,
            evidence=evidence_list,
            execution_metadata=exec_metadata,
            audit_trail=audit_trail
        )

        # 9. Enforce validation check via validator.py
        validate_decision_package(decision_pkg)
        audit_trail.append("Decision package validation checks passed.")
        decision_pkg.audit_trail = audit_trail
        
        return decision_pkg
