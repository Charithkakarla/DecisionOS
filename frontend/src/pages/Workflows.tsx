import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import {
  Upload, FileText, ArrowRight, Link2, Mail,
  MessageSquare, CheckCircle2, ChevronRight, Clock, Zap,
  Sparkles
} from "lucide-react";
import { api } from "../lib/api";
import { AgentProgress } from "../components/workflows/AgentProgress";
import { saveWorkflowState } from "../lib/workflowStore";

type WorkflowStage = "INPUT" | "ANALYZING" | "DONE";

const QUICK_TRANSCRIPTS = [
  {
    label: "SaaS Discovery",
    text: `Meeting Transcript - Acme Corp Discovery Call
Date: June 28, 2026
Attendees: Sarah Chen (AE), Mike Torres (VP Engineering, Acme), Lisa Park (CFO, Acme)

Sarah: Thanks for joining today. Can you walk me through your current CI/CD setup?

Mike: Sure. We're running Jenkins on-prem, about 200 developers, deploying maybe 30 times a day. The pain point is flaky tests — our pipeline fails 40% of the time, costing us roughly 2 hours per engineer per week.

Lisa: From a finance perspective, we're spending about $180k/year on infra for the pipeline alone. We need to cut that by at least 30% before Q4.

Sarah: What's driving the Q4 deadline?

Lisa: Board review. We're projecting a Series C raise and they want to see operational efficiency.

Mike: Also, our main competitor just shipped a feature we've been planning for 6 months. We need to move faster.

Sarah: Have you evaluated any cloud-native CI/CD options?

Mike: We looked at GitHub Actions but our security team flagged data residency concerns. We need SOC2 Type II and GDPR compliance.

Sarah: We're fully SOC2 Type II certified and GDPR compliant. Our enterprise plan includes a dedicated tenant option.

Lisa: What does pricing look like at our scale?

Sarah: At 200 seats with your usage pattern, you'd be looking at roughly $8,400/month — that's a 44% reduction from your current $180k/year spend.`
  },
  {
    label: "Customer Success",
    text: `Customer Success QBR Notes - TechFlow Inc
Date: June 28, 2026
CSM: Jordan Lee | Account: TechFlow Inc | ARR: $240,000

Health Score: 62 (Yellow) - Down from 78 last quarter

Key Discussion Points:
- Product adoption: Only 3 of 8 purchased modules actively used
- Champion contact (David Wu, CTO) left company 3 weeks ago
- New stakeholder is Rachel Kim (COO) — first meeting next week
- Support tickets increased 40% last quarter, mostly around API integration
- Renewal date: September 15, 2026 (78 days away)
- Competitor evaluation: Rachel mentioned they're "exploring options"

Risks Identified:
- Champion departure creates relationship gap
- Low module adoption suggests poor ROI perception
- Upcoming renewal with no internal champion is high churn risk
- COO focus is on cost reduction, not feature expansion

Opportunities:
- Rachel Kim is focused on operational efficiency — strong use case for automation modules
- Integration issues are solvable with a dedicated technical session
- Q3 roadmap includes features directly addressing their API pain points`
  }
];

const PIPELINE_STEPS = [
  "Context Intelligence → structured extraction",
  "Knowledge Retrieval → playbook matching",
  "Decision Analysis → opportunity scoring",
  "Strategy Planning → scenario simulation",
  "AI Governance → hallucination check",
  "Human-in-the-Loop → review & approve",
  "Learning Engine → memory update",
];

