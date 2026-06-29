interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        {badge && (
          <span className="inline-flex items-center text-xs font-semibold text-primary bg-primary/8 border border-primary/15 px-2 py-0.5 rounded mb-2">
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
