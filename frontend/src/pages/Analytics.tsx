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

function WorkflowsChart() {
  const points = [
    { label: "Jan", val: 12 },
    { label: "Feb", val: 28 },
    { label: "Mar", val: 45 },
    { label: "Apr", val: 68 },
    { label: "May", val: 92 },
    { label: "Jun", val: 142 }
  ];
  const maxVal = 160;
  const width = 450;
  const height = 150;
  const padding = 25;
  
  // Calculate points path
  const pointsStr = points.map((p, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (points.length - 1);
    const y = height - padding - (p.val * (height - padding * 2)) / maxVal;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
      <div className="flex justify-between items-center border-b pb-2 mb-2">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Decision Velocity (Workflows / Month)</span>
        <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">+54% MoM Growth</span>
      </div>
      <div className="relative w-full h-[155px] flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="hsl(84, 10%, 88%)" strokeWidth="1" />
          <line x1={padding} y1={height - padding - 40} x2={width - padding} y2={height - padding - 40} stroke="hsl(84, 10%, 88%)" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding - 80} x2={width - padding} y2={height - padding - 80} stroke="hsl(84, 10%, 88%)" strokeDasharray="3 3" />
          
          {/* Axis Labels */}
          {points.map((p, idx) => {
            const x = padding + (idx * (width - padding * 2)) / (points.length - 1);
            return (
              <text key={idx} x={x} y={height - 8} fontSize="9" textAnchor="middle" fill="hsl(84, 20%, 40%)" className="font-sans font-semibold">
                {p.label}
              </text>
            );
          })}
          
          {/* Fill under line */}
          <polygon
            points={`${padding},${height - padding} ${points.map((p, idx) => {
              const x = padding + (idx * (width - padding * 2)) / (points.length - 1);
              const y = height - padding - (p.val * (height - padding * 2)) / maxVal;
              return `${x},${y}`;
            }).join(" ")} ${width - padding},${height - padding}`}
            fill="url(#grad)"
            opacity="0.12"
          />
          
          {/* The line */}
          <polyline
            fill="none"
            stroke="hsl(84, 35%, 24%)"
            strokeWidth="3"
            points={pointsStr}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points */}
          {points.map((p, idx) => {
            const x = padding + (idx * (width - padding * 2)) / (points.length - 1);
            const y = height - padding - (p.val * (height - padding * 2)) / maxVal;
            return (
              <g key={idx} className="group">
                <circle cx={x} cy={y} r="4" fill="white" stroke="hsl(84, 35%, 24%)" strokeWidth="2" />
                <circle cx={x} cy={y} r="7" fill="hsl(84, 35%, 24%)" opacity="0" className="hover:opacity-20 cursor-pointer transition-opacity" />
              </g>
            );
          })}
          
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(84, 35%, 24%)" />
              <stop offset="100%" stopColor="white" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function EfficiencyCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4">
      <div className="border-b pb-2 mb-1">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Business Impact & Automation ROI</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/40 border border-border rounded-xl p-3.5 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Decision Speedup</p>
          <p className="text-xl font-bold text-status-success mt-1">1,920x Faster</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">24 Hours → 45 Seconds</p>
        </div>
        <div className="bg-secondary/40 border border-border rounded-xl p-3.5 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Time Saved (Month)</p>
          <p className="text-xl font-bold text-foreground mt-1">320 Hours</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Automated desk auditing</p>
        </div>
        <div className="bg-secondary/40 border border-border rounded-xl p-3.5 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Savings</p>
          <p className="text-xl font-bold text-foreground mt-1">$48,200</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Operational overhead</p>
        </div>
        <div className="bg-secondary/40 border border-border rounded-xl p-3.5 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Audited Accuracy</p>
          <p className="text-xl font-bold text-foreground mt-1">99.2%</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Factuality check compliance</p>
        </div>
      </div>
      <div className="bg-primary/5 text-primary border border-primary/10 rounded-lg p-2 text-center text-[10px] font-semibold">
        📈 Business Target Achieved: Exceeds Q2 Efficiency KPIs by 18%
      </div>
    </div>
  );
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-up duration-300">
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

      {/* Visual Analytics & Business Impact */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkflowsChart />
        <EfficiencyCard />
      </section>

      {/* Agent performance table */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Agent Performance</h2>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
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
        <div className="bg-card border border-border rounded-2xl shadow-card divide-y divide-border">
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




