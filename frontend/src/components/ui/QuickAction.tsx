import { ReactNode } from "react";

interface QuickActionProps {
  title: string;
  description: string;
  icon: ReactNode;
  primary?: boolean;
}

export function QuickAction({ title, description, icon, primary = false }: QuickActionProps) {
  return (
    <button 
      className={`group flex items-start text-left p-5 rounded-lg border transition-all ${
        primary 
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm" 
          : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-secondary shadow-sm"
      }`}
    >
      <div className={`p-2 rounded-full mr-4 transition-colors ${
        primary 
          ? "bg-primary-foreground/20 text-primary-foreground" 
          : "bg-secondary text-primary group-hover:bg-background"
      }`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-semibold mb-1 ${primary ? "text-primary-foreground" : "text-foreground"}`}>
          {title}
        </h3>
        <p className={`text-sm leading-relaxed ${primary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {description}
        </p>
      </div>
    </button>
  );
}
