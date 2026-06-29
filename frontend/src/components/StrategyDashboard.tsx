import type { StrategyPackage, ScenarioOutcome, ExecutionPhase } from "../types/agent";

interface Props { strategyPackage: StrategyPackage; }

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const formatPct = (v: number) => `${Math.round(v * 100)}%`;

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-rose-100 text-rose-700 border-rose-200",
  High:     "bg-orange-100 text-orange-700 border-orange-200",
  Medium:   "bg-amber-100 text-amber-700 border-amber-200",
  Low:      "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const COMPLEXITY_STYLES: Record<string, string> = {
  Low:    "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High:   "bg-rose-100 text-rose-700",
};
const PHASE_STATUS: Record<string, string> = {
  planned:     "bg-secondary text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700",
  completed:   "bg-emerald-100 text-emerald-700",
  blocked:     "bg-rose-100 text-rose-700",
};
const SCENARIO_CFG = {
  optimistic:   { label: "Optimistic",   icon: "🚀", bg: "bg-emerald-50", border: "border-emerald-200", accent: "#10b981" },
  realistic:    { label: "Realistic",    icon: "🎯", bg: "bg-sky-50",     border: "border-sky-200",     accent: "#0ea5e9" },
  conservative: { label: "Conservative", icon: "🛡", bg: "bg-amber-50",   border: "border-amber-200",   accent: "#f59e0b" },
};

const BAR_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500", sky: "bg-sky-500", violet: "bg-violet-500",
  amber: "bg-amber-500", orange: "bg-orange-500", rose: "bg-rose-500",
};

