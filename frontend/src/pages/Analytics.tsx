import { PageHeader } from "../components/ui/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { Activity, Shield, Clock, DollarSign } from "lucide-react";

export function Analytics() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Analytics" 
        description="Monitor system performance, agent health, and execution ROI."
      />

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="System Trust Score" 
            value="95.2%" 
            icon={<Shield size={20} />} 
            trend="1.2% this month"
            trendUp={true}
          />
          <KPICard 
            title="Average Latency" 
            value="842ms" 
            icon={<Clock size={20} />} 
            trend="120ms improvement"
            trendUp={true}
          />
          <KPICard 
            title="Tokens Processed" 
            value="1.2M" 
            icon={<Activity size={20} />} 
            trend="8% increase"
            trendUp={true}
          />
          <KPICard 
            title="Estimated Cost" 
            value="$42.50" 
            icon={<DollarSign size={20} />} 
            trend="Under budget"
            trendUp={true}
          />
        </div>
      </section>

      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center min-h-[400px] shadow-sm">
        <p className="text-muted-foreground text-lg">Charts and graphs will be rendered here.</p>
      </div>
    </div>
  );
}
