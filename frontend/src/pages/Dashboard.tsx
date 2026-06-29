import { useState, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { QuickAction } from "../components/ui/QuickAction";
import {
  Zap, Upload, FileText, CheckCircle, Database, Shield,
  Activity, Plus, ArrowRight,
  TrendingUp, Clock, Network, CheckCircle2, CircleDot
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { motion } from "framer-motion";

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.06 } } },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } } },
};

const PIPELINE_STAGES = [
  { id: "context", label: "Context", color: "bg-slate-500", desc: "Extracts structured enterprise context" },
  { id: "knowledge", label: "Knowledge", color: "bg-blue-700", desc: "Retrieves relevant playbooks & docs" },
  { id: "decision", label: "Decision", color: "bg-amber-600", desc: "Scores opportunities, risks & readiness" },
  { id: "strategy", label: "Strategy", color: "bg-teal-700", desc: "Generates 3-scenario execution plan" },
  { id: "reflection", label: "Governance", color: "bg-slate-600", desc: "Compliance & quality audit" },
  { id: "approval", label: "Approval", color: "bg-red-700", desc: "Human-in-the-loop review gate" },
  { id: "learning", label: "Learning", color: "bg-green-700", desc: "Updates organizational memory" },
];

const PLATFORM_FEATURES = [
  "Planner-orchestrated agents",
  "Hybrid vector + BM25 retrieval",
  "Explainable recommendations",
  "3-scenario strategy simulation",
  "Hallucination detection",
  "Human-in-the-loop governance",
  "Organizational memory & learning",
  "Multi-provider LLM support",
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
    <motion.div
      className="max-w-7xl mx-auto space-y-8"
      initial="initial"
      animate="animate"
      variants={stagger.container}
    >
      <motion.div variants={stagger.item}>
        <PageHeader
          title="Sales Intelligence Hub"
          description="Agentic Decision Intelligence Platform — transforming customer interactions into next best actions."
          badge="Enterprise"
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.section variants={stagger.item}>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onClick={() => navigate("/workflows")} className="cursor-pointer">
            <QuickAction primary title="Analyze Sales Call" description="Paste a transcript and run the full 7-agent pipeline" icon={<Plus size={20} />} />
          </div>
          <div onClick={() => navigate("/knowledge")} className="cursor-pointer">
            <QuickAction title="Upload Playbook" description="Ingest sales playbooks into the knowledge base" icon={<Upload size={20} />} />
          </div>
          <div onClick={() => navigate("/reports")} className="cursor-pointer">
            <QuickAction title="Coaching Reports" description="Review latest deal coaching feedback" icon={<FileText size={20} />} />
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <motion.section variants={stagger.item}>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Organization KPIs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Calls Analyzed"
            value={metrics ? metrics.total_workflows.toString() : "—"}
            icon={<Zap size={17} />}
            trend="This month"
            trendUp={true}
          />
          <KPICard
            title="Active Playbooks"
            value={metrics ? metrics.knowledge_documents.toString() : "—"}
            icon={<Database size={17} />}
            trend="In knowledge base"
            trendUp={true}
          />
          <KPICard
            title="Avg Trust Score"
            value={metrics ? metrics.average_trust_score : "—"}
            icon={<Shield size={17} />}
            trend="AI governance rating"
            trendUp={true}
          />
          <KPICard
            title="Pending Reviews"
            value={metrics ? metrics.pending_approvals.toString() : "—"}
            icon={<CheckCircle size={17} />}
            trend="Awaiting approval"
            trendUp={false}
          />
        </div>
      </motion.section>

      <motion.div variants={stagger.item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Pipeline */}
        <section className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Agentic Pipeline</h2>
          <div className="bg-card border border-border rounded-md p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/8 text-primary">
                <Network size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">7-Stage Autonomous Reasoning Chain</p>
                <p className="text-xs text-muted-foreground">Planner-orchestrated multi-agent system</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded border border-border font-medium">
                Planner-Orchestrated
              </span>
            </div>

            <div className="space-y-1.5">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage.id} className="group flex items-center gap-3 p-2 rounded-md hover:bg-secondary/70 transition-colors">
                  <span className="w-6 h-6 rounded bg-secondary text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    {i + 1}
                  </span>
                  <div className={`w-2 h-2 rounded-sm ${stage.color} shrink-0`} />
                  <span className="text-sm font-semibold text-foreground w-24 shrink-0">{stage.label}</span>
                  <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{stage.desc}</span>
                  <div className="w-20 h-1.5 bg-secondary rounded overflow-hidden shrink-0">
                    <div className={`h-full ${stage.color} rounded`} style={{ width: "100%" }} />
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight size={11} className="text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/workflows")}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Zap size={15} />
              Run New Analysis
            </button>
          </div>
        </section>

        {/* Right column */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Recent Activity</h2>
            <div className="bg-card border border-border rounded-md p-5 shadow-card min-h-[180px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <CircleDot className="animate-spin mb-2 opacity-40" size={18} />
                  <p className="text-xs">Loading...</p>
                </div>
              ) : metrics?.recent_activity?.length > 0 ? (
                <div className="space-y-2">
                  {metrics.recent_activity.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-background rounded border border-border">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded bg-primary/8 flex items-center justify-center shrink-0">
                          <Activity className="text-primary" size={12} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-xs truncate">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 border ${item.status === "Completed"
                        ? "bg-status-success-bg text-status-success border-status-success/20"
                        : item.status === "Indexed"
                          ? "bg-primary/8 text-primary border-primary/20"
                          : "bg-status-warning-bg text-status-warning border-status-warning/20"
                        }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Clock size={18} className="mb-2 opacity-30" />
                  <p className="text-xs">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">System Health</h2>
            <div className="bg-card border border-border rounded-md p-5 shadow-card space-y-4">
              {[
                { label: "Agent Pipeline", value: metrics?.system_health?.agent_pipeline?.value ?? 100, display: metrics?.system_health?.agent_pipeline?.display ?? "Operational", color: "bg-status-success" },
                { label: "Knowledge Store", value: metrics?.system_health?.knowledge_store?.value ?? 0, display: metrics?.system_health?.knowledge_store?.display ?? "—", color: "bg-primary" },
                { label: "API Latency", value: metrics?.system_health?.api_latency?.value ?? 0, display: metrics?.system_health?.api_latency?.display ?? "—", color: "bg-primary" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1.5 text-xs">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="text-foreground font-semibold">{item.display}</span>
                  </div>
                  <div className="w-full bg-secondary rounded h-1.5 overflow-hidden">
                    <div className={`${item.color} h-1.5 rounded transition-all duration-700`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-status-success font-medium">
                  <CheckCircle2 size={12} />
                  All 7 agents online
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.div>

      {/* Platform Capabilities */}
      <motion.section variants={stagger.item}>
        <div className="bg-card border border-border rounded-md p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/8 text-primary">
                  <TrendingUp size={15} />
                </div>
                <h3 className="text-sm font-bold text-foreground">Platform Capabilities</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
                {PLATFORM_FEATURES.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 size={11} className="text-status-success shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate("/workflows")}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Try the Platform
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.section>

      {/* Measurable Outcomes */}
      {metrics && (metrics.total_workflows > 0 || metrics.knowledge_documents > 0) && (
        <motion.section variants={stagger.item}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Business Outcomes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Decisions Automated", value: metrics.total_workflows, suffix: "", desc: "End-to-end AI workflows completed" },
              { label: "Knowledge Assets", value: metrics.knowledge_documents, suffix: "", desc: "Enterprise docs indexed & searchable" },
              { label: "Avg AI Trust Score", value: metrics.average_trust_score, suffix: "", desc: "Governance & hallucination audit" },
              { label: "Human Reviews", value: metrics.pending_approvals, suffix: " pending", desc: "Human-in-the-loop approval gate" },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-md p-5 shadow-card hover:shadow-card-md transition-all duration-200">
                <p className="text-2xl font-bold text-foreground tracking-tight">{m.value}{m.suffix}</p>
                <p className="text-xs font-semibold text-foreground mt-1.5">{m.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}


