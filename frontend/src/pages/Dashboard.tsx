import { useState, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { QuickAction } from "../components/ui/QuickAction";
import { Zap, Upload, FileText, CheckCircle, Database, Shield, Activity, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await api.dashboard.getMetrics();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Sales Intelligence Hub" 
        description="Enterprise Deal Analysis & Coaching Command Center"
      />

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onClick={() => navigate("/workflows")}>
            <QuickAction 
              primary
              title="New Sales Call"
              description="Analyze a new meeting transcript"
              icon={<Plus size={24} />}
            />
          </div>
          <div onClick={() => navigate("/knowledge")}>
            <QuickAction 
              title="Upload Playbook"
              description="Ingest sales playbooks into the knowledge base"
              icon={<Upload size={24} />}
            />
          </div>
          <div onClick={() => navigate("/reports")}>
            <QuickAction 
              title="View Coaching Reports"
              description="Review latest deal coaching feedback"
              icon={<FileText size={24} />}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Organization KPIs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Calls Analyzed" 
            value={metrics ? metrics.total_workflows.toString() : "-"} 
            icon={<Zap size={20} />} 
            trend="12% this week"
            trendUp={true}
          />
          <KPICard 
            title="Active Playbooks" 
            value={metrics ? metrics.knowledge_documents.toString() : "-"} 
            icon={<Database size={20} />} 
            trend="4 added today"
            trendUp={true}
          />
          <KPICard 
            title="Avg Win Probability" 
            value={metrics ? metrics.average_trust_score : "-"} 
            icon={<Shield size={20} />} 
            trend="Stable"
            trendUp={true}
          />
          <KPICard 
            title="Action Items" 
            value={metrics ? metrics.pending_approvals.toString() : "-"} 
            icon={<CheckCircle size={20} />} 
            trend="Requires action"
            trendUp={false}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[300px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="animate-spin mb-2" size={24} />
                <p>Loading activity...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics?.recent_activity?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                    <div className="flex items-center space-x-3">
                      <Activity className="text-primary" size={16} />
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      item.status === "Completed" ? "bg-status-success-bg text-status-success border border-status-success/20" :
                      item.status === "Indexed" ? "bg-secondary text-primary border border-primary/20" :
                      "bg-status-warning-bg text-status-warning border border-status-warning/20"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">System Health</h2>
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm min-h-[300px]">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-muted-foreground">Database Capacity</span>
                <span className="text-primary font-medium">42%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "42%" }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-muted-foreground">API Latency</span>
                <span className="text-primary font-medium">84ms</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "15%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-muted-foreground">Agent Uptime</span>
                <span className="text-primary font-medium">99.9%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
