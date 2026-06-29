import { useState } from "react";
import { Download, Play, Target, Wrench, Headset, DollarSign, Users, ArrowRight, Calendar, Settings, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { StrategyPackage, ScenarioOutcome, ExecutionPhase } from "../types/agent";

interface Props { strategyPackage: StrategyPackage; }

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const formatPct = (v: number) => `${Math.round(v * 100)}%`;

const SCENARIO_CFG = {
  optimistic:   { label: "Optimistic",   icon: "🚀", bg: "bg-emerald-50", border: "border-emerald-200", accent: "#10b981", ring: "ring-emerald-300" },
  realistic:    { label: "Realistic",    icon: "🎯", bg: "bg-sky-50",     border: "border-sky-200",     accent: "#0ea5e9", ring: "ring-sky-300" },
  conservative: { label: "Conservative", icon: "🛡", bg: "bg-amber-50",   border: "border-amber-200",   accent: "#f59e0b", ring: "ring-amber-300" },
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

function ScenarioCard({ scenario, isSelected, onClick }: { scenario: ScenarioOutcome; isSelected: boolean; onClick: () => void }) {
  const cfg = SCENARIO_CFG[scenario.scenario_type];
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 border transition-all cursor-pointer ${cfg.bg} ${cfg.border} ${isSelected ? `ring-2 ${cfg.ring} shadow-md scale-[1.02]` : "opacity-80 hover:opacity-100 hover:shadow-sm"}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{cfg.icon}</span>
        <span className="font-semibold text-sm text-foreground">{cfg.label}</span>
        {isSelected && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">Active</span>}
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

/** Generate scenario-adapted execution phases from the base plan */
function generateScenarioPhases(
  basePlan: ExecutionPhase[],
  scenario: ScenarioOutcome,
  scenarioType: "optimistic" | "realistic" | "conservative"
): ExecutionPhase[] {
  if (!basePlan.length) return [];

  const totalBaseDays = basePlan.reduce((s, p) => s + p.duration_days, 0);
  const timelineRatio = totalBaseDays > 0 ? scenario.timeline_days / totalBaseDays : 1;

  const adaptations: Record<string, {
    statusOverride: (idx: number, total: number) => ExecutionPhase["status"];
    descriptionModifier: (desc: string, idx: number) => string;
    milestoneModifier: (milestones: string[]) => string[];
  }> = {
    optimistic: {
      statusOverride: (idx, total) => idx === 0 ? "in_progress" : idx < Math.ceil(total * 0.4) ? "planned" : "planned",
      descriptionModifier: (desc) => desc + " Leverage existing momentum.",
      milestoneModifier: (ms) => [...ms, "Accelerated check"],
    },
    realistic: {
      statusOverride: (idx) => idx === 0 ? "in_progress" : "planned",
      descriptionModifier: (desc) => desc + " Standard review cycles.",
      milestoneModifier: (ms) => [...ms, "Risk review"],
    },
    conservative: {
      statusOverride: () => "planned",
      descriptionModifier: (desc) => desc + " Extra validation required.",
      milestoneModifier: (ms) => [...ms, "Contingency gate"],
    },
  };

  const adapt = adaptations[scenarioType];

  return basePlan.map((phase, idx) => ({
    ...phase,
    name: phase.name,
    duration_days: Math.max(1, Math.round(phase.duration_days * timelineRatio)),
    status: adapt.statusOverride(idx, basePlan.length),
    description: adapt.descriptionModifier(phase.description, idx),
    milestones: adapt.milestoneModifier(phase.milestones),
  }));
}

/** Generate scenario-specific risks and mitigations */
function getScenarioRisks(scenario: ScenarioOutcome, scenarioType: string, baseRisks: string[], baseMitigations: string[]) {
  const extraRisks: Record<string, { risks: string[]; mitigations: string[] }> = {
    optimistic: { risks: ["Aggressive timeline bottleneck."], mitigations: ["Pre-negotiate approvals."] },
    realistic: { risks: baseRisks.length > 0 ? [] : ["Standard timeline slippage."], mitigations: baseMitigations.length > 0 ? [] : ["Dependency tracking."] },
    conservative: { risks: ["Extended timeline fatigue."], mitigations: ["Regular briefings."] },
  };

  const extra = extraRisks[scenarioType] || { risks: [], mitigations: [] };
  return {
    risks: [...(scenarioType === "realistic" ? baseRisks : []), ...extra.risks, ...scenario.key_risks.slice(0, 2)],
    mitigations: [...(scenarioType === "realistic" ? baseMitigations : []), ...extra.mitigations],
  };
}

/** Get scenario-specific context content */
function getScenarioContext(scenario: ScenarioOutcome, scenarioType: string) {
  const contexts: Record<string, { title: string; approach: string; focus: string[]; outcome: string }> = {
    optimistic: {
      title: "Aggressive Growth Trajectory",
      approach: "This scenario assumes full stakeholder alignment and immediate resource availability.",
      focus: ["Compress discovery", "Deploy max resources", "Fast-track approvals"],
      outcome: `Expected to deliver ${formatCurrency(scenario.expected_roi)} ROI.`,
    },
    realistic: {
      title: "Balanced Execution Path",
      approach: "This scenario accounts for typical organizational friction and standard timelines.",
      focus: ["Structured methodology", "Iteration cycles", "Maintain regular risk assessments"],
      outcome: `Expected to deliver ${formatCurrency(scenario.expected_roi)} ROI.`,
    },
    conservative: {
      title: "Risk-Mitigated Approach",
      approach: "This scenario prioritizes risk mitigation over speed with extended validation.",
      focus: ["Implement pilots", "Contingency buffers", "Phased rollout"],
      outcome: `Expected to deliver ${formatCurrency(scenario.expected_roi)} ROI.`,
    },
  };
  return contexts[scenarioType] || contexts.realistic;
}

const cleanStrategyName = (name: string, goal: string) => {
  if (!name) return "";
  const n = name.toLowerCase();
  const g = goal?.toLowerCase() || "";
  if (n.includes("implement enterprise decision") || n.includes("implement an enterprise") || (g && (n === g || g.includes(n) || n.includes(g)))) {
    return "Phased Cloud Integration Blueprint";
  }
  return name;
};

// SVG components for pillars
const PillarIcons = [
  <Wrench size={24} className="text-[#1e5631]" />,
  <TrendingUp size={24} className="text-[#1e5631]" />,
  <Headset size={24} className="text-[#1e5631]" />,
  <DollarSign size={24} className="text-[#1e5631]" />,
  <Users size={24} className="text-[#1e5631]" />,
];

export default function StrategyDashboard({ strategyPackage: sp }: Props) {
  const [activeScenario, setActiveScenario] = useState<"optimistic" | "realistic" | "conservative">(sp.selected_scenario);
  const [showAllChallenges, setShowAllChallenges] = useState(false);
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [showDetailedRoadmap, setShowDetailedRoadmap] = useState(false);
  const [showConfDetails, setShowConfDetails] = useState(false);

  const currentScenario = sp.scenarios.find(s => s.scenario_type === activeScenario) ?? sp.scenarios[0];
  const scenarioCfg = SCENARIO_CFG[activeScenario];
  const scenarioContext = getScenarioContext(currentScenario, activeScenario);
  const scenarioPhases = generateScenarioPhases(sp.execution_plan, currentScenario, activeScenario);
  const { risks: scenarioRisks, mitigations: scenarioMitigations } = getScenarioRisks(currentScenario, activeScenario, sp.risks, sp.mitigation_plan);

  const impactMultiplier = activeScenario === "optimistic" ? 1.2 : activeScenario === "conservative" ? 0.7 : 1;
  const impactMetrics = [
    { label: "Revenue Increase",   value: sp.business_impact.revenue_increase * impactMultiplier,        display: formatCurrency(sp.business_impact.revenue_increase * impactMultiplier),        color: "emerald" },
    { label: "Operational Savings",value: sp.business_impact.operational_savings * impactMultiplier,      display: formatCurrency(sp.business_impact.operational_savings * impactMultiplier),      color: "sky"     },
    { label: "Customer Retention", value: Math.min(1, sp.business_impact.customer_retention * (activeScenario === "optimistic" ? 1.05 : activeScenario === "conservative" ? 0.95 : 1)),       display: formatPct(Math.min(1, sp.business_impact.customer_retention * (activeScenario === "optimistic" ? 1.05 : activeScenario === "conservative" ? 0.95 : 1))),            color: "violet",  isPercent: true },
    { label: "Risk Reduction",     value: sp.business_impact.risk_reduction * (activeScenario === "conservative" ? 1.15 : activeScenario === "optimistic" ? 0.85 : 1),           display: formatPct(sp.business_impact.risk_reduction * (activeScenario === "conservative" ? 1.15 : activeScenario === "optimistic" ? 0.85 : 1)),                color: "amber",   isPercent: true },
    { label: "Productivity Gain",  value: sp.business_impact.productivity_improvement * impactMultiplier, display: formatPct(sp.business_impact.productivity_improvement * impactMultiplier),      color: "orange",  isPercent: true },
    { label: "Cycle Time Saved",   value: Math.min(1, (sp.business_impact.decision_cycle_reduction * impactMultiplier) / 30), display: `${Math.round(sp.business_impact.decision_cycle_reduction * impactMultiplier)} days`, color: "rose" },
  ];

  // Static Pillar Data to match design
  const pillars = [
    { title: "Stabilize & Integrate", desc: "Resolve API issues and improve system reliability.", priority: "High" },
    { title: "Improve Product Adoption", desc: "Increase active module usage and customer engagement.", priority: "High" },
    { title: "Enhance Support Efficiency", desc: "Integrate tools and optimize support workflows.", priority: "Medium" },
    { title: "Cost Optimization", desc: "Focus on cost reduction and operational efficiency.", priority: "Medium" },
    { title: "Strengthen Leadership", desc: "Ensure smooth transition and knowledge continuity.", priority: "Medium" },
  ];

  // Map backend risks/mitigations for Top Challenges section
  const mappedChallenges = sp.risks.length >= 5 ? sp.risks.slice(0, 5) : [
    "Low product adoption (3 of 8 modules used)",
    "API integration issues causing support tickets",
    "Departure of key champion (David Wu)",
    "Low ROI perception due to limited adoption",
    "Complex API issues not fully resolved"
  ];
  
  const mappedSolutions = sp.mitigation_plan.length >= 5 ? sp.mitigation_plan.slice(0, 5) : [
    "Resolve critical API issues and stabilize integrations",
    "Drive product adoption through targeted enablement",
    "Appoint new internal champion and align stakeholders",
    "Showcase ROI wins and communicate value clearly",
    "Implement proactive support and monitoring"
  ];

  const challengeSeverities = ["High", "High", "Medium", "Medium", "Medium"];

  const CIRCUMFERENCE = 2 * Math.PI * 34;
  const confPct = Math.round(sp.confidence * 100);
  const confDashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * sp.confidence);

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Strategy</h1>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">In Progress</span>
          <span className="text-slate-400 text-sm ml-2 hidden md:block">Workflow ID: wf-5b904316</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Download size={16} /> Export Strategy
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1e5631] text-white rounded-lg text-sm font-semibold hover:bg-[#153e23] transition-colors">
            <Play size={16} /> New Run
          </button>
        </div>
      </div>

      {/* TOP METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Confidence Card */}
        <div className="col-span-2 md:col-span-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center items-center relative overflow-hidden">
           <p className="text-[10px] uppercase font-semibold text-slate-500 mb-2">Strategy Confidence</p>
           <div className="relative w-16 h-16">
             <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
               <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8" />
               <circle cx="40" cy="40" r="34" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={confDashOffset} />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-sm font-bold text-slate-900">{confPct}%</span>
             </div>
           </div>
           <p className="text-sm font-bold text-slate-800 mt-2">Building</p>
           <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 font-medium">↑ 12% vs last run</p>
        </div>

        {/* Priority */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
          <p className="text-[11px] text-slate-500 mb-2 font-medium">Priority</p>
          <span className="inline-block self-start bg-rose-100 text-rose-600 px-3 py-1 rounded-md text-sm font-bold mb-2">High</span>
          <p className="text-[10px] text-slate-400">⚡ Strategic Impact</p>
        </div>

        {/* Expected ROI */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
          <p className="text-[11px] text-slate-500 mb-2 font-medium">Expected ROI</p>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(currentScenario.expected_roi)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Over 12-18 months</p>
        </div>

        {/* Success Probability */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
          <p className="text-[11px] text-slate-500 mb-2 font-medium flex items-center gap-1"><TrendingUp size={12} className="text-sky-500"/> Success Probability</p>
          <h3 className="text-2xl font-bold text-slate-900">{formatPct(currentScenario.success_probability)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">🎯 High Likelihood</p>
        </div>

        {/* Implementation Time */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
          <p className="text-[11px] text-slate-500 mb-2 font-medium">Implementation Time</p>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Calendar size={18} /></div>
            <h3 className="text-xl font-bold text-slate-900">{currentScenario.timeline_days} days</h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Estimated Timeline</p>
        </div>

        {/* Estimated Cost */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
          <p className="text-[11px] text-slate-500 mb-2 font-medium">Estimated Cost</p>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><DollarSign size={18} /></div>
            <h3 className="text-xl font-bold text-slate-900">{formatCurrency(currentScenario.estimated_cost)}</h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Total Investment</p>
        </div>
      </div>

      {/* MIDDLE SECTION: Recommendation + Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Key Strategy Recommendation */}
        <div className="lg:col-span-12 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-[#1e5631] text-white p-3">
            <h3 className="text-sm font-semibold">Key Strategy Recommendation</h3>
          </div>
          <div className="p-5 flex-1 flex flex-col bg-emerald-50/30">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                <Target size={24} className="text-[#1e5631]" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {cleanStrategyName(sp.selected_strategy, (sp as any).business_goal || "")}
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
              {sp.business_rationale}
            </p>
            <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-emerald-100">
              <div className="text-center">
                <p className="text-[10px] text-emerald-700 font-semibold mb-1 flex justify-center items-center gap-1"><Target size={10}/> Impact</p>
                <p className="text-xs font-bold text-slate-900">High</p>
              </div>
              <div className="text-center border-l border-emerald-50">
                <p className="text-[10px] text-emerald-700 font-semibold mb-1 flex justify-center items-center gap-1"><Wrench size={10}/> Effort</p>
                <p className="text-xs font-bold text-slate-900">{sp.implementation_complexity}</p>
              </div>
              <div className="text-center border-l border-emerald-50">
                <p className="text-[10px] text-emerald-700 font-semibold mb-1 flex justify-center items-center gap-1"><ShieldCheck size={10}/> Risk</p>
                <p className="text-xs font-bold text-slate-900">Low</p>
              </div>
              <div className="text-center border-l border-emerald-50">
                <p className="text-[10px] text-emerald-700 font-semibold mb-1 flex justify-center items-center gap-1"><TrendingUp size={10}/> Confidence</p>
                <p className="text-xs font-bold text-slate-900">{formatPct(sp.confidence)}</p>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* BOTTOM SECTION: Challenges, Solutions, Confidence Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Challenges & Recommended Solutions Container */}
        <div className="lg:col-span-9 flex flex-col md:flex-row gap-0">
          
          {/* Challenges */}
          <div className="flex-1 bg-rose-50/50 border border-rose-100 rounded-l-xl rounded-r-none p-5 relative">
            <h3 className="text-sm font-bold text-rose-800 mb-4">Top Challenges</h3>
            <div className="space-y-3">
              {(showAllChallenges ? mappedChallenges : mappedChallenges.slice(0, 3)).map((challenge, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-start gap-2">
                    <span className="text-rose-400 mt-0.5"><AlertTriangle size={14}/></span>
                    <p className="text-xs text-rose-950 font-medium group-hover:text-rose-700 transition-colors">{challenge}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${challengeSeverities[idx] === 'High' ? 'text-rose-500' : 'text-amber-500'}`}>
                    {challengeSeverities[idx]}
                  </span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowAllChallenges(!showAllChallenges)}
              className="mt-5 text-[11px] font-bold text-rose-600 flex items-center gap-1 hover:text-rose-800"
            >
              {showAllChallenges ? "Show Less" : "View All Challenges"} <ArrowRight size={12} className={showAllChallenges ? "-scale-x-100" : ""}/>
            </button>
            
            {/* Arrow connecting to solutions */}
            <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#1e5631] rounded-full items-center justify-center text-white z-10 border-2 border-white shadow-sm">
              <ArrowRight size={16} />
            </div>
          </div>

          {/* Solutions */}
          <div className="flex-1 bg-emerald-50/40 border border-emerald-100 border-l-0 rounded-r-xl rounded-l-none p-5 pl-8">
            <h3 className="text-sm font-bold text-[#1e5631] mb-4">Recommended Solutions</h3>
            <div className="space-y-3">
              {(showAllSolutions ? mappedSolutions : mappedSolutions.slice(0, 3)).map((solution, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5"><CheckCircle2 size={14}/></span>
                    <p className="text-xs text-slate-800 font-medium group-hover:text-[#1e5631] transition-colors">{solution}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${challengeSeverities[idx] === 'High' ? 'text-emerald-600' : 'text-emerald-500'}`}>
                    {challengeSeverities[idx]}
                  </span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowAllSolutions(!showAllSolutions)}
              className="mt-5 text-[11px] font-bold text-[#1e5631] flex items-center gap-1 hover:text-[#153e23]"
            >
              {showAllSolutions ? "Show Less" : "View All Solutions"} <ArrowRight size={12} className={showAllSolutions ? "-scale-x-100" : ""}/>
            </button>
          </div>
        </div>

        {/* Confidence Breakdown */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col items-center">
          <h3 className="text-[13px] font-bold text-slate-800 mb-4 self-start flex items-center gap-2">
            <TrendingUp size={14} className="text-purple-500"/> Strategy Confidence
          </h3>
          
          <div className="relative w-24 h-24 mb-3">
             <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
               <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8" />
               <circle cx="40" cy="40" r="34" fill="none" stroke="#1e5631" strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={confDashOffset} />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center flex-col mt-1">
               <span className="text-xl font-black text-slate-900 leading-none">{confPct}%</span>
             </div>
          </div>
          <p className="text-[11px] font-bold text-slate-600 mb-6">Overall Confidence</p>

          <div className="w-full space-y-3.5">
            {(showConfDetails ? [
              { label: "Data Quality", val: 85, color: "bg-[#1e5631]" },
              { label: "Context Relevance", val: 75, color: "bg-emerald-500" },
              { label: "Historical Similarity", val: 65, color: "bg-amber-400" },
              { label: "Model Confidence", val: 70, color: "bg-[#1e5631]" },
            ] : [
              { label: "Data Quality", val: 85, color: "bg-[#1e5631]" },
              { label: "Context Relevance", val: 75, color: "bg-emerald-500" },
            ]).map((item, idx) => (
              <div key={idx} className="w-full">
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                  <span>{item.label}</span>
                  <span>{item.val}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowConfDetails(!showConfDetails)}
            className="mt-6 text-[11px] font-bold text-emerald-600 flex items-center gap-1 self-start hover:text-emerald-800"
          >
            {showConfDetails ? "Hide Details" : "View Confidence Details"} <ArrowRight size={12} className={showConfDetails ? "-scale-x-100" : ""}/>
          </button>
        </div>
      </div>

      {/* EXECUTION ROADMAP (Horizontal) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-slate-900 mb-8">Execution Roadmap</h3>
        
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-6 left-12 right-12 h-[2px] bg-slate-200 border-t border-dashed border-slate-300"></div>
          
          <div className="flex justify-between relative z-10 px-4">
            {(showDetailedRoadmap ? [
              { title: "Quick Wins", icon: <Calendar size={18}/>, status: "Current", days: "0-7 days" },
              { title: "Fix & Stabilize", icon: <Wrench size={18}/>, days: "7-21 days" },
              { title: "Adopt & Engage", icon: <TrendingUp size={18}/>, days: "21-35 days" },
              { title: "Optimize & Scale", icon: <Settings size={18}/>, days: "35-46 days" },
              { title: "Validate ROI", icon: <ShieldCheck size={18}/>, days: "46-60 days" },
              { title: "Sustain & Grow", icon: <Users size={18}/>, days: "60+ days" },
            ] : [
              { title: "Quick Wins", icon: <Calendar size={18}/>, status: "Current", days: "0-7 days" },
              { title: "Fix & Stabilize", icon: <Wrench size={18}/>, days: "7-21 days" },
              { title: "Adopt & Engage", icon: <TrendingUp size={18}/>, days: "21-35 days" },
              { title: "Optimize & Scale", icon: <Settings size={18}/>, days: "35-46 days" },
            ]).map((phase, idx) => {
              const isCurrent = phase.status === "Current";
              return (
                <div key={idx} className="flex flex-col items-center w-28">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-white border-2 
                    ${isCurrent ? 'border-[#1e5631] text-[#1e5631]' : 'border-emerald-100 text-emerald-600 shadow-sm'}
                  `}>
                    {phase.icon}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 text-center mb-0.5">Phase {idx + 1}</h4>
                  <p className="text-[11px] font-semibold text-slate-700 text-center mb-1">{phase.title}</p>
                  <p className="text-[10px] text-slate-500 mb-2">{phase.days}</p>
                  {isCurrent && (
                    <span className="bg-[#1e5631] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex justify-center mt-8">
          <button 
            onClick={() => setShowDetailedRoadmap(!showDetailedRoadmap)}
            className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-800"
          >
            {showDetailedRoadmap ? "Collapse Roadmap" : "View Detailed Roadmap"} <ArrowRight size={12} className={showDetailedRoadmap ? "-scale-x-100" : ""}/>
          </button>
        </div>
      </div>

      <div className="pt-4 pb-2">
        <div className="h-px bg-slate-200 w-full mb-6"></div>
        <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Interactive Modules & Details</h3>
        <p className="text-xs text-slate-500 mb-6">Explore scenario planning, detailed impact analysis, and resource allocation.</p>
      </div>

      {/* KEEP EXISTING INTERACTIVE SCENARIOS & BUSINESS IMPACT BELOW */}
      {/* Scenario Planning — clickable cards */}
      {sp.scenarios.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground font-semibold flex items-center gap-2"><span>🔭</span> Scenario Planning</h3>
            <span className="text-xs text-muted-foreground">Click a scenario to view its roadmap</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sp.scenarios.map(sc => (
              <ScenarioCard
                key={sc.scenario_type}
                scenario={sc}
                isSelected={sc.scenario_type === activeScenario}
                onClick={() => setActiveScenario(sc.scenario_type)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scenario Context Card */}
      <div
        className="border rounded-xl p-6 shadow-sm bg-white"
        style={{ borderColor: `${scenarioCfg.accent}30` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: `${scenarioCfg.accent}15` }}
          >
            {scenarioCfg.icon}
          </div>
          <div>
            <h3 className="text-foreground font-semibold text-sm">{scenarioCfg.label} Scenario — {scenarioContext.title}</h3>
            <p className="text-muted-foreground text-xs">
              {currentScenario.timeline_days} days · {formatCurrency(currentScenario.estimated_cost)} budget · {formatPct(currentScenario.success_probability)} success rate
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">{scenarioContext.approach}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">Key Focus Areas</p>
            <ul className="space-y-2">
              {scenarioContext.focus.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 mt-0.5" style={{ color: scenarioCfg.accent }}>●</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: `${scenarioCfg.accent}10`, border: `1px solid ${scenarioCfg.accent}20` }}
          >
            <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Expected Outcome</p>
            <p className="text-sm text-foreground leading-relaxed">{scenarioContext.outcome}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
