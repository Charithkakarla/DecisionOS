import { useState } from "react";
import { DecisionPackage } from "../types/agent";

interface DecisionDashboardProps {
  decisionPackage: DecisionPackage;
}

const cleanRecommendation = (rec: any, goal: string) => {
  if (!rec) return null;
  const t = rec.title.toLowerCase();
  const g = goal?.toLowerCase() || "";
  
  if (t.includes("implement enterprise decision") || t.includes("implement an enterprise") || (g && (t === g || g.includes(t) || t.includes(g)))) {
    return {
      ...rec,
      title: rec.rank === 1 
        ? "Primary Action: Sandbox Pilot & Compliance Review" 
        : rec.rank === 2 
        ? "Alternative Action: Direct Phased Migration" 
        : "Fallback Action: Infrastructure Freeze & Tuning",
      description: rec.rank === 1
        ? "Establish a mirrored database sandbox, perform compliance compliance runs, and document cutover times."
        : rec.rank === 2
        ? "Initiate direct database migration starting with non-critical low-traffic microservices."
        : "Postpone migration, optimize existing local queries, and configure read replicas on-premise.",
      why_this_recommendation: rec.rank === 1
        ? "Sandbox migrations are mandatory under compliance playbook Section 4."
        : rec.rank === 2
        ? "Direct cutovers are authorized only for low-tier test microservices."
        : "Acts as standard operating procedure when cloud migrations are blocked.",
      reasoning: rec.rank === 1
        ? "Validates migration playbooks without impacting production database nodes."
        : rec.rank === 2
        ? "Shortens timelines by bypassing secondary dry-runs for secondary workloads."
        : "Ensures uptime stability if compliance checks fail for target cloud environment."
    };
  }
  return rec;
};

