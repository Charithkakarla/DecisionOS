import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
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

/** Resolution steps mapped to each gap label */
const RESOLUTION_STEPS: Record<string, { steps: string[]; priority: "High" | "Medium" | "Low" }> = {
  "Evidence Coverage": {
    priority: "High",
    steps: [
      "Upload relevant playbooks, SOPs, or case studies to the Knowledge Base.",
      "Ensure at least 3 supporting evidence documents are indexed before re-running.",
      "Tag documents with deal-stage keywords (e.g., 'discovery', 'negotiation') for better retrieval.",
    ],
  },
  "Context Completeness": {
    priority: "High",
    steps: [
      "Review the transcript or input data for missing key details (company, product, pain points).",
      "Add structured context fields: industry, company size, and decision-maker role.",
      "Re-run the Context Intelligence agent after enriching the source data.",
    ],
  },
  "Stakeholder Alignment": {
    priority: "Medium",
    steps: [
      "Identify all decision-makers and influencers involved in the deal.",
      "Document each stakeholder's role, concerns, and alignment level.",
      "Ensure at least 2 stakeholders are captured in the context data.",
    ],
  },
  "Budget Clarity": {
    priority: "Medium",
    steps: [
      "Confirm whether budget has been explicitly discussed in the interaction.",
      "Add budget range, fiscal year, or procurement timeline if available.",
      "Note any financial constraints or competing budget priorities.",
    ],
  },
  "Timeline Clarity": {
    priority: "Medium",
    steps: [
      "Ask the prospect for a target decision date or go-live deadline.",
      "Document any external deadlines (contract renewals, compliance dates, events).",
      "Capture urgency drivers — what happens if they delay?",
    ],
  },
  "Compliance Coverage": {
    priority: "Low",
    steps: [
      "Identify any regulatory or compliance requirements (GDPR, SOC 2, HIPAA, etc.).",
      "Document security or procurement review processes the deal must pass through.",
      "Flag any legal review requirements or contract approval workflows.",
    ],
  },
  "Risk Identification": {
    priority: "Low",
    steps: [
      "Run the Decision Intelligence agent to generate a formal risk assessment.",
      "Review competitor threats, implementation risks, and adoption barriers.",
      "Ensure risk scores are computed before submitting for approval.",
    ],
  },
};

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
  const [showResolve, setShowResolve] = useState(false);

  const pct = Math.round(overall * 100);
  const dashOffset = CIRCUMFERENCE - CIRCUMFERENCE * overall;

  const gaugeColor = status === "ready" ? "#22c55e" : status === "caution" ? "#f59e0b" : "#ef4444";
  const statusLabel = status === "ready" ? "Ready to Decide" : status === "caution" ? "Proceed with Caution" : "Insufficient Information";
  const statusBg = status === "ready" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
    status === "caution" ? "bg-amber-50 border-amber-200 text-amber-800" :
      "bg-rose-50 border-rose-200 text-rose-800";

  const recommendationText = status === "not-ready"
    ? "Collect missing information before proceeding to approval."
    : status === "caution"
      ? "Review flagged areas to strengthen decision confidence."
      : "";

  const priorityColor = {
    High: "bg-rose-100 text-rose-700 border-rose-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Elevated Action Banner ── */}
      {missing.length > 0 && recommendationText && (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: status === "not-ready"
              ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)"
              : "linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)",
            border: status === "not-ready" ? "1px solid #f59e0b" : "1px solid #fbbf24",
          }}
        >
          <div className="flex items-start gap-4 px-5 py-4">
            {/* Icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl mt-0.5"
              style={{
                backgroundColor: status === "not-ready" ? "rgba(245, 158, 11, 0.2)" : "rgba(251, 191, 36, 0.2)",
              }}
            >
              <ShieldAlert size={20} className={status === "not-ready" ? "text-amber-700" : "text-amber-600"} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <h3 className="text-sm font-bold text-amber-900">
                  {status === "not-ready" ? "Action Required" : "Attention Needed"}
                </h3>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    color: "#92400e",
                  }}
                >
                  {missing.length} gap{missing.length !== 1 ? "s" : ""} detected
                </span>
              </div>

              <p className="text-[13px] font-semibold text-amber-800 leading-relaxed">
                {recommendationText}
              </p>

              {/* Gap tags inline */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {missing.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.65)",
                      color: "#92400e",
                      border: "1px solid rgba(245,158,11,0.25)",
                    }}
                  >
                    <AlertTriangle size={10} />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Resolve button */}
            <button
              onClick={() => setShowResolve(!showResolve)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200"
              style={{
                backgroundColor: showResolve ? "#92400e" : "rgba(255,255,255,0.85)",
                color: showResolve ? "#fff" : "#92400e",
                border: "1px solid rgba(245,158,11,0.3)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {showResolve ? "Hide Steps" : "Resolve"}
              {showResolve ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* ── Resolution Steps Panel ── */}
          {showResolve && (
            <div
              className="px-5 pb-5 pt-1"
              style={{ borderTop: "1px solid rgba(245,158,11,0.2)" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {missing.map((gapLabel) => {
                  const resolution = RESOLUTION_STEPS[gapLabel];
                  if (!resolution) return null;

                  return (
                    <div
                      key={gapLabel}
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.75)",
                        border: "1px solid rgba(245,158,11,0.15)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={13} className="text-amber-600" />
                          <h4 className="text-xs font-bold text-slate-800">{gapLabel}</h4>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${priorityColor[resolution.priority]}`}>
                          {resolution.priority} Priority
                        </span>
                      </div>
                      <ol className="space-y-2">
                        {resolution.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
                              style={{
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                              }}
                            >
                              {idx + 1}
                            </span>
                            <p className="text-[12px] text-slate-700 leading-relaxed font-medium">
                              {step}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
