# Contains: providers/mock.py — Mock provider for Strategy Intelligence Agent (dev/test use).
import logging
from app.agents.strategy.providers.base import StrategyProvider

logger = logging.getLogger("decision_os.strategy.providers.mock")


class MockStrategyProvider(StrategyProvider):
    async def generate_strategy(self, *, system_prompt: str, user_prompt: str) -> dict:
        logger.info("Executing Mock Strategy Provider...")

        return {
            "selected_strategy": "Phased Sandbox Migration with Compliance Gate",
            "business_rationale": (
                "A phased sandbox approach balances risk mitigation with delivery speed. "
                "Compliance validation gates ensure enterprise security standards are maintained "
                "throughout the migration lifecycle, protecting both data integrity and business continuity."
            ),
            "expected_business_outcome": (
                "Complete zero-downtime database migration within 45 days, achieving 40% "
                "reduction in infrastructure operational overhead and enabling microsecond-latency "
                "query performance at enterprise scale."
            ),
            "execution_plan": [
                {
                    "name": "Phase 1 — Discovery & Sandbox Setup",
                    "description": "Establish mirrored sandbox environment and configure compliance tooling.",
                    "duration_days": 7,
                    "milestones": [
                        "Sandbox environment provisioned",
                        "Initial schema migration scripts tested",
                        "Compliance checklist baseline established",
                    ],
                    "owner": "Database Migration Architect",
                    "dependencies": [],
                    "status": "planned",
                },
                {
                    "name": "Phase 2 — Compliance Validation",
                    "description": "Execute full compliance audit on sandbox data, document all findings.",
                    "duration_days": 7,
                    "milestones": [
                        "Security compliance audit completed",
                        "Data encryption verification passed",
                        "Compliance Officer sign-off obtained",
                    ],
                    "owner": "Compliance Officer",
                    "dependencies": ["Phase 1 — Discovery & Sandbox Setup"],
                    "status": "planned",
                },
                {
                    "name": "Phase 3 — Pilot Migration (Non-Critical)",
                    "description": "Migrate non-critical microservice databases under controlled conditions.",
                    "duration_days": 10,
                    "milestones": [
                        "5 non-critical databases migrated",
                        "Performance benchmarks validated",
                        "Rollback procedures tested",
                    ],
                    "owner": "DevOps Engineer",
                    "dependencies": ["Phase 2 — Compliance Validation"],
                    "status": "planned",
                },
                {
                    "name": "Phase 4 — Production Cutover",
                    "description": "Execute production migration with full monitoring and rollback readiness.",
                    "duration_days": 14,
                    "milestones": [
                        "All production databases migrated",
                        "Zero-downtime cutover confirmed",
                        "Post-migration performance validated",
                    ],
                    "owner": "Chief Information Officer",
                    "dependencies": ["Phase 3 — Pilot Migration (Non-Critical)"],
                    "status": "planned",
                },
                {
                    "name": "Phase 5 — Stabilization & Handoff",
                    "description": "Monitor production systems, resolve issues, and transition to operational ownership.",
                    "duration_days": 7,
                    "milestones": [
                        "30-day uptime stability confirmed",
                        "Operational runbook delivered",
                        "Project closure sign-off",
                    ],
                    "owner": "Systems Engineering Director",
                    "dependencies": ["Phase 4 — Production Cutover"],
                    "status": "planned",
                },
            ],
            "dependencies": [
                "Staging cloud account provisioned and accessible",
                "Security compliance team available for 2-week review window",
                "Client IT team sign-off on migration window scheduling",
                "Database migration architect engaged full-time",
            ],
            "mitigation_plan": [
                "Deploy automated rollback scripts for each migration phase gate",
                "Maintain read-replica on-premise until 30-day post-migration stability confirmed",
                "Establish 24/7 on-call rotation during Phase 4 production cutover window",
                "Pre-stage all compliance documentation 5 business days before cutover",
            ],
            "stakeholder_plan": [
                "CIO: Executive sponsor — weekly status briefings, final cutover approval authority",
                "Director of Systems Engineering: Technical owner — daily stand-ups during Phases 3–4",
                "Compliance Officer: Regulatory gate keeper — required sign-off at Phase 2 gate",
                "Database Migration Architect: Technical lead — full-time engagement for 45 days",
                "DevOps Engineer: Operational executor — activated for Phase 3 onwards",
            ],
            "risks": [
                "Data loss or corruption during production cutover window",
                "Compliance audit failure causing phase gate blockage",
                "Misconfigured sandbox yielding inaccurate test results",
                "Holiday schedule freeze conflicting with production migration window",
            ],
            "required_resources": [
                "Staging Cloud Account",
                "Database Migration Architect",
                "DevOps Engineer",
                "Compliance Officer",
                "Systems Engineering Director",
            ],
            "alternative_strategies": [
                "Direct Phased Migration (bypasses sandbox for non-critical services, faster by 10 days but higher risk)",
                "Infrastructure Freeze & On-Premise Optimization (zero cutover risk, does not address scaling limits)",
            ],
            "supporting_evidence": [
                "Technical Playbook • Page 12 • Discovery Process",
                "Operations Playbook • Page 4 • Database Cutover",
                "Disaster Recovery Playbook • Page 2 • Fallback Protocols",
            ],
        }
