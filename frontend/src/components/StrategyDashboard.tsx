// Contains: StrategyDashboard.tsx — Strategy Intelligence Agent dashboard panel (Sprint 6).
import type { StrategyPackage, ScenarioOutcome, ExecutionPhase } from "../types/agent";

interface Props {
  strategyPackage: StrategyPackage;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

const formatPct = (value: number) => `${Math.round(value * 100)}%`;

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-400 border border-red-500/30",
  High: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  Low: "bg-green-500/20 text-green-400 border border-green-500/30",
};

const COMPLEXITY_STYLES: Record<string, string> = {
  Low: "bg-emerald-500/20 text-emerald-400",
  Medium: "bg-amber-500/20 text-amber-400",
  High: "bg-rose-500/20 text-rose-400",
};

const SCENARIO_CONFIG = {
  optimistic: { label: "Optimistic", color: "emerald", icon: "🚀", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
  realistic:  { label: "Realistic",  color: "sky",     icon: "🎯", border: "border-sky-500/30",     bg: "bg-sky-500/10"     },
  conservative: { label: "Conservative", color: "amber", icon: "🛡", border: "border-amber-500/30", bg: "bg-amber-500/10"  },
};

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-slate-500/20 text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  blocked: "bg-red-500/20 text-red-400",
};

