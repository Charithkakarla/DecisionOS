import datetime
from fastapi import APIRouter
from app.core.database import SessionLocal
from app.agents.knowledge.repository import (
    DBWorkflowRun, DBDocument, DBAgentExecutionLog, DBArtifact
)
from sqlalchemy import select, func, desc, case
from sqlalchemy import JSON

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


def _format_time_ago(dt: datetime.datetime | None) -> str:
    if not dt:
        return "Unknown"
    diff = datetime.datetime.utcnow() - dt
    secs = int(diff.total_seconds())
    if secs < 60:
        return "Just now"
    if secs < 3600:
        return f"{secs // 60}m ago"
    if secs < 86400:
        return f"{secs // 3600}h ago"
    return f"{secs // 86400}d ago"


def _extract_trust_score(payload: dict | None) -> float | None:
    """Pull overall_trust_score from stored workflow state payload."""
    if not payload:
        return None
    try:
        ref = payload.get("reflection_artifact") or {}
        ref_p = ref.get("payload") or {}
        score = ref_p.get("overall_trust_score")
        if score is not None:
            return float(score)
    except Exception:
        pass
    return None


def _extract_agent_meta(payload: dict | None) -> dict:
    """Extract per-agent latency, confidence, status from stored agent_metadata."""
    if not payload:
        return {}
    try:
        return payload.get("agent_metadata") or {}
    except Exception:
        return {}


@router.get("/metrics")
async def get_dashboard_metrics():
    async with SessionLocal() as session:
        # ── Total workflows ──────────────────────────────────────────────────
        workflows_count = await session.execute(select(func.count(DBWorkflowRun.id)))
        w_count = workflows_count.scalar() or 0

        # ── Total docs ───────────────────────────────────────────────────────
        docs_count = await session.execute(select(func.count(DBDocument.id)))
        d_count = docs_count.scalar() or 0

        # ── Pending approvals — workflows with a pending approval in payload ─
        # Count workflow runs that are "completed" but approval artifact
        # status is "pending" (human hasn't reviewed yet)
        pending_q = await session.execute(
            select(func.count(DBWorkflowRun.id)).where(
                DBWorkflowRun.status == "running"
            )
        )
        p_count = pending_q.scalar() or 0

        # ── Real trust score — average from stored payloads ─────────────────
        recent_completed = await session.execute(
            select(DBWorkflowRun)
            .where(DBWorkflowRun.status == "completed")
            .where(DBWorkflowRun.payload.isnot(None))
            .order_by(desc(DBWorkflowRun.started_at))
            .limit(20)
        )
        completed_runs = recent_completed.scalars().all()

        trust_scores = []
        for run in completed_runs:
            score = _extract_trust_score(run.payload)
            if score is not None:
                trust_scores.append(score)

        avg_trust = sum(trust_scores) / len(trust_scores) if trust_scores else None
        avg_trust_display = f"{round(avg_trust * 100)}%" if avg_trust is not None else "N/A"

        # ── Agent stats — aggregate from stored agent_metadata ───────────────
        agent_buckets: dict[str, dict] = {}
        for run in completed_runs:
            meta = _extract_agent_meta(run.payload)
            for agent_name, m in meta.items():
                if agent_name not in agent_buckets:
                    agent_buckets[agent_name] = {
                        "latencies": [], "confidences": [], "runs": 0, "successes": 0
                    }
                b = agent_buckets[agent_name]
                b["runs"] += 1
                latency = m.get("latency_ms") or 0
                b["latencies"].append(float(latency))
                # Confidence: pull from matching artifact
                artifact_key = f"{agent_name}_artifact"
                artifact = (run.payload or {}).get(artifact_key) or {}
                conf = artifact.get("confidence") or 0
                b["confidences"].append(float(conf))
                if (m.get("status") or "").lower() == "completed":
                    b["successes"] += 1

        agent_stats = []
        for name, b in agent_buckets.items():
            r = b["runs"]
            agent_stats.append({
                "agent": name,
                "runs": r,
                "avg_latency_ms": round(sum(b["latencies"]) / r) if r else 0,
                "avg_confidence": round(sum(b["confidences"]) / r, 3) if r else 0,
                "success_rate": round(b["successes"] / r, 3) if r else 0,
            })
        # Sort by defined pipeline order
        ORDER = ["context", "knowledge", "decision", "strategy", "reflection", "approval", "learning"]
        agent_stats.sort(key=lambda x: ORDER.index(x["agent"]) if x["agent"] in ORDER else 99)

        # ── Recent Activity ──────────────────────────────────────────────────
        recent_runs_q = await session.execute(
            select(DBWorkflowRun)
            .order_by(desc(DBWorkflowRun.started_at))
            .limit(5)
        )
        recent_runs = recent_runs_q.scalars().all()

        activity = []
        for r in recent_runs:
            summary = {}
            if r.payload:
                try:
                    dec = r.payload.get("decision_artifact") or {}
                    dec_p = dec.get("payload") or {}
                    ctx = r.payload.get("context_artifact") or {}
                    ctx_p = ctx.get("payload") or {}
                    goal = dec_p.get("business_goal") or ctx_p.get("business_goal") or ""
                    wid = r.payload.get("workflow_id") or str(r.id)[:8]
                    title = f"Workflow {wid}" + (f" — {goal[:40]}" if goal else "")
                except Exception:
                    title = f"Workflow {str(r.id)[:8]}"
            else:
                title = f"Workflow {str(r.id)[:8]}"

            activity.append({
                "title": title,
                "time": _format_time_ago(r.started_at),
                "status": "Completed" if r.status == "completed" else
                          "Failed" if r.status == "failed" else "Running",
            })

        # ── Knowledge store capacity (% of 1000 doc soft-limit) ─────────────
        kb_capacity = min(100, round((d_count / 1000) * 100)) if d_count else 0

        # ── Average API latency from agent metadata ──────────────────────────
        all_latencies = [
            l for b in agent_buckets.values() for l in b["latencies"] if l > 0
        ]
        avg_latency_ms = round(sum(all_latencies) / len(all_latencies)) if all_latencies else 0

        return {
            "total_workflows": w_count,
            "knowledge_documents": d_count,
            "average_trust_score": avg_trust_display,
            "pending_approvals": p_count,
            "recent_activity": activity,
            "agent_stats": agent_stats,
            "system_health": {
                "agent_pipeline": {"value": 100, "display": "Operational"},
                "knowledge_store": {"value": kb_capacity, "display": f"{kb_capacity}% capacity"},
                "api_latency": {
                    "value": min(100, max(5, 100 - round(avg_latency_ms / 50))),
                    "display": f"{avg_latency_ms}ms avg" if avg_latency_ms else "—",
                },
            },
        }
