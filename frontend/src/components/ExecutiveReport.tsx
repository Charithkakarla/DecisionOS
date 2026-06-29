import { useState, useRef } from "react";
import { FileText, Download, Loader2, CheckCircle2, LayoutTemplate, Presentation, Sheet } from "lucide-react";
import type { WorkflowState } from "../types/agent";

interface Props { workflowState: WorkflowState; }

type ReportFormat = "pdf" | "docx" | "pptx";
type ReportTemplate = "executive_summary" | "detailed" | "board";

const TEMPLATES: { id: ReportTemplate; label: string; desc: string; pages: string; icon: React.ReactNode }[] = [
  { id: "executive_summary", label: "Executive Summary", desc: "One-page brief for C-suite", pages: "1 page", icon: <FileText size={16} /> },
  { id: "detailed", label: "Detailed Report", desc: "Full analysis, 10–20 pages", pages: "10–20 pages", icon: <LayoutTemplate size={16} /> },
  { id: "board", label: "Board Presentation", desc: "10-slide PowerPoint deck", pages: "10 slides", icon: <Presentation size={16} /> },
];

const FORMATS: { id: ReportFormat; label: string; icon: React.ReactNode }[] = [
  { id: "pdf", label: "PDF", icon: <FileText size={14} /> },
  { id: "docx", label: "Word / DOCX", icon: <Sheet size={14} /> },
  { id: "pptx", label: "PowerPoint", icon: <Presentation size={14} /> },
];

function buildReport(ws: WorkflowState, template: ReportTemplate): Record<string, any> {
  const ctx = ws.context_artifact?.payload as Record<string, any> | undefined;
  const dec = ws.decision_artifact?.payload;
  const strat = ws.strategy_artifact?.payload;
  const ref = ws.reflection_artifact?.payload;
  const learn = ws.learning_artifact?.payload;

  const topRec = dec?.recommendations?.[0];
  const recs = dec?.recommendations ?? [];

  return {
    report_id: `RPT-${ws.workflow_id ?? "0000"}`,
    decision_id: ws.workflow_id ?? "N/A",
    execution_id: ws.execution_id ?? "N/A",
    schema_version: dec?.schema_version ?? "1.1.0",
    prompt_version: "1.0.0",
    generated_at: new Date().toISOString(),
    template,

    executive_summary: dec?.executive_summary ?? "AI-generated analysis of customer interaction.",
    business_goal: dec?.business_goal ?? ctx?.business_goal ?? "Not specified",
    current_context: ctx?.meeting_summary ?? "Interaction transcript processed.",
    buying_stage: ctx?.buying_stage ?? "Discovery",
    decision_status: ref?.validation_status === "passed" ? "Approved for Review" : "Pending Validation",

    decision_readiness: dec?.business_scores?.decision_readiness ?? 0,
    trust_score: ref?.overall_trust_score ?? 0,
    governance_score: ref?.governance_score ?? 0,
    confidence: dec?.confidence?.overall_confidence ?? 0,

    top_recommendation: topRec ? {
      title: topRec.title,
      description: topRec.description,
      reasoning: topRec.reasoning,
      timeline: topRec.timeline,
      risk_level: topRec.risk_level,
      confidence: topRec.confidence,
      citation: topRec.citation,
    } : null,

    all_recommendations: recs.map((r) => ({
      rank: r.rank,
      title: r.title,
      description: r.description,
      risk_level: r.risk_level,
      confidence: r.confidence,
      timeline: r.timeline,
    })),

    assumptions: dec?.assumptions ?? [],
    constraints: dec?.constraints ?? [],
    tradeoffs: dec?.tradeoffs ?? [],
    risks: strat?.risks ?? [],
    mitigation: strat?.mitigation_plan ?? [],

    roi: strat?.estimated_roi ?? dec?.analysis?.estimated_revenue ?? 0,
    implementation_timeline: strat?.implementation_timeline ?? "TBD",
    success_probability: strat?.estimated_success_probability ?? 0,
    implementation_complexity: strat?.implementation_complexity ?? "Medium",

    business_impact: strat?.business_impact ?? {},
    scenarios: strat?.scenarios ?? [],

    missing_information: dec?.missing_information ?? [],
    warnings: ref?.warnings ?? [],
    critical_findings: ref?.critical_findings ?? [],
    improvement_suggestions: ref?.improvement_suggestions ?? [],

    evidence_used: (dec?.evidence_used ?? []).slice(0, 5).map((e: any) => ({
      document: e.document_id,
      similarity: e.similarity_score,
      snippet: e.quoted_evidence?.substring(0, 120) ?? "",
    })),

    // Learning section
    learning_summary: learn?.learning_summary ?? "",
    organizational_insights: learn?.organizational_insights ?? [],
    strategy_success_patterns: learn?.strategy_success_patterns ?? [],
    knowledge_gaps: learn?.knowledge_gaps ?? [],
    prompt_improvements: learn?.prompt_improvement_suggestions ?? [],
    accepted_patterns: learn?.accepted_patterns ?? [],
    organizational_memory_ref: learn?.organizational_memory_reference ?? "",
  };
}

