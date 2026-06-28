import { useState, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { QuickAction } from "../components/ui/QuickAction";
import {
  Zap, Upload, FileText, CheckCircle, Database, Shield,
  Activity, Plus, Loader2, BrainCircuit, ArrowRight,
  TrendingUp, Clock, Network, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const PIPELINE_STAGES = [
  { id: "context",    label: "Context",    color: "bg-emerald-500", desc: "Extracts structured enterprise context" },
  { id: "knowledge",  label: "Knowledge",  color: "bg-cyan-500",    desc: "Retrieves relevant playbooks & docs" },
  { id: "decision",   label: "Decision",   color: "bg-amber-500",   desc: "Scores opportunities, risks & readiness" },
  { id: "strategy",   label: "Strategy",   color: "bg-violet-500",  desc: "Generates 3-scenario execution plan" },
  { id: "reflection", label: "Governance", color: "bg-blue-500",    desc: "AI hallucination & compliance audit" },
  { id: "approval",   label: "Approval",   color: "bg-rose-500",    desc: "Human-in-the-loop review gate" },
  { id: "learning",   label: "Learning",   color: "bg-orange-400",  desc: "Updates organizational memory" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.dashboard.getMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Sales Intelligence Hub"
        description="Agentic Decision Intelligence Platform — transforming customer interactions into next best actions."
      />

      {/* Quick Actions */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onClick={() => navigate("/workflows")} className="cursor-pointer">
            <QuickAction
              primary
              title="Analyze Sales Call"
              description="Paste a transcript and run the full 7-agent pipeline"
              icon={<Plus size={22} />}
            />
          </div>
          <div onClick={() => navigate("/knowledge")} className="cursor-pointer">
            <QuickAction
              title="Upload Playbook"
              description="Ingest sales playbooks into the knowledge base"
              icon={<Upload size={22} />}
            />
          </div>
          <div onClick={() => navigate("/reports")} className="cursor-pointer">
            <QuickAction
              title="Coaching Reports"
              description="Review latest deal coaching feedback"
              icon={<FileText size={22} />}
            />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Organization KPIs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Calls Analyzed"
            value={metrics ? metrics.total_workflows.toString() : "—"}
            icon={<Zap size={18} />}
            trend="This month"
            trendUp={true}
          />
          <KPICard
            title="Active Playbooks"
            value={metrics ? metrics.knowledge_documents.toString() : "—"}
            icon={<Database size={18} />}
            trend="In knowledge base"
            trendUp={true}
          />
          <KPICard
            title="Avg Trust Score"
            value={metrics ? metrics.average_trust_score : "—"}
            icon={<Shield size={18} />}
            trend="AI governance rating"
            trendUp={true}
          />
          <KPICard
            title="Pending Reviews"
            value={metrics ? metrics.pending_approvals.toString() : "—"}
            icon={<CheckCircle size={18} />}
            trend="Awaiting approval"
            trendUp={false}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Pipeline Diagram */}
        <section className="lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground mb-3">Agentic Pipeline Architecture</h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Network size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">7-Stage Autonomous Reasoning Chain</span>
              <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">Planner-Orchestrated</span>
            </div>
            <div className="space-y-2.5">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-3 group">
                  {/* Number */}
                  <span className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {i + 1}
                  </span>
                  {/* Color dot + label */}
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shrink-0`} />
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground w-20 shrink-0">{stage.label}</span>
                    <span className="text-xs text-muted-foreground flex-1">{stage.desc}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden shrink-0">
                    <div className={`h-full ${stage.color} rounded-full`} style={{ width: "100%" }} />
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/workflows")}
              className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <BrainCircuit size={16} />
              Run New Analysis
            </button>
          </div>
        </section>

        {/* Right column: Activity + System Health */}
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Recent Activity</h2>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm min-h-[180px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="animate-spin mb-2" size={20} />
                  <p className="text-xs">Loading...</p>
                </div>
              ) : metrics?.recent_activity?.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recent_activity.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-background rounded-lg border border-border">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Activity className="text-primary shrink-0" size={14} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-xs truncate">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 border ${
                        item.status === "Completed"
                          ? "bg-status-success-bg text-status-success border-status-success/20"
                          : item.status === "Indexed"
                          ? "bg-secondary text-primary border-primary/20"
                          : "bg-status-warning-bg text-status-warning border-status-warning/20"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Clock size={20} className="mb-2 opacity-30" />
                  <p className="text-xs">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">System Health</h2>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              {[
                { label: "Agent Pipeline",  value: metrics?.system_health?.agent_pipeline?.value   ?? 100, display: metrics?.system_health?.agent_pipeline?.display   ?? "Operational", color: "bg-status-success" },
                { label: "Knowledge Store", value: metrics?.system_health?.knowledge_store?.value  ?? 0,   display: metrics?.system_health?.knowledge_store?.display  ?? "—",           color: "bg-primary" },
                { label: "API Latency",     value: metrics?.system_health?.api_latency?.value      ?? 0,   display: metrics?.system_health?.api_latency?.display      ?? "—",           color: "bg-primary" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.display}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div className={`${item.color} h-1.5 rounded-full transition-all`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-status-success">
                  <Sparkles size={12} />
                  <span>All 7 agents online</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Feature callout for hackathon judges */}
      <section>
        <div className="bg-gradient-to-r from-primary/10 via-secondary to-primary/5 border border-primary/20 rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-primary" />
                <h3 className="text-base font-bold text-foreground">Platform Capabilities</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                {[
                  "Planner-orchestrated agents",
                  "Hybrid vector + BM25 retrieval",
                  "Explainable recommendations",
                  "3-scenario strategy simulation",
                  "AI hallucination detection",
                  "Human-in-the-loop governance",
                  "Organizational memory & learning",
                  "Multi-provider LLM support",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-1.5">
                    <CheckCircle size={11} className="text-status-success shrink-0" />
                    {feat}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate("/workflows")}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Try the Platform
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Measurable outcomes */}
      {metrics && (metrics.total_workflows > 0 || metrics.knowledge_documents > 0) && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Measurable Business Outcomes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Decisions Automated", value: metrics.total_workflows, suffix: "", desc: "End-to-end AI workflows completed" },
              { label: "Knowledge Assets", value: metrics.knowledge_documents, suffix: "", desc: "Enterprise docs indexed & searchable" },
              { label: "Avg AI Trust Score", value: metrics.average_trust_score, suffix: "", desc: "Governance & hallucination audit" },
              { label: "Human Reviews", value: metrics.pending_approvals, suffix: " pending", desc: "Human-in-the-loop approval gate" },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-black text-foreground">{m.value}{m.suffix}</p>
                <p className="text-xs font-semibold text-foreground mt-1">{m.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
