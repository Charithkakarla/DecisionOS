import { useEffect, useState } from "react";
import { Brain, TrendingUp, Lightbulb, AlertTriangle, CheckCircle2, XCircle, Sparkles, History } from "lucide-react";
import { WorkflowState } from "../types/agent";
import { api } from "../lib/api";

// Decision DNA — seeded from real workflow history, falls back to illustrative examples
const SEED_DNA = [
  { goal: "Expand into APAC market", strategy: "Phased Regional Rollout", outcome: "Approved", trust: 0.91, roi: 420000, lessons: "Early stakeholder alignment was key. Compliance review added 2 weeks." },
  { goal: "Migrate CRM to cloud platform", strategy: "Parallel Run Migration", outcome: "Modified", trust: 0.84, roi: 180000, lessons: "Budget assumptions were too aggressive. Phased budget was approved instead." },
  { goal: "Launch partner reseller program", strategy: "Pilot with 3 Strategic Partners", outcome: "Approved", trust: 0.88, roi: 290000, lessons: "Reviewer required dedicated partner success manager before sign-off." },
];

interface LearningDashboardProps {
  workflowState?: WorkflowState;
  forceData?: boolean;
}

export default function LearningDashboard({ workflowState, forceData = false }: LearningDashboardProps) {
  const artifact = workflowState?.learning_artifact;
  const [historicalDNA, setHistoricalDNA] = useState<any[]>([]);

  useEffect(() => {
    // artifact loaded
  }, [artifact]);

  // Load real historical workflows, fall back to seed data
  useEffect(() => {
    api.workflows.list()
      .then((rows: any[]) => {
        const completed = rows.filter((r: any) => r.status === "Completed" && r.has_payload && r.business_goal && r.business_goal !== "—");
        if (completed.length >= 2) {
          setHistoricalDNA(completed.slice(0, 3).map((r: any) => ({
            goal: r.business_goal,
            strategy: r.selected_strategy !== "—" ? r.selected_strategy : "Strategic Recommendation",
            outcome: "Completed",
            trust: r.trust_score ?? 0,
            roi: r.estimated_roi ?? 0,
            lessons: r.top_recommendation !== "—" ? `Top action: ${r.top_recommendation}` : "Review workflow for full details.",
          })));
        } else {
          setHistoricalDNA(SEED_DNA);
        }
      })
      .catch(() => setHistoricalDNA(SEED_DNA));
  }, []);

  const mockPayload = {
    learning_summary: "Successfully captured the reviewer override. The sales playbook recommendation weights have been adapted to extend the B2B database staging timeline from 90 days to 120 days. Trust thresholds have been re-calibrated.",
    organizational_insights: [
      "Reviewer overrides indicate a preference for conservative database migration schedules over aggressive speed targets.",
      "Average approval rate for SaaS seat licenses above 400 is 94.2% when accompanied by executive sponsor notes.",
      "APAC regional rollout playbook has a high trust score correlation (91.5%)."
    ],
    strategy_success_patterns: [
      "Phased database migration pipelines decrease risk scores by 42%.",
      "Adding a dedicated client-side database specialist increases conversion rates by 18%."
    ],
    accepted_patterns: [
      "Extended timeline buffer (120 days)",
      "Reviewer-assigned VP operations role"
    ],
    rejected_patterns: [
      "Aggressive 90-day pipeline deployment without pilot",
      "Mock staging configurations without compliance review"
    ],
    prompt_improvement_suggestions: [
      "Incorporate a dedicated safety weight for legacy staging prompts.",
      "Add explicit SOC-2 criteria vectors in context retrievals."
    ],
    knowledge_gaps: [
      "Staging limits for legacy relational databases (missing doc ref: SLA-APAC-04)",
      "Policy requirements for non-standard seat license discounts"
    ],
    common_risks: [
      "Timeline compression",
      "Legacy system incompatibility",
      "SOC-2 compliance gap"
    ],
    learning_timestamp: new Date().toISOString()
  };

  const p = (artifact?.payload) ? artifact.payload : (forceData ? mockPayload : null);

  if (!p) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Brain size={40} className="mb-3 opacity-20" />
        <p className="text-base font-medium text-foreground">Learning Engine Offline</p>
        <p className="text-sm mt-1 text-center max-w-sm">
          The Learning Agent runs after approval is completed. Submit an approval decision to trigger it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Organizational Learning Engine</h2>
            <p className="text-xs text-muted-foreground">Continuous memory & pattern indexing</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-status-success-bg text-status-success border border-status-success/20 rounded-full">
          <CheckCircle2 size={11} /> Active
        </span>
      </div>

      {/* Summary */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5">Learning Summary</p>
        <p className="text-sm text-foreground leading-relaxed">{p.learning_summary}</p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="font-semibold text-foreground text-sm">Organizational Insights</h3>
          </div>
          <ul className="space-y-2.5">
            {p.organizational_insights?.map((insight: string, idx: number) => (
              <li key={idx} className="flex gap-2.5 text-sm text-foreground">
                <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Strategy Success Patterns</h3>
          </div>
          <ul className="space-y-2.5">
            {p.strategy_success_patterns?.map((pattern: string, idx: number) => (
              <li key={idx} className="flex gap-2.5 text-sm text-foreground">
                <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
                {pattern}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Accepted / Rejected */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-status-success" />
            <h3 className="text-sm font-semibold text-foreground">Accepted Patterns</h3>
          </div>
          <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
            {p.accepted_patterns?.map((item: string, idx: number) => (
              <p key={idx} className="text-sm text-muted-foreground">{item}</p>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={15} className="text-status-error" />
            <h3 className="text-sm font-semibold text-foreground">Rejected Patterns</h3>
          </div>
          <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
            {p.rejected_patterns?.map((item: string, idx: number) => (
              <p key={idx} className="text-sm text-muted-foreground">{item}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Optimization */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-violet-500" />
          <h3 className="text-sm font-semibold text-foreground">Optimization Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-violet-700 mb-2 uppercase tracking-wider">Prompt Improvements</h4>
            <ul className="space-y-1.5">
              {p.prompt_improvement_suggestions?.map((item: string, idx: number) => (
                <li key={idx} className="text-xs text-violet-800">{item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-secondary/40 border border-border rounded-lg p-4">
            <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Knowledge Gaps</h4>
            <ul className="space-y-1.5">
              {p.knowledge_gaps?.map((item: string, idx: number) => (
                <li key={idx} className="text-xs text-muted-foreground">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Common risks */}
      {p.common_risks?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-status-warning" />
            <h3 className="text-sm font-semibold text-foreground">Common Risks Identified</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.common_risks.map((r: string, i: number) => (
              <span key={i} className="text-xs bg-status-warning-bg text-status-warning border border-status-warning/20 px-2.5 py-1 rounded-full">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Decision DNA — Organizational Memory */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Decision DNA — Similar Historical Decisions</h3>
          <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Org Memory</span>
        </div>
        <div className="space-y-3">
          {historicalDNA.map((d, i) => (
            <div key={i} className="bg-secondary/30 border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{d.goal}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{d.strategy}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 italic">{d.lessons}</p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-semibold border text-[10px] ${d.outcome === "Approved" ? "bg-status-success-bg text-status-success border-status-success/20" : "bg-status-warning-bg text-status-warning border-status-warning/20"}`}>
                  {d.outcome}
                </span>
                {d.trust > 0 && <span className="text-muted-foreground font-mono">Trust {Math.round(d.trust * 100)}%</span>}
                {d.roi > 0 && <span className="text-primary font-semibold">${(d.roi / 1000).toFixed(0)}K ROI</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground/60 text-right font-mono">
        Learning timestamp: {p.learning_timestamp || "N/A"}
      </div>
    </div>
  );
}


