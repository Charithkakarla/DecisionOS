import { useState, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { Activity, Shield, Clock, DollarSign, Loader2, BrainCircuit, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

interface AgentStat {
  agent: string;
  runs: number;
  avg_latency_ms: number;
  avg_confidence: number;
  success_rate: number;
}

export function Analytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.dashboard.getMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const agentStats: AgentStat[] = metrics?.agent_stats ?? [];

  const formatMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Analytics"
        description="Pipeline performance, agent health, and execution quality metrics."
      />

      {/* Top KPIs — from live dashboard endpoint */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Avg Trust Score"
            value={metrics ? metrics.average_trust_score : "—"}
            icon={<Shield size={18} />}
            trend="AI governance rating"
            trendUp={true}
          />
          <KPICard
            title="Workflows Run"
            value={metrics ? metrics.total_workflows.toString() : "—"}
            icon={<Activity size={18} />}
            trend="All time"
            trendUp={true}
          />
          <KPICard
            title="Pending Reviews"
            value={metrics ? metrics.pending_approvals.toString() : "—"}
            icon={<Clock size={18} />}
            trend="Awaiting human review"
            trendUp={false}
          />
          <KPICard
            title="Knowledge Assets"
            value={metrics ? metrics.knowledge_documents.toString() : "—"}
            icon={<DollarSign size={18} />}
            trend="Documents indexed"
            trendUp={true}
          />
        </div>
      </section>

      {/* Agent performance table */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Agent Performance</h2>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={18} />
              <span className="text-sm">Loading performance data...</span>
            </div>
          ) : agentStats.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 border-b border-border">
                <tr>
                  {["Agent", "Runs", "Avg Latency", "Avg Confidence", "Success Rate"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agentStats.map((stat) => (
                  <tr key={stat.agent} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2">
                      <BrainCircuit size={14} className="text-primary" />
                      {stat.agent.charAt(0).toUpperCase() + stat.agent.slice(1)} Agent
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{stat.runs}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatMs(stat.avg_latency_ms)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${stat.avg_confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">{(stat.avg_confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                        stat.success_rate >= 0.9
                          ? "bg-status-success-bg text-status-success border-status-success/20"
                          : stat.success_rate >= 0.7
                          ? "bg-status-warning-bg text-status-warning border-status-warning/20"
                          : "bg-status-error-bg text-status-error border-status-error/20"
                      }`}>
                        {stat.success_rate >= 0.9
                          ? <CheckCircle2 size={10} />
                          : <AlertTriangle size={10} />}
                        {(stat.success_rate * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity size={36} className="mb-3 opacity-20" />
              <p className="text-sm">No agent execution data yet.</p>
              <p className="text-xs mt-1">Run workflows to populate performance metrics.</p>
            </div>
          )}
        </div>
      </section>

      {/* Workflow event log */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Workflow Activity</h2>
        <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={18} />
              <span className="text-sm">Loading...</span>
            </div>
          ) : metrics?.recent_activity?.length > 0 ? (
            metrics.recent_activity.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <Activity size={14} className="text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                  item.status === "Completed"
                    ? "bg-status-success-bg text-status-success border-status-success/20"
                    : "bg-status-warning-bg text-status-warning border-status-warning/20"
                }`}>
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No workflow activity recorded.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
