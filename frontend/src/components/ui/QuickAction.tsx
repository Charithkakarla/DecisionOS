import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

interface QuickActionProps {
  title: string;
  description: string;
  icon: ReactNode;
  primary?: boolean;
}

export function QuickAction({ title, description, icon, primary = false }: QuickActionProps) {
  return (
    <div
      className={`group flex items-start gap-4 p-5 rounded-md border transition-all duration-200 cursor-pointer w-full text-left ${primary
          ? "bg-primary text-primary-foreground border-primary shadow-card hover:bg-primary/90"
          : "bg-card border-border text-foreground hover:border-border hover:shadow-card-md"
        }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded transition-colors ${primary
            ? "bg-white/20 text-white"
            : "bg-primary/8 text-primary group-hover:bg-primary/12"
          }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold text-sm leading-tight mb-0.5 ${primary ? "text-white" : "text-foreground"}`}>
          {title}
        </h3>
        <p className={`text-xs leading-relaxed ${primary ? "text-white/75" : "text-muted-foreground"}`}>
          {description}
        </p>
      </div>
      <ArrowRight
        size={14}
        className={`shrink-0 mt-0.5 transition-transform duration-150 group-hover:translate-x-0.5 ${primary ? "text-white/70" : "text-muted-foreground"
          }`}
      />
    </div>
  );
}
