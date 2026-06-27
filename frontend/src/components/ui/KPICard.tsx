import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export function KPICard({ title, value, icon, trend, trendUp }: KPICardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="p-2 bg-secondary rounded-full text-primary">
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        
        {trend && (
          <div className={`flex items-center text-xs font-medium space-x-1 ${
            trendUp ? "text-status-success" : "text-status-warning"
          }`}>
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}