function ReportPreview({ data, template }: { data: Record<string, any>; template: ReportTemplate }) {
  const fmt = (n: number) => `${Math.round(n * 100)}%`;
  const currency = (n: number) => `$${(n / 1000).toFixed(0)}K`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-sm font-serif">
      {/* Cover */}
      <div className="bg-slate-900 text-white px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">DecisionOS · AI-Generated Report</p>
            <h1 className="text-xl font-bold mt-2 font-sans">
              {template === "executive_summary" ? "Executive Summary" : template === "board" ? "Board Presentation" : "Detailed Analysis Report"}
            </h1>
            <p className="text-slate-400 text-xs mt-1">{data.business_goal}</p>
          </div>
          <div className="text-right text-[10px] text-slate-500 font-mono space-y-1">
            <div>Report ID: {data.report_id}</div>
            <div>Decision ID: {data.decision_id}</div>
            <div>Schema: v{data.schema_version}</div>
            <div>{new Date(data.generated_at).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: "Trust Score", value: fmt(data.trust_score) },
            { label: "Confidence", value: fmt(data.confidence) },
            { label: "ROI", value: currency(data.roi) },
            { label: "Decision", value: data.decision_status },
          ].map((m) => (
            <div key={m.label} className="bg-slate-800 rounded-lg p-2 text-center">
              <div className="text-base font-bold text-white">{m.value}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-6 space-y-6">
        {/* Executive Summary */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-1 mb-2 font-sans">1. Executive Summary</h2>
          <p className="text-slate-700 leading-relaxed text-xs">{data.executive_summary}</p>
        </section>

        {/* Scores */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-1 mb-3 font-sans">2. Decision Quality Metrics</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Decision Readiness", v: data.decision_readiness },
              { label: "AI Trust Score", v: data.trust_score },
              { label: "Governance Adherence", v: data.governance_score },
              { label: "Overall Confidence", v: data.confidence },
            ].map(({ label, v }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-bold text-slate-800">{fmt(v)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${v * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Recommendations */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-1 mb-3 font-sans">3. Recommended Actions</h2>
          <div className="space-y-3">
            {data.all_recommendations.map((r: any) => (
              <div key={r.rank} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{r.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-xs">{r.title}</p>
                  <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{r.description}</p>
                  <div className="flex gap-2 mt-1.5 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${r.risk_level === "High" ? "bg-rose-100 text-rose-700" : r.risk_level === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{r.risk_level} Risk</span>
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{r.timeline}</span>
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{fmt(r.confidence)} confidence</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Business Impact */}
        {data.roi > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-1 mb-3 font-sans">4. Business Impact & ROI</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Est. ROI", value: currency(data.roi) },
                { label: "Success Probability", value: fmt(data.success_probability) },
                { label: "Timeline", value: data.implementation_timeline },
              ].map((m) => (
                <div key={m.label} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <div className="text-lg font-bold text-slate-800">{m.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Risks */}
        {data.risks.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-1 mb-2 font-sans">5. Risk Factors</h2>
            <ul className="space-y-1">
              {data.risks.slice(0, 4).map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-rose-400 font-bold shrink-0">•</span>{r}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Evidence */}
        {data.evidence_used.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-1 mb-2 font-sans">6. Evidence Summary</h2>
            <div className="space-y-2">
              {data.evidence_used.map((e: any, i: number) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{e.document}</span>
                    <span className="text-[10px] text-slate-400">Similarity: {fmt(e.similarity)}</span>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{e.snippet}..."</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Learning Insights */}
        {data.learning_summary && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-1 mb-2 font-sans">7. Organizational Learning</h2>
            <p className="text-xs text-slate-700 mb-3 leading-relaxed">{data.learning_summary}</p>
            {data.organizational_insights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Key Insights</p>
                  <ul className="space-y-1">
                    {data.organizational_insights.slice(0, 3).map((ins: string, i: number) => (
                      <li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-amber-500 shrink-0">•</span>{ins}</li>
                    ))}
                  </ul>
                </div>
                {data.strategy_success_patterns.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-2">Success Patterns</p>
                    <ul className="space-y-1">
                      {data.strategy_success_patterns.slice(0, 3).map((p: string, i: number) => (
                        <li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-emerald-500 shrink-0">✓</span>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {data.knowledge_gaps.length > 0 && (
              <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Knowledge Gaps Identified</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.knowledge_gaps.map((gap: string, i: number) => (
                    <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{gap}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Generated by DecisionOS · Workflow {data.decision_id}</span>
          <span>Prompt v{data.prompt_version} · Schema v{data.schema_version}</span>
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveReport({ workflowState }: Props) {
  const [template, setTemplate] = useState<ReportTemplate>("executive_summary");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const reportData = buildReport(workflowState, template);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerated(false);
    await new Promise((r) => setTimeout(r, 1200));
    setGenerating(false);
    setGenerated(true);
    setShowPreview(true);
  };

  const handleDownloadPDF = () => {
    if (!previewRef.current) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Please allow popups to download the PDF."); return; }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${reportData.report_id} — DecisionOS Report</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: white; font-size: 12px; line-height: 1.5; }
            .report-wrap { max-width: 800px; margin: 0 auto; }
            h1 { font-size: 20px; font-weight: 700; }
            h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
            p { color: #334155; margin-bottom: 6px; }
            section { margin-bottom: 20px; }
            .cover { background: #1e293b; color: white; padding: 32px; margin-bottom: 0; }
            .cover h1 { color: white; margin-bottom: 4px; }
            .cover p { color: #94a3b8; font-size: 11px; }
            .cover-meta { font-family: monospace; font-size: 10px; color: #64748b; text-align: right; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-top: 16px; }
            .kpi-box { background: #334155; border-radius: 6px; padding: 8px; text-align: center; }
            .kpi-box .val { font-size: 16px; font-weight: 700; color: white; }
            .kpi-box .lbl { font-size: 9px; color: #94a3b8; margin-top: 2px; }
            .body { padding: 24px 32px; }
            .score-row { display: flex; gap: 12px; margin-bottom: 8px; }
            .score-item { flex: 1; }
            .score-label { font-size: 10px; color: #64748b; }
            .score-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 3px; }
            .score-fill { height: 6px; background: #4f7942; border-radius: 3px; }
            .rec { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px; display: flex; gap: 10px; }
            .rec-rank { width: 22px; height: 22px; border-radius: 50%; background: #4f7942; color: white; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; margin-right: 4px; }
            .badge-high { background: #fee2e2; color: #b91c1c; }
            .badge-medium { background: #fef3c7; color: #92400e; }
            .badge-low { background: #dcfce7; color: #166534; }
            .ev-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-bottom: 6px; }
            .ev-doc { font-family: monospace; font-size: 10px; background: #dcfce7; color: #166534; padding: 1px 5px; border-radius: 3px; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; font-family: monospace; }
            .impact-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
            .impact-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
            .impact-val { font-size: 16px; font-weight: 700; color: #1e293b; }
            .impact-lbl { font-size: 9px; color: #64748b; margin-top: 2px; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { margin: 0.5in; size: A4; }
            }
          </style>
        </head>
        <body>
          <div class="report-wrap">
            <div class="cover">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <p style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">DecisionOS · AI-Generated Report</p>
                  <h1>${template === "executive_summary" ? "Executive Summary" : template === "board" ? "Board Presentation" : "Detailed Analysis Report"}</h1>
                  <p style="margin-top:4px;color:#94a3b8">${reportData.business_goal}</p>
                </div>
                <div class="cover-meta">
                  <div>Report: ${reportData.report_id}</div>
                  <div>Workflow: ${reportData.decision_id}</div>
                  <div>Schema: v${reportData.schema_version}</div>
                  <div>${new Date(reportData.generated_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div class="kpi-grid">
                <div class="kpi-box"><div class="val">${Math.round(reportData.trust_score * 100)}%</div><div class="lbl">Trust Score</div></div>
                <div class="kpi-box"><div class="val">${Math.round(reportData.confidence * 100)}%</div><div class="lbl">Confidence</div></div>
                <div class="kpi-box"><div class="val">$${(reportData.roi / 1000).toFixed(0)}K</div><div class="lbl">Est. ROI</div></div>
                <div class="kpi-box"><div class="val">${reportData.decision_status}</div><div class="lbl">Status</div></div>
              </div>
            </div>
            <div class="body">
              <section>
                <h2>1. Executive Summary</h2>
                <p>${reportData.executive_summary}</p>
              </section>
              <section>
                <h2>2. Decision Quality Metrics</h2>
                <div class="score-row">
                  ${[["Decision Readiness", reportData.decision_readiness], ["Trust Score", reportData.trust_score], ["Governance", reportData.governance_score], ["Confidence", reportData.confidence]].map(([l, v]) =>
      `<div class="score-item"><div class="score-label">${l} — ${Math.round(Number(v) * 100)}%</div><div class="score-bar"><div class="score-fill" style="width:${Math.round(Number(v) * 100)}%"></div></div></div>`
    ).join("")}
                </div>
              </section>
              <section>
                <h2>3. Recommended Actions</h2>
                ${reportData.all_recommendations.map((r: any) => `
                  <div class="rec">
                    <div class="rec-rank">${r.rank}</div>
                    <div>
                      <strong>${r.title}</strong>
                      <p style="margin-top:3px;color:#475569">${r.description}</p>
                      <div style="margin-top:5px">
                        <span class="badge badge-${r.risk_level?.toLowerCase()}">${r.risk_level} Risk</span>
                        <span class="badge" style="background:#f1f5f9;color:#475569">${r.timeline}</span>
                        <span class="badge" style="background:#eff6ff;color:#1d4ed8">${Math.round(r.confidence * 100)}% confidence</span>
                      </div>
                    </div>
                  </div>
                `).join("")}
              </section>
              ${reportData.roi > 0 ? `
              <section>
                <h2>4. Business Impact & ROI</h2>
                <div class="impact-grid">
                  <div class="impact-box"><div class="impact-val">$${(reportData.roi / 1000).toFixed(0)}K</div><div class="impact-lbl">Est. ROI</div></div>
                  <div class="impact-box"><div class="impact-val">${Math.round(reportData.success_probability * 100)}%</div><div class="impact-lbl">Success Probability</div></div>
                  <div class="impact-box"><div class="impact-val">${reportData.implementation_timeline}</div><div class="impact-lbl">Timeline</div></div>
                </div>
              </section>` : ""}
              ${reportData.risks.length > 0 ? `
              <section>
                <h2>5. Risk Factors</h2>
                ${reportData.risks.slice(0, 4).map((r: string) => `<p>• ${r}</p>`).join("")}
              </section>` : ""}
              ${reportData.evidence_used.length > 0 ? `
              <section>
                <h2>6. Evidence Summary</h2>
                ${reportData.evidence_used.map((e: any) => `
                  <div class="ev-item">
                    <span class="ev-doc">${e.document}</span>
                    <span style="font-size:10px;color:#64748b;margin-left:6px">Similarity: ${Math.round(e.similarity * 100)}%</span>
                    <p style="margin-top:4px;font-style:italic;color:#475569">"${e.snippet}..."</p>
                  </div>
                `).join("")}
              </section>` : ""}
              <div class="footer">
                <span>Generated by DecisionOS · ${reportData.decision_id}</span>
                <span>Prompt v${reportData.prompt_version} · Schema v${reportData.schema_version}</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 400);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleDownload = () => {
    if (format === "pdf") { handleDownloadPDF(); return; }
    // For docx/pptx — export report data as JSON for now
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportData.report_id}.${format === "docx" ? "json" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText size={18} className="text-primary" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">Executive Board Report Generator</p>
          <p className="text-xs text-slate-500">One-click generation of professional reports from this workflow.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-6">

          {/* Template */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Report Template</p>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${template === t.id ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <span className={`mt-0.5 ${template === t.id ? "text-primary" : "text-slate-400"}`}>{t.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold ${template === t.id ? "text-primary" : "text-slate-700"}`}>{t.label}</p>
                    <p className="text-[10px] text-slate-400">{t.desc} · {t.pages}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Export Format</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-center transition-all ${format === f.id ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  {f.icon}
                  <span className="text-[10px] font-semibold">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Report metadata preview */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Report Metadata</p>
            {[
              ["Report ID", reportData.report_id],
              ["Decision ID", reportData.decision_id],
              ["Schema", `v${reportData.schema_version}`],
              ["Template", TEMPLATES.find((t) => t.id === template)?.label ?? ""],
              ["Format", format.toUpperCase()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px]">
                <span className="text-slate-400">{k}</span>
                <span className="font-mono text-slate-600">{v}</span>
              </div>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating Report...</>
            ) : generated ? (
              <><CheckCircle2 size={16} /> Re-Generate Report</>
            ) : (
              <><FileText size={16} /> Generate Report</>
            )}
          </button>

          {generated && (
            <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 py-2.5 border border-primary text-primary rounded-xl font-medium text-sm hover:bg-primary/5 transition-colors">
              <Download size={14} />
              {format === "pdf" ? "Print / Save as PDF" : `Download ${format.toUpperCase()}`}
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          {showPreview ? (
            <div ref={previewRef} className="max-h-[680px] overflow-y-auto rounded-2xl ring-1 ring-slate-200 shadow-lg">
              <ReportPreview data={reportData} template={template} />
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-muted-foreground gap-3">
              <FileText size={36} className="opacity-20" />
              <p className="text-sm font-medium text-slate-400">Configure your report and click Generate.</p>
              <p className="text-xs text-slate-300">Preview will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

