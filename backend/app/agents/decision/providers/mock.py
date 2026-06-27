# Contains: mock.py implementation.
import logging
from app.agents.decision.providers.base import DecisionProvider

logger = logging.getLogger("decision_os.decision.providers.mock")

class MockDecisionProvider(DecisionProvider):
    async def analyze(self, system_prompt: str, user_prompt: str) -> dict:
        logger.info("Executing Mock Decision Provider...")
        
        # Expanded mock payload matching Sprint 5 / 5.5 specifications
        return {
            "executive_summary": "Phased legacy database migration blueprint targeting zero-downtime cutovers.",
            "business_goal": "Migrate core legacy databases to enterprise cloud platform with zero downtime.",
            "buying_stage": "proposal",
            "customer_intent": "Validate compliance standards, evaluate costs, and initiate a phased migration pilot.",
            "business_problem": "Legacy infrastructure is causing high maintenance overhead and scaling bottlenecks.",
            "estimated_revenue": 175000.0,
            "estimated_time_to_close": 45,
            "urgency": "high",
            "stakeholders": ["Chief Information Officer", "Director of Systems Engineering"],
            "assumptions": [
                "Target environment supports PostgreSQL compatibility schemas.",
                "Client security reviews can be finished within 2 weeks."
            ],
            "constraints": [
                "Production migrations must align with holiday freeze schedules.",
                "Security compliance requires end-to-end data encryption."
            ],
            "tradeoffs": [
                "Phased approach increases project duration but minimizes data cutover failures.",
                "Direct cutover saves 15 days but carries significant risk."
            ],
            "decision_reasoning": "A sandbox pilot followed by an independent compliance audit is the safest path to mitigate cutover risks.",
            "business_risks": [
                "Data loss or corruption during migration cutover.",
                "Compliance check failures under strict security playbooks."
            ],
            "business_opportunities": [
                "Reduce operational infrastructure overhead by 40%.",
                "Unlock microsecond database query performance scaling."
            ],
            "missing_information": [
                "Specific database sizing and storage volume requirements.",
                "Budget approval workflow and sign-off thresholds."
            ],
            "reasoning_summary": (
                "Based on database playbooks, standard operational compliance procedures mandate a phased "
                "sandbox dry-run before cutting over production. The opportunity has strong executive backing, "
                "but risk mitigation requires comprehensive pilot testing and security checklists."
            ),
            "affected_kpis": [
                "System Uptime Percentage",
                "Migration Duration Hours",
                "Monthly Infrastructure Cost Savings"
            ],
            "next_required_information": [
                "Retrieve sizing metrics for target databases.",
                "Schedule alignment session with Compliance Officer."
            ],
            "recommended_actions": [
                {
                    "id": "rec-1",
                    "rank": 1,
                    "title": "Primary Action: Sandbox Pilot & Compliance Review",
                    "description": "Establish a mirrored database sandbox, perform compliance runs, and document cutover times.",
                    "reasoning": "Validates migration playbooks without impacting production database nodes.",
                    "benefits": ["Zero production impact", "Comprehensive compliance validation"],
                    "tradeoffs": ["Requires 2 weeks setup time", "Extra staging environment overhead"],
                    "risks": ["Misconfigured sandbox may yield false positive test results"],
                    "timeline": "14 days",
                    "required_resources": ["Staging Cloud Account", "Database Migration Architect"],
                    "kpis": ["Sandbox Validation Success Rate", "Compliance Checklist Completion"],
                    "confidence": 0.95,
                    "evidence_ids": ["chunk-12"],
                    "why_this_recommendation": "Sandbox migrations are mandatory under compliance playbook Section 4.",
                    "supporting_evidence": "All core database migrations must establish a sandbox environment to run compliance tests before final cutover.",
                    "citation": "Technical Playbook • Page 12 • Discovery Process",
                    "retrieval_reason": "Verifies mandatory sandbox environment requirements.",
                    "document_source": "Technical Playbook.pdf",
                    "similarity_score": 0.94,
                    "assumptions_made": ["Staging environment mirrors production schema."]
                },
                {
                    "id": "rec-2",
                    "rank": 2,
                    "title": "Alternative Action: Direct Phased Migration",
                    "description": "Initiate direct database migration starting with non-critical low-traffic microservices.",
                    "reasoning": "Shortens timelines by bypassing secondary dry-runs for secondary workloads.",
                    "benefits": ["Accelerates project schedule by 10 days", "Faster feedback loops"],
                    "tradeoffs": ["Higher risk of operational downtime on microservices"],
                    "risks": ["Data mismatches can disrupt microservice communications"],
                    "timeline": "21 days",
                    "required_resources": ["DevOps Engineer", "Data Synchronization Script"],
                    "kpis": ["Service Uptime Rate", "Cutover Sync Speed"],
                    "confidence": 0.75,
                    "evidence_ids": ["chunk-4"],
                    "why_this_recommendation": "Direct cutovers are authorized only for low-tier test microservices.",
                    "supporting_evidence": "A direct cutover is acceptable only for non-production secondary endpoints.",
                    "citation": "Operations Playbook • Page 4 • Database Cutover",
                    "retrieval_reason": "Outlines direct cutover guidelines for non-critical databases.",
                    "document_source": "Operations Playbook.docx",
                    "similarity_score": 0.88,
                    "assumptions_made": ["Microservices can sustain temporary latency spikes."]
                },
                {
                    "id": "rec-3",
                    "rank": 3,
                    "title": "Fallback Action: Infrastructure Freeze & Tuning",
                    "description": "Postpone migration, optimize existing local queries, and configure read replicas on-premise.",
                    "reasoning": "Ensures uptime stability if compliance checks fail for target cloud environment.",
                    "benefits": ["Zero cutover risk", "Immediate query performance boost on local cluster"],
                    "tradeoffs": ["Does not address long-term server capacity limitations"],
                    "risks": ["On-premise hardware degradation continues"],
                    "timeline": "7 days",
                    "required_resources": ["Database Administrator", "Local Tuning Tools"],
                    "kpis": ["Local Query Latency Percentile", "Server CPU utilization"],
                    "confidence": 0.5,
                    "evidence_ids": ["chunk-2"],
                    "why_this_recommendation": "Acts as standard operating procedure when cloud migrations are blocked.",
                    "supporting_evidence": "When migration risks exceed acceptable limits, on-premise replica tuning must be executed as a fallback strategy.",
                    "citation": "Disaster Recovery Playbook • Page 2 • Fallback Protocols",
                    "retrieval_reason": "Provides guidelines on fallback tuning when migration cutover is too risky.",
                    "document_source": "Disaster Recovery Playbook.txt",
                    "similarity_score": 0.81,
                    "assumptions_made": ["On-premise server has adequate CPU head-room for tuning."]
                }
            ]
        }