export function Workflows() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<WorkflowStage>("INPUT");
  const [inputText, setInputText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [workflowState, setWorkflowState] = useState<any>(null);

  const handleStartAnalysis = async () => {
    if (!inputText.trim()) return;
    setStage("ANALYZING");
    setIsCompleted(false);

    try {
      const response = await api.workflows.run(inputText);
      setWorkflowState(response);
      saveWorkflowState(response);
      setIsCompleted(true);
      setTimeout(() => setStage("DONE"), 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to run workflow. Is the backend running on port 8000?");
      setStage("INPUT");
    }
  };

  const handleViewFullResults = () => {
    if (!workflowState) return;
    navigate(`/workflows/${workflowState.workflow_id || "latest"}`, {
      state: { initialData: workflowState }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) setInputText(event.target.result.toString());
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setStage("INPUT");
    setInputText("");
    setWorkflowState(null);
    setIsCompleted(false);
  };

  // ── DONE state ──────────────────────────────────────────────────────────
  if (stage === "DONE" && workflowState) {
    const decision = workflowState.decision_artifact?.payload;
    const strategy = workflowState.strategy_artifact?.payload;
    const reflection = workflowState.reflection_artifact?.payload;
    const recs = decision?.recommendations ?? [];
    const topRec = recs[0];

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in slide-up duration-300">
        <PageHeader
          title="Analysis Complete"
          description="Your AI pipeline finished. Review the summary below or open the full inspection portal."
          badge="Pipeline Complete"
        />

        {/* Success banner */}
        <div className="flex items-center gap-4 bg-status-success-bg border border-status-success/20 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-status-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="text-status-success" size={20} />
          </div>
          <div>
            <p className="font-semibold text-foreground">Pipeline executed successfully</p>
            <p className="text-sm text-muted-foreground">
              Workflow ID: <span className="font-mono text-primary">{workflowState.workflow_id}</span>
              {reflection && (
                <span className="ml-4">
                  Trust Score: <span className="font-semibold text-status-success">{(reflection.overall_trust_score * 100).toFixed(0)}%</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Agent timeline */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Agent Execution Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { key: "context", label: "Context", done: !!workflowState.context_artifact },
              { key: "knowledge", label: "Knowledge", done: !!workflowState.knowledge_artifact },
              { key: "decision", label: "Decision", done: !!workflowState.decision_artifact },
              { key: "strategy", label: "Strategy", done: !!workflowState.strategy_artifact },
              { key: "reflection", label: "Reflection", done: !!workflowState.reflection_artifact },
              { key: "approval", label: "Approval", done: !!workflowState.approval_artifact },
              { key: "learning", label: "Learning", done: !!workflowState.learning_artifact },
            ].map((agent) => (
              <div key={agent.key} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${agent.done
                ? "bg-status-success-bg border-status-success/20"
                : "bg-secondary border-border opacity-40"
                }`}>
                <CheckCircle2 size={15} className={agent.done ? "text-status-success" : "text-muted-foreground"} />
                <span className="text-xs font-medium text-foreground">{agent.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top recommendation */}
        {topRec && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Top Recommended Action</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${topRec.risk_level === "High" ? "bg-status-error-bg text-status-error border-status-error/20" :
                topRec.risk_level === "Medium" ? "bg-status-warning-bg text-status-warning border-status-warning/20" :
                  "bg-status-success-bg text-status-success border-status-success/20"
                }`}>
                {topRec.risk_level} Risk · {(topRec.confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>
            <h4 className="text-base font-bold text-foreground mb-1.5">{topRec.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{topRec.description}</p>
            {recs.length > 1 && (
              <p className="text-xs text-muted-foreground mt-3">
                + {recs.length - 1} more recommendation{recs.length - 1 > 1 ? "s" : ""} available in full view
              </p>
            )}
          </div>
        )}

        {/* Strategy */}
        {strategy?.selected_strategy && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Selected Strategy</p>
                <p className="font-semibold text-foreground">{strategy.selected_strategy}</p>
              </div>
              {strategy.estimated_roi > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Estimated ROI</p>
                  <p className="text-xl font-bold text-status-success">${strategy.estimated_roi.toLocaleString()}</p>
                </div>
              )}
              {strategy.estimated_success_probability > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Success Rate</p>
                  <p className="text-xl font-bold text-primary">{(strategy.estimated_success_probability * 100).toFixed(0)}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleViewFullResults}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm text-sm"
          >
            <Zap size={16} />
            Open Full Analysis & Approval Portal
            <ChevronRight size={15} />
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors text-sm"
          >
            <Clock size={15} />
            New Analysis
          </button>
        </div>
      </div>
    );
  }

  // ── ANALYZING state ────────────────────────────────────────────────────────
  if (stage === "ANALYZING") {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in slide-up duration-300">
        <PageHeader
          title="Sales Intelligence Hub"
          description="Monitor, execute, and inspect your AI Executive Pipelines."
        />
        <AgentProgress isCompleted={isCompleted} />
      </div>
    );
  }

  // ── INPUT state ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-up duration-300">
      <PageHeader
        title="Sales Intelligence Hub"
        description="Submit a sales call transcript, CRM note, or meeting summary to trigger the AI pipeline."
        badge="7-Agent Pipeline"
      />

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Left: text input */}
          <div className="p-8 lg:w-3/5 border-b lg:border-b-0 lg:border-r border-border flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Paste Interaction Data</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Meeting transcripts, CRM notes, emails, customer success check-ins.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {QUICK_TRANSCRIPTS.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => setInputText(ex.text)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-primary/30 transition-all font-medium"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste transcript, CRM notes, or meeting summary here..."
              className="flex-1 min-h-[300px] p-4 rounded-xl bg-background border border-border text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all text-sm leading-7 placeholder:text-muted-foreground/50"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                {inputText.length > 0
                  ? <span className="text-primary">{inputText.length.toLocaleString()} characters</span>
                  : "No input yet"}
              </span>
              <button
                onClick={handleStartAnalysis}
                disabled={!inputText.trim()}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
              >
                <Sparkles size={16} />
                Run AI Pipeline
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Right: upload + integrations */}
          <div className="p-8 lg:w-2/5 bg-secondary/30 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Upload a File</h3>
              <div
                className="relative border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-8 flex flex-col items-center justify-center bg-card transition-colors cursor-pointer group"
                onClick={() => document.getElementById("file-upload-wf")?.click()}
              >
                <input
                  type="file"
                  id="file-upload-wf"
                  accept=".txt,.md,.csv,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <Upload size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="font-semibold text-foreground text-sm text-center">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">TXT, MD, CSV, PDF</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Connect Data Sources</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Link2 size={14} />, label: "CRM Sync" },
                  { icon: <Mail size={14} />, label: "Email Sync" },
                  { icon: <MessageSquare size={14} />, label: "Slack / Teams" },
                  { icon: <FileText size={14} />, label: "Zoom Transcripts" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-xs text-muted-foreground bg-card p-3 rounded-xl border border-border hover:border-primary/30 hover:text-foreground transition-all cursor-pointer"
                  >
                    <span className="text-primary">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3">Pipeline Overview</h3>
              <div className="space-y-2">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

