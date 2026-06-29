import { useState, useEffect } from "react";
import { ReflectionArtifact } from "../types/agent";
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";

interface ReflectionDashboardProps {
  reflectionArtifact: ReflectionArtifact;
  apiBaseUrl: string;
}

const CIRC = 251.2;

function ScoreRing({ value, color, label, sublabel }: { value: number; color: string; label: string; sublabel: string }) {
  const offset = CIRC - CIRC * Math.min(value, 1);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col items-center text-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="relative flex items-center justify-center my-1">
        <svg className="w-24 h-24 -rotate-90">
          <circle cx="48" cy="48" r="40" stroke="hsl(220,10%,88%)" strokeWidth="6" fill="transparent" />
          <circle cx="48" cy="48" r="40" stroke={color} strokeWidth="6" fill="transparent"
            strokeDasharray={CIRC} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-700" />
        </svg>
        <span className="absolute text-xl font-bold text-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
      <span className="text-[10px] text-muted-foreground italic">{sublabel}</span>
    </div>
  );
}

export default function ReflectionDashboard({ reflectionArtifact, apiBaseUrl }: ReflectionDashboardProps) {
  const { payload, created_at, schema_version, provider, workflow_id } = reflectionArtifact;
  const [tab, setTab] = useState<"audit" | "findings" | "suggestions" | "report">("audit");
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    setLoadingReport(true);
    fetch(`${apiBaseUrl}/reflection/report/${workflow_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setReportData(d))
      .catch(() => { })
      .finally(() => setLoadingReport(false));
  }, [workflow_id, apiBaseUrl]);

  const tabs = [
    { id: "audit" as const, label: "Explainability" },
    { id: "findings" as const, label: `Findings (${payload.critical_findings.length + payload.warnings.length + payload.unsupported_claims.length})` },
    { id: "suggestions" as const, label: `Suggestions (${payload.improvement_suggestions.length})` },
    { id: "report" as const, label: "Report Preview" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Meta bar */}
      <div className="flex flex-wrap gap-4 text-xs bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-muted-foreground">
        <span>Schema: <strong className="text-foreground">{schema_version}</strong></span>
        <span>Provider: <span className="font-mono text-primary">{provider}</span></span>
        <span>Validated: <strong className="text-foreground">{created_at}</strong></span>
        <span className="ml-auto">
          {payload.validation_status === "passed"
            ? <span className="flex items-center gap-1 text-status-success font-semibold"><CheckCircle2 size={12} /> Validation Passed</span>
            : <span className="flex items-center gap-1 text-status-error font-semibold animate-pulse"><XCircle size={12} /> Validation Failed</span>
          }
        </span>
      </div>

      {/* Score rings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreRing value={payload.overall_trust_score} color="#10b981" label="Trust Score" sublabel="7-parameter validation" />
        <ScoreRing value={payload.governance_score} color="#3b82f6" label="Governance" sublabel="Audit & compliance" />
        <ScoreRing value={payload.explainability_score} color="#8b5cf6" label="Explainability" sublabel="Rationale completeness" />
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3 flex flex-col justify-center">
          {[
            { label: "Evidence Coverage", v: payload.evidence_coverage, color: "bg-emerald-500" },
            { label: "Strategy Consistency", v: payload.strategy_consistency_score, color: "bg-sky-500" },
            { label: "Hallucination Risk", v: payload.hallucination_risk, color: payload.hallucination_risk > 0.4 ? "bg-rose-500" : "bg-amber-400", invert: true },
          ].map(({ label, v, color, invert }) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{label}</span>
                <span className={`font-bold ${invert ? (v > 0.4 ? "text-status-error" : "text-status-warning") : "text-foreground"}`}>{(v * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${v * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verdict + detail tabs */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-border bg-secondary/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Audit Verdict</p>
          <p className="text-sm text-foreground font-medium">{payload.audit_summary}</p>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Explainability */}
          {tab === "audit" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Analysis Summary", val: payload.execution_metadata.explainability_summary },
                { label: "Why This Strategy", val: payload.execution_metadata.why_selected },
                { label: "Alternatives Rejected", val: payload.execution_metadata.why_alternatives_rejected },
                { label: "Evidence Influence", val: payload.execution_metadata.evidence_influence },
              ].map(({ label, val }) => (
                <div key={label} className="bg-secondary/30 border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-foreground leading-relaxed text-xs">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Findings */}
          {tab === "findings" && (
            <div className="space-y-2.5">
              {payload.critical_findings.length === 0 && payload.warnings.length === 0 && payload.unsupported_claims.length === 0 && (
                <div className="flex items-center gap-2 text-status-success text-sm">
                  <CheckCircle2 size={14} /> No warnings detected. Strategy is facts-aligned.
                </div>
              )}
              {payload.critical_findings.map((f, i) => (
                <div key={i} className="bg-status-error-bg border border-status-error/20 text-status-error p-3 rounded-lg flex items-start gap-2 text-xs">
                  <span className="font-bold uppercase text-[9px] bg-status-error text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5">Critical</span>
                  <span>{f}</span>
                </div>
              ))}
              {payload.warnings.map((f, i) => (
                <div key={i} className="bg-status-warning-bg border border-status-warning/20 text-status-warning p-3 rounded-lg flex items-start gap-2 text-xs">
                  <span className="font-bold uppercase text-[9px] bg-status-warning text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5">Warning</span>
                  <span>{f}</span>
                </div>
              ))}
              {payload.unsupported_claims.map((f, i) => (
                <div key={i} className="bg-status-error-bg border border-status-error/20 text-status-error p-3 rounded-lg flex items-start gap-2 text-xs">
                  <span className="font-bold uppercase text-[9px] bg-status-error text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5">Unbacked</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {tab === "suggestions" && (
            <div className="space-y-2">
              {payload.improvement_suggestions.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground">
                  <ChevronRight size={12} className="text-primary shrink-0" />
                  {f}
                </div>
              ))}
              {payload.improvement_suggestions.length === 0 && (
                <p className="text-muted-foreground text-xs italic">No suggestions generated.</p>
              )}
            </div>
          )}

          {/* Report preview */}
          {tab === "report" && (
            <div className="text-xs">
              {loadingReport ? (
                <p className="text-muted-foreground italic animate-pulse">Loading report data...</p>
              ) : reportData ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-bold text-primary">Executive Workflow Report</span>
                    <span className="font-mono text-muted-foreground">{reportData.workflow_id}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="font-semibold text-foreground mb-1">Executive Summary</p>
                      <p className="text-muted-foreground">{reportData.executive_summary}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="font-semibold text-foreground mb-1">Final Outcome</p>
                      <p className="text-muted-foreground">{reportData.final_recommendation || "Strategy generation approved."}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-muted-foreground border-t border-border pt-3">
                    <span>Trust: <strong className="text-status-success">{(reportData.overall_trust_score * 100).toFixed(1)}%</strong></span>
                    <span>Governance: <strong className="text-primary">{(reportData.governance_score * 100).toFixed(0)}%</strong></span>
                    <span>Strategy: <strong className="text-foreground">{reportData.strategy_summary?.selected_strategy}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No report data available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


