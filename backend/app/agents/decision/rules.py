# Contains: rules.py implementation.
import logging

logger = logging.getLogger("decision_os.decision.rules")

class BusinessRuleEngine:
    def __init__(self) -> None:
        pass

    def evaluate_rules(self, context: dict, raw_analysis: dict) -> dict:
        logger.info("Evaluating deterministic business rules...")
        
        warnings = []
        rules_passed = []
        
        # 1. Budget Rule
        budget = context.get("budget")
        if not budget or str(budget).lower() in ["none", "unknown", "null", ""]:
            warnings.append("Context Warning: No budget details were explicitly outlined.")
        else:
            rules_passed.append("Rule Passed: Budget parameter verified in context.")
            
        # 2. Timeline Rule
        timeline = context.get("timeline")
        if not timeline or str(timeline).lower() in ["none", "unknown", "null", ""]:
            warnings.append("Context Warning: No project timeline details were specified.")
        else:
            rules_passed.append("Rule Passed: Timeline parameter verified in context.")
            
        # 3. Stakeholder Rule
        stakeholders = context.get("decision_makers") or []
        if not stakeholders:
            warnings.append("Context Warning: No key decision makers or stakeholders identified.")
        else:
            rules_passed.append("Rule Passed: Stakeholders verified in context.")
            
        # 4. Revenue Bounds Rule
        revenue = float(raw_analysis.get("estimated_revenue") or 0.0)
        if revenue <= 0.0:
            warnings.append("Analysis Warning: Deal value is currently unspecified or zero.")
        elif revenue >= 150000.0:
            rules_passed.append("Rule Passed: Enterprise tier deal size confirmed.")
        else:
            rules_passed.append("Rule Passed: Standard tier deal size confirmed.")
            
        # 5. Urgent Close Rule
        urgency = str(raw_analysis.get("urgency") or "medium").lower()
        if urgency == "low":
            warnings.append("Analysis Warning: Deal urgency is flagged as low priority.")
        else:
            rules_passed.append("Rule Passed: Priority urgency level verified.")
            
        logger.info(f"Business rules run complete. Warnings: {len(warnings)}, Rules Passed: {len(rules_passed)}")
        return {
            "warnings": warnings,
            "rules_passed": rules_passed
        }
