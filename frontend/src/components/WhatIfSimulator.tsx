import { useState, useMemo, useCallback, useRef } from "react";
import { Sliders, RefreshCw, TrendingUp, TrendingDown, Minus, Zap, DollarSign, Clock, Users, ShieldAlert } from "lucide-react";
import type { DecisionPackage } from "../types/agent";

interface Props {
  decisionPackage: DecisionPackage;
}

interface SimParams {
  budget: number;         // 0–200 (% of baseline, 100 = unchanged)
  timeline: number;       // 50–200 (% of baseline)
  teamSize: number;       // 25–300 (% of baseline)
  riskAppetite: number;   // 0–100 (0 = risk averse, 100 = risk tolerant)
  complianceLevel: number;// 0–100 (0 = minimal, 100 = maximum)
  priority: number;       // 0–100
}

interface SimResult {
  opportunityScore: number;
  riskScore: number;
  businessValue: number;
  roi: number;
  confidence: number;
  rankedRecs: { title: string; score: number; delta: number }[];
  kpis: { label: string; value: string; delta: number }[];
  summary: string;
}

const DEFAULTS: SimParams = {
  budget: 100,
  timeline: 100,
  teamSize: 100,
  riskAppetite: 60,
  complianceLevel: 70,
  priority: 75,
};

function simulate(params: SimParams, base: DecisionPackage): SimResult {
  const b = params.budget / 100;
  const t = params.timeline / 100;
  const ts = params.teamSize / 100;
  const ra = params.riskAppetite / 100;
  const cl = params.complianceLevel / 100;
  const pr = params.priority / 100;

  const baseOpp  = base.business_scores?.opportunity_score  ?? 0.70;
  const baseRisk = base.business_scores?.risk_score         ?? 0.45;
  const baseBV   = base.business_scores?.business_value_score ?? 0.72;
  const baseConf = base.confidence?.overall_confidence      ?? 0.78;
  const baseROI  = base.analysis?.estimated_revenue         ?? 180000;

  // Budget: more budget = higher opportunity, higher cost (affects ROI net)
  const budgetMult   = 0.6 + 0.4 * b;
  // Timeline: tighter timeline = higher risk, lower confidence
  const timelineMult = t < 0.8 ? 0.85 : t > 1.3 ? 1.05 : 1.0;
  const timelineRisk = t < 0.8 ? 1.20 : t > 1.3 ? 0.85 : 1.0;
  // Team: more team = lower risk, better execution
  const teamMult     = 0.7 + 0.3 * ts;
  // Risk appetite: higher appetite = accept higher risk score, higher opportunity
  const riskMult     = 0.8 + 0.2 * ra;
  // Compliance: higher compliance = lower risk, lower speed, higher confidence
  const complianceMult = 0.85 + 0.15 * cl;
  const complianceRisk = 1.1 - 0.15 * cl;

  const opp  = Math.min(1, baseOpp  * budgetMult * timelineMult * riskMult * pr);
  const risk = Math.min(1, baseRisk * timelineRisk * complianceRisk * (2 - teamMult) * (1.1 - ra * 0.2));
  const bv   = Math.min(1, baseBV   * budgetMult * teamMult * complianceMult * pr);
  const conf = Math.min(1, baseConf * complianceMult * timelineMult * (0.85 + 0.15 * cl));
  const roi  = baseROI * b * teamMult * (1 - risk * 0.3) * pr;

  const rankedRecs = (base.recommendations ?? []).map((rec, i) => {
    const recScore = (opp * 0.4 + bv * 0.3 + conf * 0.2 + (1 - risk) * 0.1) * (1 - i * 0.08);
    const baseScore = rec.confidence;
    return {
      title: rec.title,
      score: Math.min(1, recScore),
      delta: recScore - baseScore,
    };
  }).sort((a, b) => b.score - a.score);

  const kpis = [
    { label: "Revenue Impact",      value: `$${(roi / 1000).toFixed(0)}K`,           delta: (roi - baseROI) / baseROI },
    { label: "Time to Close",       value: `${Math.round(45 * t)} days`,             delta: -(t - 1) },
    { label: "Team Utilization",    value: `${Math.min(100, Math.round(ts * 82))}%`, delta: ts - 1 },
    { label: "Risk Exposure",       value: `${Math.round(risk * 100)}%`,             delta: -(risk - baseRisk) },
    { label: "Compliance Score",    value: `${Math.round(cl * 100)}%`,               delta: cl - 0.7 },
    { label: "Win Probability",     value: `${Math.round(conf * 100)}%`,             delta: conf - baseConf },
  ];

  const budgetDir = b > 1.05 ? "increased" : b < 0.95 ? "reduced" : "stable";
  const riskDir   = risk > baseRisk + 0.05 ? "higher" : risk < baseRisk - 0.05 ? "lower" : "stable";
  const summary   = `With budget ${budgetDir}, ${t < 0.9 ? "compressed" : t > 1.1 ? "extended" : "nominal"} timeline, and ${ts > 1.1 ? "expanded" : ts < 0.9 ? "reduced" : "current"} team capacity, risk exposure is ${riskDir}. Top recommendation: ${rankedRecs[0]?.title ?? "N/A"}.`;

  return { opportunityScore: opp, riskScore: risk, businessValue: bv, roi, confidence: conf, rankedRecs, kpis, summary };
}

