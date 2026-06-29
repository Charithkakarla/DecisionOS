import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  description?: string;
}

export function KPICard({ title, value, icon, trend, trendUp, description }: KPICardProps) {
  return (
    <div className="bg-card border border-border rounded-md p-5 shadow-card hover:shadow-card-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground leading-snug">{title}</p>
        <div className="h-8 w-8 flex items-center justify-center rounded bg-primary/8 text-primary shrink-0">
          {icon}
        </div>
      </div>

      <div className="text-3xl font-bold text-foreground tracking-tight leading-none mb-2">
        {value}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}

      {trend && (
        <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${trendUp
            ? "text-status-success bg-status-success-bg"
            : "text-status-warning bg-status-warning-bg"
          }`}>
          {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend}
        </div>
      )}
    </div>
  );
}