function ProgressBar({ value, color = "sky" }: { value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    sky: "bg-sky-500", emerald: "bg-emerald-500", amber: "bg-amber-500",
    rose: "bg-rose-500", violet: "bg-violet-500", orange: "bg-orange-500",
  };
  return (
    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${colorMap[color] ?? "bg-sky-500"}`}
        style={{ width: `${Math.min(100, Math.round(value * 100))}%` }}
      />
    </div>
  );
}

function ScenarioCard({ scenario, isSelected }: { scenario: ScenarioOutcome; isSelected: boolean }) {
  const cfg = SCENARIO_CONFIG[scenario.scenario_type];
  return (
    <div
      className={`rounded-xl p-4 border transition-all duration-200 ${cfg.bg} ${cfg.border} ${
        isSelected ? "ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/10" : "opacity-80 hover:opacity-100"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{cfg.icon}</span>
        <span className={`font-semibold text-sm text-${cfg.color}-400`}>{cfg.label}</span>
        {isSelected && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium">
            Selected
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/50">ROI</span>
          <span className="text-white/90 font-semibold">{formatCurrency(scenario.expected_roi)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Success Probability</span>
          <span className="text-white/90 font-semibold">{formatPct(scenario.success_probability)}</span>
        </div>
        <ProgressBar value={scenario.success_probability} color={cfg.color} />
        <div className="flex justify-between">
          <span className="text-white/50">Timeline</span>
          <span className="text-white/90">{scenario.timeline_days} days</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Est. Cost</span>
          <span className="text-white/90">{formatCurrency(scenario.estimated_cost)}</span>
        </div>
        {scenario.key_risks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-white/40 text-xs mb-1">Key Risk</p>
            <p className="text-white/70 text-xs">{scenario.key_risks[0]}</p>
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
          {/* Timeline spine */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0 z-10">
              <span className="text-sky-400 text-xs font-bold">{idx + 1}</span>
            </div>
            {idx < phases.length - 1 && (
              <div className="w-px flex-1 bg-white/10 my-1" />
            )}
          </div>
          {/* Phase content */}
          <div className={`pb-6 flex-1 ${idx === phases.length - 1 ? "pb-0" : ""}`}>
            <div className="flex items-start gap-2 flex-wrap">
              <h4 className="text-white/90 text-sm font-semibold">{phase.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[phase.status] ?? STATUS_STYLES.planned}`}>
                {phase.status}
              </span>
            </div>
            <p className="text-white/50 text-xs mt-1">{phase.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/40">
              <span>⏱ {phase.duration_days} days</span>
              {phase.owner && <span>👤 {phase.owner}</span>}
            </div>
            {phase.milestones.length > 0 && (
              <ul className="mt-2 space-y-1">
                {phase.milestones.map((m, mi) => (
                  <li key={mi} className="flex items-center gap-1.5 text-xs text-white/60">
                    <span className="text-emerald-400">✓</span> {m}
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function StrategyDashboard({ strategyPackage: sp }: Props) {
  const impactMetrics = [
    { label: "Revenue Increase", value: sp.business_impact.revenue_increase, display: formatCurrency(sp.business_impact.revenue_increase), color: "emerald" },
    { label: "Operational Savings", value: sp.business_impact.operational_savings, display: formatCurrency(sp.business_impact.operational_savings), color: "sky" },
    { label: "Customer Retention", value: sp.business_impact.customer_retention, display: formatPct(sp.business_impact.customer_retention), color: "violet", isPercent: true },
    { label: "Risk Reduction", value: sp.business_impact.risk_reduction, display: formatPct(sp.business_impact.risk_reduction), color: "amber", isPercent: true },
    { label: "Productivity Gain", value: sp.business_impact.productivity_improvement, display: formatPct(sp.business_impact.productivity_improvement), color: "orange", isPercent: true },
    { label: "Cycle Time Saved", value: Math.min(1, sp.business_impact.decision_cycle_reduction / 30), display: `${sp.business_impact.decision_cycle_reduction} days`, color: "rose" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-2xl">⚡</span>
              <h2 className="text-white font-bold text-xl">Strategy Intelligence</h2>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${PRIORITY_STYLES[sp.priority] ?? PRIORITY_STYLES.Medium}`}>
                {sp.priority} Priority
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${COMPLEXITY_STYLES[sp.implementation_complexity] ?? COMPLEXITY_STYLES.Medium}`}>
                {sp.implementation_complexity} Complexity
              </span>
            </div>
            <h3 className="text-white/90 text-lg font-semibold mb-2">{sp.selected_strategy}</h3>
            <p className="text-white/60 text-sm leading-relaxed max-w-3xl">{sp.business_rationale}</p>
          </div>
          {/* Confidence ring */}
          <div className="text-center shrink-0">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#38bdf8" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${sp.confidence * 100} 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-white text-sm font-bold">{formatPct(sp.confidence)}</span>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-1">Confidence</p>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          {[
            { label: "Expected ROI", value: formatCurrency(sp.estimated_roi), icon: "💰", color: "text-emerald-400" },
            { label: "Success Probability", value: formatPct(sp.estimated_success_probability), icon: "📊", color: "text-sky-400" },
            { label: "Timeline", value: sp.implementation_timeline, icon: "📅", color: "text-violet-400" },
            { label: "Estimated Cost", value: formatCurrency(sp.estimated_cost), icon: "🏷", color: "text-amber-400" },
          ].map((m) => (
            <div key={m.label} className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg mb-1">{m.icon}</div>
              <div className={`font-bold text-base ${m.color}`}>{m.value}</div>
              <div className="text-white/40 text-xs mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Expected outcome */}
        {sp.expected_business_outcome && (
          <div className="mt-4 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
            <p className="text-sky-400 text-xs font-semibold mb-1">Expected Business Outcome</p>
            <p className="text-white/80 text-sm">{sp.expected_business_outcome}</p>
          </div>
        )}
      </div>

      {/* ── Scenario Planning ────────────────────────────────────────────────── */}
      {sp.scenarios.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white/90 font-semibold mb-4 flex items-center gap-2">
            <span>🔭</span> Scenario Planning
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sp.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.scenario_type}
                scenario={scenario}
                isSelected={scenario.scenario_type === sp.selected_scenario}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Business Impact ───────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-white/90 font-semibold mb-4 flex items-center gap-2">
          <span>📈</span> Business Impact Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {impactMetrics.map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{m.label}</span>
                <span className="text-white/90 font-semibold">{m.display}</span>
              </div>
              <ProgressBar value={m.isPercent ? m.value : Math.min(1, m.value / 200000)} color={m.color} />
            </div>
          ))}
        </div>
        {sp.business_impact.revenue_increase_explanation && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/50">
            <p>{sp.business_impact.revenue_increase_explanation}</p>
            <p>{sp.business_impact.operational_savings_explanation}</p>
          </div>
        )}
      </div>

      {/* ── Execution Roadmap ─────────────────────────────────────────────────── */}
      {sp.execution_plan.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white/90 font-semibold flex items-center gap-2">
              <span>🗺</span> Execution Roadmap
            </h3>
            <span className="text-xs text-white/40">{sp.execution_plan.length} phases · {sp.implementation_timeline}</span>
          </div>
          <ExecutionTimeline phases={sp.execution_plan} />
        </div>
      )}

      {/* ── Risks & Mitigations ──────────────────────────────────────────────── */}
      {sp.risks.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white/90 font-semibold mb-4 flex items-center gap-2">
            <span>⚠️</span> Risks & Mitigations
          </h3>
          <div className="space-y-3">
            {sp.risks.map((risk, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <span className="text-red-400 text-sm shrink-0">⚠</span>
                  <p className="text-white/70 text-sm">{risk}</p>
                </div>
                {sp.mitigation_plan[idx] && (
                  <div className="flex gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <span className="text-emerald-400 text-sm shrink-0">🛡</span>
                    <p className="text-white/70 text-sm">{sp.mitigation_plan[idx]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Resources & Stakeholders ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sp.required_resources.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-white/90 font-semibold mb-3 flex items-center gap-2">
              <span>🛠</span> Required Resources
            </h3>
            <ul className="space-y-2">
              {sp.required_resources.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sp.stakeholder_plan.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-white/90 font-semibold mb-3 flex items-center gap-2">
              <span>👥</span> Stakeholder Plan
            </h3>
            <ul className="space-y-2">
              {sp.stakeholder_plan.map((s, i) => (
                <li key={i} className="text-sm text-white/70 leading-relaxed border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Dependencies ─────────────────────────────────────────────────────── */}
      {sp.dependencies.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white/90 font-semibold mb-3 flex items-center gap-2">
            <span>🔗</span> Dependencies
          </h3>
          <div className="flex flex-wrap gap-2">
            {sp.dependencies.map((dep, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Alternative Strategies ────────────────────────────────────────────── */}
      {sp.alternative_strategies.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white/90 font-semibold mb-3 flex items-center gap-2">
            <span>🔀</span> Alternative Strategies
          </h3>
          <ul className="space-y-2">
            {sp.alternative_strategies.map((alt, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-white/30 shrink-0">{i + 1}.</span>
                {alt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Evidence ─────────────────────────────────────────────────────────── */}
      {sp.supporting_evidence.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-white/50 font-medium text-xs mb-2 uppercase tracking-wider">Supporting Evidence</h3>
          <div className="flex flex-wrap gap-2">
            {sp.supporting_evidence.map((ev, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-white/5 text-white/40 border border-white/10">
                {ev}
              </span>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-2">
            Generated at {sp.generated_at} · Schema v{sp.schema_version}
          </p>
        </div>
      )}
    </div>
  );
}
