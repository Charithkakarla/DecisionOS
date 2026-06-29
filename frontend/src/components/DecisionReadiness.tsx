import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import type { WorkflowState } from "../types/agent";

interface Props {
  workflowState: WorkflowState;
}

interface ReadinessMetric {
  label: string;
  weight: number;
  score: number;
  status: "ready" | "partial" | "missing";
  reason: string;
}

function computeReadiness(ws: WorkflowState): { metrics: ReadinessMetric[]; overall: number; missing: string[]; status: "ready" | "caution" | "not-ready" } {
  const ctx = ws.context_artifact?.payload as Record<string, any> | undefined;
  const kb = ws.knowledge_artifact?.payload;
  const dec = ws.decision_artifact?.payload;

  const metrics: ReadinessMetric[] = [
    {
      label: "Evidence Coverage",
      weight: 0.30,
      score: kb ? Math.min(1, (kb.knowledge_results?.length ?? 0) / 3) : 0,
      status: kb && (kb.knowledge_results?.length ?? 0) >= 3 ? "ready" : kb ? "partial" : "missing",
      reason: kb ? `${kb.knowledge_results?.length ?? 0} playbook chunks retrieved` : "No knowledge retrieved",
    },
    {
      label: "Context Completeness",
      weight: 0.20,
      score: ctx ? (ws.context_artifact?.confidence ?? 0) : 0,
      status: ctx && (ws.context_artifact?.confidence ?? 0) > 0.8 ? "ready" : ctx ? "partial" : "missing",
      reason: ctx ? `Confidence ${((ws.context_artifact?.confidence ?? 0) * 100).toFixed(0)}%` : "Context not extracted",
    },
    {
      label: "Stakeholder Alignment",
      weight: 0.15,
      score: ctx?.stakeholders?.length > 1 ? 1 : ctx?.stakeholders?.length === 1 ? 0.5 : 0.2,
      status: ctx?.stakeholders?.length > 1 ? "ready" : "partial",
      reason: ctx?.stakeholders?.length ? `${ctx.stakeholders.length} stakeholder(s) identified` : "No stakeholders identified",
    },
    {
      label: "Budget Clarity",
      weight: 0.10,
      score: ctx?.budget_discussed || ctx?.budget ? 1 : ctx?.financial_context ? 0.6 : 0.2,
      status: ctx?.budget_discussed || ctx?.budget ? "ready" : "partial",
      reason: ctx?.budget_discussed ? "Budget explicitly discussed" : "Budget details unclear",
    },
    {
      label: "Timeline Clarity",
      weight: 0.10,
      score: ctx?.timeline_discussed || ctx?.deadline ? 1 : ctx?.urgency_score > 0.5 ? 0.7 : 0.3,
      status: ctx?.timeline_discussed || ctx?.deadline ? "ready" : "partial",
      reason: ctx?.timeline_discussed ? "Timeline confirmed" : "Timeline not formally stated",
    },
    {
      label: "Compliance Coverage",
      weight: 0.10,
      score: ctx?.compliance_requirements?.length > 0 ? 1 : 0.4,
      status: ctx?.compliance_requirements?.length > 0 ? "ready" : "partial",
      reason: ctx?.compliance_requirements?.length > 0 ? `${ctx?.compliance_requirements?.length ?? 0} compliance req(s)` : "No compliance requirements captured",
    },
    {
      label: "Risk Identification",
      weight: 0.05,
      score: dec?.business_scores?.risk_score != null ? 1 : ctx?.risks?.length > 0 ? 0.7 : 0.3,
      status: dec?.business_scores?.risk_score != null ? "ready" : "partial",
      reason: dec ? `Risk score: ${((dec.business_scores?.risk_score ?? 0) * 100).toFixed(0)}%` : "Risks not fully assessed",
    },
  ];

  const overall = metrics.reduce((sum, m) => sum + m.score * m.weight, 0);
  const missing = metrics.filter(m => m.status === "missing" || m.score < 0.5).map(m => m.label);
  const status = overall >= 0.75 ? "ready" : overall >= 0.5 ? "caution" : "not-ready";

  return { metrics, overall, missing, status };
}

const CIRCUMFERENCE = 2 * Math.PI * 52;

export default function DecisionReadiness({ workflowState }: Props) {
  const { metrics, overall, missing, status } = useMemo(() => computeReadiness(workflowState), [workflowState]);

  const pct = Math.round(overall * 100);
  const dashOffset = CIRCUMFERENCE - CIRCUMFERENCE * overall;

  const gaugeColor = status === "ready" ? "#22c55e" : status === "caution" ? "#f59e0b" : "#ef4444";
  const statusLabel = status === "ready" ? "Ready to Decide" : status === "caution" ? "Proceed with Caution" : "Insufficient Information";
  const statusBg = status === "ready" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
    status === "caution" ? "bg-amber-50 border-amber-200 text-amber-800" :
      "bg-rose-50 border-rose-200 text-rose-800";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gauge */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-card">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Decision Readiness</p>
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={gaugeColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800">{pct}%</span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">Score</span>
            </div>
          </div>
          <span className={`mt-4 text-xs font-bold px-3 py-1.5 rounded-full border ${statusBg}`}>
            {statusLabel}
          </span>
        </div>

        {/* Metric bars */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Readiness Breakdown</p>
          <div className="space-y-3.5">
            {metrics.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {m.status === "ready" && <CheckCircle2 size={12} className="text-emerald-500" />}
                    {m.status === "partial" && <AlertTriangle size={12} className="text-amber-500" />}
                    {m.status === "missing" && <XCircle size={12} className="text-rose-500" />}
                    <span className="text-xs font-semibold text-slate-700">{m.label}</span>
                    <span className="text-[10px] text-slate-400">({(m.weight * 100).toFixed(0)}% weight)</span>
                  </div>
                  <span className="text-xs font-bold text-slate-600">{Math.round(m.score * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${m.status === "ready" ? "bg-emerald-500" : m.status === "partial" ? "bg-amber-400" : "bg-rose-400"
                      }`}
                    style={{ width: `${m.score * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{m.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Missing info + recommendation */}
      {missing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Information Gaps Detected</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {missing.map((item) => (
              <span key={item} className="text-xs bg-white border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                {item}
              </span>
            ))}
          </div>
          {status === "not-ready" && (
            <p className="text-xs text-amber-700 mt-3 font-medium">
              Recommendation: Collect missing information before proceeding to approval.
            </p>
          )}
        </div>
      )}

      {status === "ready" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            All critical decision criteria are satisfied. This workflow is cleared for executive approval.
          </p>
        </div>
      )}
    </div>
  );
}