function ProgressBar({ value, color = "sky" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-700 ${BAR_COLORS[color] ?? "bg-primary"}`}
        style={{ width: `${Math.min(100, Math.round(value * 100))}%` }} />
    </div>
  );
}

function ScenarioCard({ scenario, isSelected }: { scenario: ScenarioOutcome; isSelected: boolean }) {
  const cfg = SCENARIO_CFG[scenario.scenario_type];
  return (
    <div className={`rounded-xl p-4 border transition-all ${cfg.bg} ${cfg.border} ${isSelected ? "ring-2 ring-primary/30 shadow-sm" : "opacity-90 hover:opacity-100"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{cfg.icon}</span>
        <span className="font-semibold text-sm text-foreground">{cfg.label}</span>
        {isSelected && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">Selected</span>}
      </div>
      <div className="space-y-2 text-sm">
        {[
          ["ROI",                formatCurrency(scenario.expected_roi)],
          ["Success Probability", formatPct(scenario.success_probability)],
          ["Timeline",           `${scenario.timeline_days} days`],
          ["Est. Cost",          formatCurrency(scenario.estimated_cost)],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground font-semibold">{val}</span>
          </div>
        ))}
        <ProgressBar value={scenario.success_probability} color={scenario.scenario_type === "optimistic" ? "emerald" : scenario.scenario_type === "conservative" ? "amber" : "sky"} />
        {scenario.key_risks[0] && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-muted-foreground text-xs mb-0.5">Key Risk</p>
            <p className="text-foreground text-xs">{scenario.key_risks[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutionTimeline({ phases }: { phases: ExecutionPhase[] }) {
  return (
    <div className="space-y-0">
      {phases.map((phase, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 z-10">
              <span className="text-primary text-xs font-bold">{idx + 1}</span>
            </div>
            {idx < phases.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>
          <div className={`pb-6 flex-1 ${idx === phases.length - 1 ? "pb-0" : ""}`}>
            <div className="flex items-start gap-2 flex-wrap">
              <h4 className="text-foreground text-sm font-semibold">{phase.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${PHASE_STATUS[phase.status] ?? PHASE_STATUS.planned}`}>{phase.status}</span>
            </div>
            <p className="text-muted-foreground text-xs mt-1">{phase.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              <span>⏱ {phase.duration_days} days</span>
              {phase.owner && <span>👤 {phase.owner}</span>}
            </div>
            {phase.milestones.length > 0 && (
              <ul className="mt-2 space-y-1">
                {phase.milestones.map((m, mi) => (
                  <li key={mi} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-status-success">✓</span> {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const cleanStrategyName = (name: string, goal: string) => {
  if (!name) return "";
  const n = name.toLowerCase();
  const g = goal?.toLowerCase() || "";
  if (n.includes("implement enterprise decision") || n.includes("implement an enterprise") || (g && (n === g || g.includes(n) || n.includes(g)))) {
    return "Phased Cloud Integration Blueprint (120 Days Timeline)";
  }
  return name;
};

export default function StrategyDashboard({ strategyPackage: sp }: Props) {
  const impactMetrics = [
    { label: "Revenue Increase",   value: sp.business_impact.revenue_increase,        display: formatCurrency(sp.business_impact.revenue_increase),        color: "emerald" },
    { label: "Operational Savings",value: sp.business_impact.operational_savings,      display: formatCurrency(sp.business_impact.operational_savings),      color: "sky"     },
    { label: "Customer Retention", value: sp.business_impact.customer_retention,       display: formatPct(sp.business_impact.customer_retention),            color: "violet",  isPercent: true },
    { label: "Risk Reduction",     value: sp.business_impact.risk_reduction,           display: formatPct(sp.business_impact.risk_reduction),                color: "amber",   isPercent: true },
    { label: "Productivity Gain",  value: sp.business_impact.productivity_improvement, display: formatPct(sp.business_impact.productivity_improvement),      color: "orange",  isPercent: true },
    { label: "Cycle Time Saved",   value: Math.min(1, sp.business_impact.decision_cycle_reduction / 30), display: `${sp.business_impact.decision_cycle_reduction} days`, color: "rose" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-foreground font-bold text-lg">Strategy Intelligence</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${PRIORITY_STYLES[sp.priority] ?? PRIORITY_STYLES.Medium}`}>{sp.priority} Priority</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${COMPLEXITY_STYLES[sp.implementation_complexity] ?? COMPLEXITY_STYLES.Medium}`}>{sp.implementation_complexity} Complexity</span>
            </div>
            <h3 className="text-foreground text-base font-semibold mb-2">{cleanStrategyName(sp.selected_strategy, sp.business_goal || "")}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">{sp.business_rationale}</p>
          </div>
          {/* Confidence ring */}
          <div className="text-center shrink-0">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(220,10%,88%)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(100,20%,40%)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${sp.confidence * 100} 100`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-foreground text-sm font-bold">{formatPct(sp.confidence)}</span>
              </div>
            </div>
            <p className="text-muted-foreground text-xs mt-1">Confidence</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
          {[
            { label: "Expected ROI",          value: formatCurrency(sp.estimated_roi),             color: "text-status-success" },
            { label: "Success Probability",   value: formatPct(sp.estimated_success_probability),  color: "text-primary" },
            { label: "Timeline",              value: sp.implementation_timeline,                   color: "text-violet-600" },
            { label: "Estimated Cost",        value: formatCurrency(sp.estimated_cost),             color: "text-status-warning" },
          ].map(m => (
            <div key={m.label} className="bg-secondary/50 rounded-xl p-3 text-center">
              <div className={`font-bold text-base ${m.color}`}>{m.value}</div>
              <div className="text-muted-foreground text-xs mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {sp.expected_business_outcome && (
          <div className="mt-4 p-3 bg-primary/5 border border-primary/15 rounded-xl">
            <p className="text-primary text-xs font-semibold mb-1">Expected Business Outcome</p>
            <p className="text-foreground text-sm">{sp.expected_business_outcome}</p>
          </div>
        )}
      </div>

      {/* Scenario Planning */}
      {sp.scenarios.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2"><span>🔭</span> Scenario Planning</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sp.scenarios.map(sc => <ScenarioCard key={sc.scenario_type} scenario={sc} isSelected={sc.scenario_type === sp.selected_scenario} />)}
          </div>
        </div>
      )}

      {/* Business Impact */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
        <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2"><span>📈</span> Business Impact Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {impactMetrics.map(m => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="text-foreground font-semibold">{m.display}</span>
              </div>
              <ProgressBar value={m.isPercent ? m.value : Math.min(1, m.value / 200000)} color={m.color} />
            </div>
          ))}
        </div>
        {sp.business_impact.revenue_increase_explanation && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <p>{sp.business_impact.revenue_increase_explanation}</p>
            <p>{sp.business_impact.operational_savings_explanation}</p>
          </div>
        )}
      </div>

      {/* Execution Roadmap */}
      {sp.execution_plan.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-foreground font-semibold flex items-center gap-2"><span>🗺</span> Execution Roadmap</h3>
            <span className="text-xs text-muted-foreground">{sp.execution_plan.length} phases · {sp.implementation_timeline}</span>
          </div>
          <ExecutionTimeline phases={sp.execution_plan} />
        </div>
      )}

      {/* Risks */}
      {sp.risks.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2"><span>⚠️</span> Risks & Mitigations</h3>
          <div className="space-y-3">
            {sp.risks.map((risk, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex gap-2 bg-status-error-bg border border-status-error/20 rounded-xl p-3">
                  <span className="text-status-error text-sm shrink-0">⚠</span>
                  <p className="text-foreground text-sm">{risk}</p>
                </div>
                {sp.mitigation_plan[idx] && (
                  <div className="flex gap-2 bg-status-success-bg border border-status-success/20 rounded-xl p-3">
                    <span className="text-status-success text-sm shrink-0">🛡</span>
                    <p className="text-foreground text-sm">{sp.mitigation_plan[idx]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources + Stakeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sp.required_resources.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><span>🛠</span> Required Resources</h3>
            <ul className="space-y-2">
              {sp.required_resources.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sp.stakeholder_plan.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><span>👥</span> Stakeholder Plan</h3>
            <ul className="space-y-2">
              {sp.stakeholder_plan.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground border-b border-border pb-2 last:border-0 last:pb-0">{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Dependencies + Alternatives */}
      {sp.dependencies.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><span>🔗</span> Dependencies</h3>
          <div className="flex flex-wrap gap-2">
            {sp.dependencies.map((d, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground">{d}</span>
            ))}
          </div>
        </div>
      )}

      {sp.alternative_strategies.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><span>🔀</span> Alternative Strategies</h3>
          <ul className="space-y-2">
            {sp.alternative_strategies.map((alt, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground/50 shrink-0">{i + 1}.</span>{alt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      {sp.supporting_evidence.length > 0 && (
        <div className="bg-secondary/30 border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Supporting Evidence</p>
          <div className="flex flex-wrap gap-2">
            {sp.supporting_evidence.map((ev, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-background border border-border text-muted-foreground">{ev}</span>
            ))}
          </div>
          <p className="text-muted-foreground/60 text-xs mt-2">Generated {sp.generated_at} · Schema v{sp.schema_version}</p>
        </div>
      )}
    </div>
  );
}


