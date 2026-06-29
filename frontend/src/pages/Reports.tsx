import { useState, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { Download, FileText, FileSearch, RefreshCcw, Loader2, ExternalLink, BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { WorkflowState } from "../types/agent";

interface WorkflowRow {
  id: string;
  status: string;
  time_ago: string;
  business_goal: string;
  top_recommendation: string;
  trust_score: number;
  confidence: number;
  estimated_roi: number;
  selected_strategy: string;
  agents_completed: number;
  has_payload: boolean;
  started_at: string | null;
}

export function Reports() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    api.workflows.list()
      .then(setWorkflows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await api.workflows.list();
      setWorkflows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async (runId: string) => {
    setGeneratingId(runId);
    try {
      // Fetch the full workflow state from backend
      const stateJson = await api.workflows.getState(runId);
      const ws: WorkflowState = stateJson;

      const dec = ws.decision_artifact?.payload;
      const strat = ws.strategy_artifact?.payload;
      const ref = ws.reflection_artifact?.payload;
      const ctx = ws.context_artifact?.payload as Record<string, any> | undefined;
      const learn = ws.learning_artifact?.payload;
      const recs = dec?.recommendations ?? [];
      const fmt = (n: number) => `${Math.round(n * 100)}%`;
      const currency = (n: number) => `$${(n / 1000).toFixed(0)}K`;

      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) { alert("Please allow popups to download the PDF."); setGeneratingId(null); return; }

      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <title>DecisionOS Report — ${ws.workflow_id}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: white; font-size: 12px; line-height: 1.6; }
          .cover { background: #1e293b; color: white; padding: 32px; }
          .cover h1 { font-size: 22px; font-weight: 700; margin: 8px 0 4px; }
          .cover p { color: #94a3b8; font-size: 11px; }
          .meta { font-family: monospace; font-size: 10px; color: #64748b; text-align: right; }
          .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-top: 18px; }
          .kpi { background: #334155; border-radius: 6px; padding: 10px; text-align: center; }
          .kpi .v { font-size: 18px; font-weight: 700; color: white; }
          .kpi .l { font-size: 9px; color: #94a3b8; margin-top: 2px; }
          .body { padding: 24px 32px; }
          h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 20px 0 10px; }
          p { color: #334155; margin-bottom: 6px; }
          .rec { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px; display: flex; gap: 10px; }
          .rank { width: 22px; height: 22px; border-radius: 50%; background: #4f7942; color: white; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; margin-right: 4px; }
          .bh { background: #fee2e2; color: #b91c1c; } .bm { background: #fef3c7; color: #92400e; } .bl { background: #dcfce7; color: #166534; }
          .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .score-item .label { font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
          .bar { height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 3px; }
          .fill { height: 5px; background: #4f7942; border-radius: 3px; }
          .impact { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
          .impact-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .impact-box .v { font-size: 16px; font-weight: 700; }
          .impact-box .l { font-size: 9px; color: #64748b; margin-top: 2px; }
          .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 20px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 0.4in; size: A4; } }
        </style></head><body>
        <div class="cover">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <p style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.1em">DecisionOS · AI-Generated Report</p>
              <h1>Executive Analysis Report</h1>
              <p>${dec?.business_goal || ctx?.business_goal || "Business Decision Analysis"}</p>
            </div>
            <div class="meta">
              <div>Workflow: ${ws.workflow_id || runId.slice(0, 8)}</div>
              <div>Generated: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div class="kpis">
            <div class="kpi"><div class="v">${fmt(ref?.overall_trust_score ?? 0)}</div><div class="l">Trust Score</div></div>
            <div class="kpi"><div class="v">${fmt(dec?.confidence?.overall_confidence ?? 0)}</div><div class="l">Confidence</div></div>
            <div class="kpi"><div class="v">${currency(strat?.estimated_roi ?? 0)}</div><div class="l">Est. ROI</div></div>
            <div class="kpi"><div class="v">${recs.length}</div><div class="l">Recommendations</div></div>
          </div>
        </div>
        <div class="body">
          <h2>1. Executive Summary</h2>
          <p>${dec?.executive_summary || "AI-generated analysis of customer interaction."}</p>

          <h2>2. Decision Quality Metrics</h2>
          <div class="scores">
            ${[
          ["Decision Readiness", dec?.business_scores?.decision_readiness ?? 0],
          ["Trust Score", ref?.overall_trust_score ?? 0],
          ["Governance", ref?.governance_score ?? 0],
          ["Confidence", dec?.confidence?.overall_confidence ?? 0],
        ].map(([l, v]) => `<div class="score-item">
              <div class="label"><span>${l}</span><span>${Math.round(Number(v) * 100)}%</span></div>
              <div class="bar"><div class="fill" style="width:${Math.round(Number(v) * 100)}%"></div></div>
            </div>`).join("")}
          </div>

          <h2>3. Recommended Actions</h2>
          ${recs.map((r: any) => `<div class="rec">
            <div class="rank">${r.rank}</div>
            <div>
              <strong>${r.title}</strong>
              <p style="margin-top:3px;color:#475569">${r.description}</p>
              <div style="margin-top:5px">
                <span class="badge ${r.risk_level === "High" ? "bh" : r.risk_level === "Medium" ? "bm" : "bl"}">${r.risk_level} Risk</span>
                <span class="badge" style="background:#f1f5f9;color:#475569">${r.timeline}</span>
                <span class="badge" style="background:#eff6ff;color:#1d4ed8">${Math.round(r.confidence * 100)}% confidence</span>
              </div>
            </div>
          </div>`).join("") || "<p>No recommendations generated.</p>"}

          ${(strat?.estimated_roi ?? 0) > 0 ? `
          <h2>4. Business Impact & ROI</h2>
          <div class="impact">
            <div class="impact-box"><div class="v">${currency(strat?.estimated_roi ?? 0)}</div><div class="l">Est. ROI</div></div>
            <div class="impact-box"><div class="v">${fmt(strat?.estimated_success_probability ?? 0)}</div><div class="l">Success Probability</div></div>
            <div class="impact-box"><div class="v">${strat?.implementation_timeline || "TBD"}</div><div class="l">Timeline</div></div>
          </div>` : ""}

          ${(strat?.risks?.length ?? 0) > 0 ? `
          <h2>5. Risk Factors</h2>
          ${(strat?.risks ?? []).slice(0, 5).map((r: string) => `<p>• ${r}</p>`).join("")}` : ""}

          ${learn?.learning_summary ? `
          <h2>6. Organizational Learning</h2>
          <p>${learn.learning_summary}</p>` : ""}

          <div class="footer">
            <span>Generated by DecisionOS · ${ws.workflow_id || runId.slice(0, 8)}</span>
            <span>${new Date().toLocaleString()}</span>
          </div>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close();},400);}</script>
        </body></html>`);
      win.document.close();
    } catch (e) {
      console.error("Failed to generate report:", e);
      alert("Failed to load workflow data for report generation.");
    } finally {
      setGeneratingId(null);
    }
  };

  const completedWorkflows = workflows.filter(w => w.status === "Completed" && w.has_payload);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-up duration-300">
      <PageHeader
        title="Reports"
        description="Generate and export executive reports from completed workflow runs."
      />

      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/workflows")}
            className="flex items-start gap-4 p-5 bg-primary text-primary-foreground rounded-xl shadow-sm hover:bg-primary/90 transition-colors text-left"
          >
            <div className="p-2 bg-white/10 rounded-lg shrink-0"><BrainCircuit size={22} /></div>
            <div>
              <p className="font-semibold text-sm">Run New Workflow</p>
              <p className="text-xs opacity-70 mt-0.5">Analyze a transcript to generate a new report</p>
            </div>
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-start gap-4 p-5 bg-card border border-border rounded-2xl shadow-card hover:bg-secondary/40 transition-colors text-left"
          >
            <div className="p-2 bg-secondary rounded-lg shrink-0 text-primary"><RefreshCcw size={22} /></div>
            <div>
              <p className="font-semibold text-sm text-foreground">Refresh Reports</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sync latest workflow data from server</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/analytics")}
            className="flex items-start gap-4 p-5 bg-card border border-border rounded-2xl shadow-card hover:bg-secondary/40 transition-colors text-left"
          >
            <div className="p-2 bg-secondary rounded-lg shrink-0 text-primary"><FileSearch size={22} /></div>
            <div>
              <p className="font-semibold text-sm text-foreground">View Analytics</p>
              <p className="text-xs text-muted-foreground mt-0.5">Agent performance & execution metrics</p>
            </div>
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Workflow Reports</h2>
          <span className="text-xs text-muted-foreground">{completedWorkflows.length} report{completedWorkflows.length !== 1 ? "s" : ""} available</span>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={18} />
              <span className="text-sm">Loading reports...</span>
            </div>
          ) : completedWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FileText size={36} className="opacity-20" />
              <p className="text-sm font-medium">No completed workflows yet.</p>
              <p className="text-xs">Run a workflow analysis to generate your first report.</p>
              <button
                onClick={() => navigate("/workflows")}
                className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Run First Analysis
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {completedWorkflows.map((wf) => (
                <div key={wf.id} className="flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-2.5 bg-secondary rounded-lg text-primary shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {wf.business_goal && wf.business_goal !== "—"
                          ? wf.business_goal
                          : `Workflow ${wf.id.slice(0, 8)}`}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>{wf.time_ago}</span>
                        {wf.top_recommendation && wf.top_recommendation !== "—" && (
                          <span className="truncate max-w-[200px]">→ {wf.top_recommendation}</span>
                        )}
                        {wf.trust_score > 0 && (
                          <span className="text-emerald-600 font-medium">Trust: {Math.round(wf.trust_score * 100)}%</span>
                        )}
                        {wf.estimated_roi > 0 && (
                          <span className="text-blue-600 font-medium">ROI: ${(wf.estimated_roi / 1000).toFixed(0)}K</span>
                        )}
                        <span className="text-muted-foreground">{wf.agents_completed}/7 agents</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/workflows/${wf.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <ExternalLink size={12} />
                      View
                    </button>
                    <button
                      onClick={() => handleGeneratePDF(wf.id)}
                      disabled={generatingId === wf.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50"
                    >
                      {generatingId === wf.id ? (
                        <><Loader2 size={12} className="animate-spin" /> Generating...</>
                      ) : (
                        <><Download size={12} /> Export PDF</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}




