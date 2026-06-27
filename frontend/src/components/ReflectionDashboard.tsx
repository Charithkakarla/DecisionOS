// Contains: ReflectionDashboard.tsx implementation.
import { useState, useEffect } from "react";
import { ReflectionArtifact } from "../types/agent";

interface ReflectionDashboardProps {
  reflectionArtifact: ReflectionArtifact;
  apiBaseUrl: string;
}

export default function ReflectionDashboard({ reflectionArtifact, apiBaseUrl }: ReflectionDashboardProps) {
  const { payload, created_at, schema_version, provider, workflow_id } = reflectionArtifact;
  const [expandedSection, setExpandedSection] = useState<"audit" | "findings" | "suggestions" | "report">("audit");
  const [reportData, setReportData] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch Workflow Report preview on mount/refresh
  useEffect(() => {
    const fetchReport = async () => {
      setLoadingReport(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/reflection/report/${workflow_id}`);
        if (response.ok) {
          const data = await response.json();
          setReportData(data);
        }
      } catch (err) {
        console.error("Failed to load workflow report:", err);
      } finally {
        setLoadingReport(false);
      }
    };
    fetchReport();
  }, [workflow_id, apiBaseUrl]);

  const getScoreColorClass = (score: number, invert = false) => {
    if (invert) {
      if (score >= 0.6) return "text-rose-400";
      if (score >= 0.3) return "text-amber-400";
      return "text-emerald-400";
    } else {
      if (score >= 0.8) return "text-emerald-400";
      if (score >= 0.5) return "text-amber-400";
      return "text-rose-400";
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "passed") {
      return (
        <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
          Validation Passed
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold uppercase tracking-wider animate-pulse">
        Validation Failed
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Info Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950 text-slate-400 px-4 py-2.5 rounded-xl border border-slate-800 text-[11px] gap-2">
        <div>Governance Schema Version: <strong>{schema_version}</strong></div>
        <div>Auditor Provider: <span className="font-mono text-cyan-400">{provider}</span></div>
        <div>Validated At: <strong>{created_at}</strong></div>
      </div>

      {/* Main Validation Ring Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Trust Score */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 shadow-sm flex flex-col justify-between items-center text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall Trust Rating</span>
          <div className="relative my-4 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
              <circle cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="6" fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * payload.overall_trust_score)}
              />
            </svg>
            <span className="absolute text-xl font-bold text-slate-200">{(payload.overall_trust_score * 100).toFixed(0)}%</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 italic">Calculated deterministically from 7 validation parameters</span>
        </div>

        {/* Governance Compliance */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 shadow-sm flex flex-col justify-between items-center text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Governance Adherence</span>
          <div className="relative my-4 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
              <circle cx="48" cy="48" r="40" stroke="#3b82f6" strokeWidth="6" fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * payload.governance_score)}
              />
            </svg>
            <span className="absolute text-xl font-bold text-slate-200">{(payload.governance_score * 100).toFixed(0)}%</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Audit logs, schema match & trace completeness</span>
        </div>

        {/* Explainability Index */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 shadow-sm flex flex-col justify-between items-center text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Explainability Index</span>
          <div className="relative my-4 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
              <circle cx="48" cy="48" r="40" stroke="#8b5cf6" strokeWidth="6" fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * payload.explainability_score)}
              />
            </svg>
            <span className="absolute text-xl font-bold text-slate-200">{(payload.explainability_score * 100).toFixed(0)}%</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Structured rationale & trace readability</span>
        </div>

        {/* Evidence Coverage & Hallucination Risk */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 shadow-sm space-y-4 flex flex-col justify-center">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Evidence Citations Coverage</span>
              <span className="font-bold text-slate-200">{(payload.evidence_coverage * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${payload.evidence_coverage * 100}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Strategy Consistency Score</span>
              <span className="font-bold text-slate-200">{(payload.strategy_consistency_score * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500" style={{ width: `${payload.strategy_consistency_score * 100}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Factual Hallucination Risk</span>
              <span className={`font-bold ${getScoreColorClass(payload.hallucination_risk, true)}`}>
                {(payload.hallucination_risk * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${payload.hallucination_risk > 0.4 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${payload.hallucination_risk * 100}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Accordion Expandable Audit Verdict details */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="flex justify-between items-center bg-slate-900/50 p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {getStatusBadge(payload.validation_status)}
            <h3 className="font-bold text-slate-200">Executive Audit & Verification</h3>
          </div>
          <span className="text-xs text-slate-500">Validation Version {payload.validation_version}</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Audit Verdict Brief</span>
            <p className="text-sm text-slate-200">{payload.audit_summary}</p>
          </div>

          {/* Tabular Accordion Controls */}
          <div className="flex border-b border-slate-800 text-xs">
            <button onClick={() => setExpandedSection("audit")} className={`px-4 py-2 border-b-2 font-bold ${expandedSection === "audit" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400"}`}>Executive Explainability</button>
            <button onClick={() => setExpandedSection("findings")} className={`px-4 py-2 border-b-2 font-bold ${expandedSection === "findings" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400"}`}>Critical Findings ({payload.critical_findings.length + payload.warnings.length + payload.unsupported_claims.length})</button>
            <button onClick={() => setExpandedSection("suggestions")} className={`px-4 py-2 border-b-2 font-bold ${expandedSection === "suggestions" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400"}`}>Governance Suggestions ({payload.improvement_suggestions.length})</button>
            <button onClick={() => setExpandedSection("report")} className={`px-4 py-2 border-b-2 font-bold ${expandedSection === "report" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400"}`}>Report PDF Preview</button>
          </div>

          {/* Section 1: Explainability */}
          {expandedSection === "audit" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/40 p-3 rounded border border-slate-900 space-y-2">
                <p className="font-bold text-slate-300">Executive Analysis Summary</p>
                <p className="text-slate-400">{payload.execution_metadata.explainability_summary}</p>
                <hr className="border-slate-800" />
                <p className="font-bold text-slate-300">Primary Choice Rationale</p>
                <p className="text-slate-400">{payload.execution_metadata.why_selected}</p>
              </div>
              <div className="bg-slate-900/40 p-3 rounded border border-slate-900 space-y-2">
                <p className="font-bold text-slate-300">Alternative Options Assessment</p>
                <p className="text-slate-400">{payload.execution_metadata.why_alternatives_rejected}</p>
                <hr className="border-slate-800" />
                <p className="font-bold text-slate-300">Critical Evidence Influence</p>
                <p className="text-slate-400">{payload.execution_metadata.evidence_influence}</p>
              </div>
            </div>
          )}

          {/* Section 2: Critical Findings */}
          {expandedSection === "findings" && (
            <div className="space-y-3 text-xs">
              {payload.critical_findings.length === 0 && payload.warnings.length === 0 && payload.unsupported_claims.length === 0 && (
                <div className="text-slate-400 italic">No warnings or discrepancies detected by validator. Strategy is facts-aligned.</div>
              )}
              {payload.critical_findings.map((f, i) => (
                <div key={i} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded flex items-start gap-2">
                  <span className="font-bold uppercase tracking-wider text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded mt-0.5">Critical</span>
                  <span>{f}</span>
                </div>
              ))}
              {payload.warnings.map((f, i) => (
                <div key={i} className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 rounded flex items-start gap-2">
                  <span className="font-bold uppercase tracking-wider text-[8px] bg-amber-500 text-black px-1.5 py-0.5 rounded mt-0.5">Warning</span>
                  <span>{f}</span>
                </div>
              ))}
              {payload.unsupported_claims.map((f, i) => (
                <div key={i} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded flex items-start gap-2">
                  <span className="font-bold uppercase tracking-wider text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded mt-0.5">Unbacked</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Section 3: Suggestions */}
          {expandedSection === "suggestions" && (
            <div className="space-y-2 text-xs">
              {payload.improvement_suggestions.map((f, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div>
                  <span className="text-slate-300">{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Section 4: Workflow Report JSON Preview */}
          {expandedSection === "report" && (
            <div className="space-y-4 text-xs">
              {loadingReport ? (
                <div className="text-slate-400 animate-pulse italic">Compiling workflow report database values...</div>
              ) : reportData ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-bold text-cyan-400 text-sm">DecisionOS Executive Workflow Report</span>
                    <span className="text-xs text-slate-500">ID: {reportData.workflow_id}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-slate-300">1. Executive Summary</p>
                      <p className="text-slate-400 mt-1">{reportData.executive_summary}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300">2. Final Strategic Outcome</p>
                      <p className="text-slate-400 mt-1">{reportData.final_recommendation || "Strategy generation approved."}</p>
                    </div>
                  </div>

                  <hr className="border-slate-800" />
                  
                  <div>
                    <p className="font-semibold text-slate-300 mb-2">3. Supporting Playbook Evidence</p>
                    {reportData.evidence_used.length === 0 ? (
                      <p className="text-slate-500 italic">No document evidence linked.</p>
                    ) : (
                      <div className="space-y-2">
                        {reportData.evidence_used.map((ev: any, idx: number) => (
                          <div key={idx} className="bg-slate-950 p-2 border border-slate-800 rounded">
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded mr-2 font-mono">
                              {ev.document} • Page {ev.page}
                            </span>
                            <span className="text-slate-300 italic">"{ev.content_snippet}"</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-800" />

                  <div className="flex flex-wrap gap-4 justify-between text-[11px] text-slate-400">
                    <div>Trust score: <span className="text-emerald-400 font-bold">{(reportData.overall_trust_score * 100).toFixed(1)}%</span></div>
                    <div>Governance match: <span className="text-cyan-400 font-bold">{(reportData.governance_score * 100).toFixed(0)}%</span></div>
                    <div>Strategy winner: <span className="text-slate-200">{reportData.strategy_summary.selected_strategy}</span></div>
                    <div>Timeline: <span className="text-slate-200">{reportData.strategy_summary.implementation_timeline}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-rose-400 italic">Failed to generate or retrieve report data. Run agent loop to initialize cache.</div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