interface SliderRowProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}

function SliderRow({ label, icon, value, min, max, unit = "%", onChange, formatValue }: SliderRowProps) {
  const display = formatValue ? formatValue(value) : `${value}${unit}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        <span className="text-xs font-bold text-primary tabular-nums w-16 text-right">{display}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={1} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(100,20%,40%) ${pct}%, #e2e8f0 ${pct}%)`,
          }}
        />
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.02) return <Minus size={12} className="text-slate-400" />;
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold">
      <TrendingUp size={10} />{(delta * 100).toFixed(0)}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-rose-500 text-[10px] font-bold">
      <TrendingDown size={10} />{(Math.abs(delta) * 100).toFixed(0)}%
    </span>
  );
}

function ScoreBar({ label, value, baseline, color }: { label: string; value: number; baseline: number; color: string }) {
  const delta = value - baseline;
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <DeltaBadge delta={delta} />
          <span className="font-bold text-slate-800 w-10 text-right">{(value * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
        {/* baseline marker */}
        <div className="absolute top-0 bottom-0 w-px bg-slate-400 z-10" style={{ left: `${baseline * 100}%` }} />
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export default function WhatIfSimulator({ decisionPackage }: Props) {
  const [params, setParams] = useState<SimParams>(DEFAULTS);
  const [animKey, setAnimKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const timeoutRef = useRef<any>(null);

  const set = useCallback(<K extends keyof SimParams>(key: K) => (v: number) => {
    setParams((p) => ({ ...p, [key]: v }));
    setAnimKey((k) => k + 1);

    setRecalculating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setRecalculating(false);
    }, 1200);
  }, []);

  const reset = () => {
    setParams(DEFAULTS);
    setAnimKey((k) => k + 1);
    setRecalculating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setRecalculating(false);
    }, 1200);
  };

  const result = useMemo(() => simulate(params, decisionPackage), [params, decisionPackage]);

  const baseOpp  = decisionPackage.business_scores?.opportunity_score  ?? 0.70;
  const baseRisk = decisionPackage.business_scores?.risk_score         ?? 0.45;
  const baseBV   = decisionPackage.business_scores?.business_value_score ?? 0.72;
  const baseConf = decisionPackage.confidence?.overall_confidence      ?? 0.78;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sliders size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">What-If Decision Simulator</p>
            <p className="text-xs text-slate-500">Adjust parameters and watch scores recalculate in real time.</p>
          </div>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary border border-slate-200 hover:border-primary/30 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw size={12} />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls — 2 cols */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Simulation Parameters</p>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial</p>
            <div className="space-y-4 pt-1">
              <SliderRow label="Budget" icon={<DollarSign size={13} />} value={params.budget} min={30} max={200} onChange={set("budget")} formatValue={(v) => v === 100 ? "Baseline" : v > 100 ? `+${v - 100}%` : `-${100 - v}%`} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeline</p>
            <div className="space-y-4 pt-1">
              <SliderRow label="Project Duration" icon={<Clock size={13} />} value={params.timeline} min={50} max={200} onChange={set("timeline")} formatValue={(v) => v === 100 ? "Baseline" : v > 100 ? `+${v - 100}% longer` : `${100 - v}% faster`} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resources</p>
            <div className="space-y-4 pt-1">
              <SliderRow label="Team Size" icon={<Users size={13} />} value={params.teamSize} min={25} max={300} onChange={set("teamSize")} formatValue={(v) => v === 100 ? "Baseline" : v > 100 ? `+${v - 100}%` : `-${100 - v}%`} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business</p>
            <div className="space-y-4 pt-1">
              <SliderRow label="Risk Appetite" icon={<ShieldAlert size={13} />} value={params.riskAppetite} min={0} max={100} onChange={set("riskAppetite")} formatValue={(v) => v < 33 ? "Conservative" : v < 66 ? "Moderate" : "Aggressive"} />
              <SliderRow label="Compliance Level" icon={<Zap size={13} />} value={params.complianceLevel} min={0} max={100} onChange={set("complianceLevel")} formatValue={(v) => v < 33 ? "Minimal" : v < 66 ? "Standard" : "Maximum"} />
              <SliderRow label="Strategic Priority" icon={<TrendingUp size={13} />} value={params.priority} min={10} max={100} onChange={set("priority")} formatValue={(v) => v < 30 ? "Low" : v < 60 ? "Medium" : v < 85 ? "High" : "Critical"} />
            </div>
          </div>
        </div>

        {/* Results — 3 cols */}
        <div className="lg:col-span-3 space-y-5 relative">
          {recalculating && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-2xl z-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
              <RefreshCw className="animate-spin text-primary" size={24} />
              <div className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
                Recalculating scenario pathways...
              </div>
            </div>
          )}
          {/* Score recalculation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card" key={`scores-${animKey}`}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Recalculated Scores</p>
            <div className="space-y-4">
              <ScoreBar label="Opportunity Score"  value={result.opportunityScore} baseline={baseOpp}  color="bg-emerald-500" />
              <ScoreBar label="Risk Score"         value={result.riskScore}        baseline={baseRisk} color="bg-rose-500" />
              <ScoreBar label="Business Value"     value={result.businessValue}    baseline={baseBV}   color="bg-violet-500" />
              <ScoreBar label="Overall Confidence" value={result.confidence}       baseline={baseConf} color="bg-blue-500" />
            </div>
            <p className="text-[10px] text-slate-400 mt-3">Thin vertical line = baseline. Bar = simulated value.</p>
          </div>

          {/* ROI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Simulated ROI</p>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-slate-800">${(result.roi / 1000).toFixed(0)}K</span>
              <DeltaBadge delta={(result.roi - (decisionPackage.analysis?.estimated_revenue ?? 180000)) / (decisionPackage.analysis?.estimated_revenue ?? 180000)} />
            </div>
          </div>

          {/* Recommendation ranking */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recommendation Ranking Under Simulation</p>
            <div className="space-y-3">
              {result.rankedRecs.map((r, i) => (
                <div key={r.title} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-500"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{r.title}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${r.score * 100}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 w-16 text-right">
                    <DeltaBadge delta={r.delta} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">KPI Impact</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {result.kpis.map((k) => (
                <div key={k.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{k.label}</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{k.value}</p>
                  <div className="mt-1"><DeltaBadge delta={k.delta} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Simulation Summary</p>
            <p className="text-xs text-slate-700 leading-relaxed">{result.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