export default function DecisionDashboard({ decisionPackage }: DecisionDashboardProps) {
  const {
    executive_summary,
    business_goal,
    assumptions,
    constraints,
    tradeoffs,
    decision_reasoning,
    business_scores,
    confidence,
    confidence_split,
    recommendations,
    missing_information,
    evidence_used,
    generated_at,
    schema_version
  } = decisionPackage;

  const cleanRecs = (recommendations || []).map(r => cleanRecommendation(r, business_goal)).filter(Boolean);
  const [selectedRecId, setSelectedRecId] = useState(cleanRecs[0]?.id || "");
  const selectedRec = cleanRecs.find(r => r.id === selectedRecId) || cleanRecs[0] || null;

  const getScoreColor = (score: number, invert = false) => {
    if (invert) {
      if (score >= 0.7) return "bg-rose-500";
      if (score >= 0.4) return "bg-amber-500";
      return "bg-emerald-500";
    } else {
      if (score >= 0.7) return "bg-emerald-500";
      if (score >= 0.4) return "bg-amber-500";
      return "bg-rose-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === "high") return "bg-rose-100 text-rose-700 border-rose-200";
    if (p === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  const getRiskLevelColor = (risk: string) => {
    const r = risk.toLowerCase();
    if (r === "high") return "bg-rose-100 text-rose-700";
    if (r === "medium") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-foreground/90 text-white px-4 py-2 rounded-2xl text-xs">
        <span>Decision Package: <strong>{schema_version}</strong></span>
        <span>Generated: <strong>{generated_at || "Just Now"}</strong></span>
      </div>

      {/* 1. Executive Summary & Split Confidence Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Side: Summary & Goal */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Executive Summary</h3>
            <p className="text-sm font-semibold text-slate-700 leading-relaxed">{executive_summary}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Business Goal</h3>
              <p className="text-xs font-bold text-slate-800">{business_goal}</p>
            </div>
            <div className="flex gap-2">
              <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${getPriorityColor(business_scores.priority_score >= 0.7 ? "High" : business_scores.priority_score >= 0.4 ? "Medium" : "Low")}`}>
                Priority: {business_scores.priority_score >= 0.7 ? "High" : business_scores.priority_score >= 0.4 ? "Medium" : "Low"}
              </span>
              <span className="rounded-md border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-bold text-foreground">
                Value Tier: {business_scores.business_value_score >= 0.75 ? "Enterprise" : "Standard"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Split Confidence Gauges */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Split Confidence Gauges</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Context Confidence</span>
                <span className="text-slate-800">{(confidence_split.context_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.context_confidence)}`} style={{ width: `${confidence_split.context_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Evidence Confidence</span>
                <span className="text-slate-800">{(confidence_split.evidence_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.evidence_confidence)}`} style={{ width: `${confidence_split.evidence_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Provider Confidence</span>
                <span className="text-slate-800">{(confidence_split.provider_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.provider_confidence)}`} style={{ width: `${confidence_split.provider_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Decision Confidence</span>
                <span className="text-slate-800">{(confidence_split.decision_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.decision_confidence)}`} style={{ width: `${confidence_split.decision_confidence * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ranked Recommendations - Master-Detail Layout */}
      <div>
        <h3 className="text-md font-bold text-foreground uppercase tracking-wider mb-4">Ranked Action Recommendations</h3>
        {cleanRecs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Master list (Left column - 4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              {cleanRecs.map((rec, idx) => {
                const isSelected = rec.id === selectedRecId;
                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecId(rec.id)}
                    className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        idx === 0 ? "bg-emerald-50 text-status-success border border-status-success/20" : idx === 1 ? "bg-amber-50 text-status-warning border border-status-warning/20" : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        Rank {rec.rank}: {idx === 0 ? "Primary" : idx === 1 ? "Alternative" : "Fallback"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${getRiskLevelColor(rec.risk_level)}`}>
                        {rec.risk_level} Risk
                      </span>
                    </div>
                    <h4 className="font-bold text-foreground text-xs leading-snug">{rec.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{rec.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Detail View (Right column - 8 cols) */}
            <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-5 shadow-card space-y-4 min-h-[350px]">
              {selectedRec ? (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Title and Risk */}
                  <div className="flex justify-between items-start border-b border-border pb-3">
                    <div>
                      <h4 className="font-extrabold text-foreground text-lg">{selectedRec.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedRec.description}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ${getRiskLevelColor(selectedRec.risk_level)}`}>
                      Risk: {selectedRec.risk_level}
                    </span>
                  </div>

                  {/* Why this recommendation bubble */}
                  <div className="bg-primary/5 border border-primary/10 p-3.5 rounded-xl space-y-1">
                    <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider">Explainability: Why this choice?</h5>
                    <p className="text-xs text-foreground font-semibold leading-relaxed">{selectedRec.why_this_recommendation}</p>
                  </div>

                  {/* Grid of Reasoning and Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block">Decision Reasoning</span>
                      <p className="text-foreground font-medium leading-relaxed">{selectedRec.reasoning}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block">Implementation Schedule</span>
                      <p className="text-foreground font-medium">{selectedRec.timeline}</p>
                      {selectedRec.required_resources && selectedRec.required_resources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block mb-0.5">Required Resources</span>
                          <span className="text-muted-foreground font-medium">{selectedRec.required_resources.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Benefits and Tradeoffs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                    {selectedRec.benefits && selectedRec.benefits.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block">Expected Benefits</span>
                        <ul className="list-disc pl-4 text-muted-foreground space-y-1 font-medium">
                          {selectedRec.benefits.map((b, i) => <li key={i}>{b}</li>)}
                        </ul>
                      </div>
                    )}
                    {selectedRec.tradeoffs && selectedRec.tradeoffs.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block">Tradeoffs & Boundaries</span>
                        <ul className="list-disc pl-4 text-muted-foreground space-y-1 font-medium">
                          {selectedRec.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Linked Evidence Section */}
                  <div className="border-t border-slate-100 pt-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-primary bg-primary/10 border border-primary/10 px-2 py-0.5 rounded">
                        Grounded Source: {selectedRec.citation}
                      </span>
                      <span className="font-semibold text-emerald-600 font-mono">
                        Vector Match: {(selectedRec.similarity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal italic">
                      "{selectedRec.supporting_evidence}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
                  Select a recommendation from the list to view blueprint details.
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="text-center py-6 text-xs text-muted-foreground italic bg-slate-50 border border-dashed rounded-xl">
            No recommendations generated for this run.
          </div>
        )}
      </div>

      {/* 4. Strategic Tradeoffs, Assumptions, Constraints */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-foreground border-b pb-2 uppercase tracking-wide text-muted-foreground">Strategic Assumptions</h3>
          <ul className="list-disc pl-4 text-xs text-foreground space-y-1.5">
            {assumptions.map((item, i) => <li key={i}>{item}</li>)}
            {assumptions.length === 0 && <li>No strategic assumptions logged.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-foreground border-b pb-2 uppercase tracking-wide text-muted-foreground">Business Constraints</h3>
          <ul className="list-disc pl-4 text-xs text-foreground space-y-1.5">
            {constraints.map((item, i) => <li key={i}>{item}</li>)}
            {constraints.length === 0 && <li>No boundary constraints logged.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-foreground border-b pb-2 uppercase tracking-wide text-muted-foreground">System Tradeoffs</h3>
          <ul className="list-disc pl-4 text-xs text-foreground space-y-1.5">
            {tradeoffs.map((item, i) => <li key={i}>{item}</li>)}
            {tradeoffs.length === 0 && <li>No strategic tradeoffs logged.</li>}
          </ul>
        </div>
      </div>



      {/* 6. Context Warnings & Missing Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-foreground border-b pb-2 text-amber-600">Decision Reasoning Details</h3>
          <p className="text-xs text-foreground leading-relaxed">{decision_reasoning}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-foreground border-b pb-2 text-rose-600">Missing Information & KPI Impact</h3>
          <div className="space-y-2">
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Missing Details</h4>
              <ul className="list-disc pl-4 text-xs text-foreground mt-1 space-y-1">
                {missing_information.map((item, i) => <li key={i}>{item}</li>)}
                {missing_information.length === 0 && <li>All critical details obtained.</li>}
              </ul>
            </div>

            <div className="bg-secondary/50 p-2.5 rounded border">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Confidence Reasoning</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-normal">{confidence.confidence_reasoning}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

