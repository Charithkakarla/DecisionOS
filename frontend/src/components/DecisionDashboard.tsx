// Contains: DecisionDashboard.tsx implementation.
import { DecisionPackage } from "../types/agent";

interface DecisionDashboardProps {
  decisionPackage: DecisionPackage;
}

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

      {/* 1. Core Score Metrics & Split Confidence */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Business Scores */}
        <div className="lg:col-span-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Decision Readiness</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{(business_scores.decision_readiness * 100).toFixed(0)}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className={`h-full ${getScoreColor(business_scores.decision_readiness)}`} style={{ width: `${business_scores.decision_readiness * 100}%` }}></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opportunity Score</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{(business_scores.opportunity_score * 100).toFixed(0)}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className={`h-full ${getScoreColor(business_scores.opportunity_score)}`} style={{ width: `${business_scores.opportunity_score * 100}%` }}></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Score</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{(business_scores.risk_score * 100).toFixed(0)}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className={`h-full ${getScoreColor(business_scores.risk_score, true)}`} style={{ width: `${business_scores.risk_score * 100}%` }}></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card col-span-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Confidence</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{(confidence.overall_confidence * 100).toFixed(0)}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className={`h-full ${getScoreColor(confidence.overall_confidence)}`} style={{ width: `${confidence.overall_confidence * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Split Confidence Gauges */}
        <div className="lg:col-span-6 rounded-2xl border border-border bg-card p-4 shadow-card flex flex-col justify-between">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide border-b border-border pb-2 mb-3">Split Confidence Gauges</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                <span>Context Confidence (Information populated)</span>
                <span className="font-semibold text-foreground">{(confidence_split.context_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.context_confidence)}`} style={{ width: `${confidence_split.context_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                <span>Evidence Confidence (Playbook validation)</span>
                <span className="font-semibold text-foreground">{(confidence_split.evidence_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.evidence_confidence)}`} style={{ width: `${confidence_split.evidence_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                <span>Provider Confidence (LLM parsing accuracy)</span>
                <span className="font-semibold text-foreground">{(confidence_split.provider_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.provider_confidence)}`} style={{ width: `${confidence_split.provider_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                <span>Decision Confidence (Deal execution signals)</span>
                <span className="font-semibold text-foreground">{(confidence_split.decision_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.decision_confidence)}`} style={{ width: `${confidence_split.decision_confidence * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive Summary & Goal */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Executive Summary</h3>
          <p className="mt-1 text-foreground font-medium leading-relaxed">{executive_summary}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Business Goal</h3>
            <p className="text-sm font-bold text-foreground">{business_goal}</p>
          </div>
          <div className="flex gap-2">
            <span className={`rounded-md border px-3 py-1 text-xs font-bold ${getPriorityColor(business_scores.priority_score >= 0.7 ? "High" : business_scores.priority_score >= 0.4 ? "Medium" : "Low")}`}>
              Priority: {business_scores.priority_score >= 0.7 ? "High" : business_scores.priority_score >= 0.4 ? "Medium" : "Low"}
            </span>
            <span className="rounded-md border border-border bg-secondary/50 px-3 py-1 text-xs font-bold text-foreground">
              Value Tier: {business_scores.business_value_score >= 0.75 ? "Enterprise" : "Standard"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Three Ranked Recommendations */}
      <div>
        <h3 className="text-md font-bold text-foreground uppercase tracking-wider mb-4">Ranked Action Recommendations</h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {recommendations.map((rec, idx) => (
            <div key={rec.id} className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col justify-between hover:shadow-md transition space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    Rank {rec.rank}: {idx === 0 ? "Primary" : idx === 1 ? "Alternative" : "Fallback"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getRiskLevelColor(rec.risk_level)}`}>
                    Risk: {rec.risk_level}
                  </span>
                </div>

                <h4 className="font-bold text-foreground text-base">{rec.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>

                <div className="bg-secondary/50 p-2.5 rounded border border-border/70 space-y-1">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase">Explainability: Why this choice?</h5>
                  <p className="text-xs text-foreground font-medium leading-relaxed">{rec.why_this_recommendation}</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground">Reasoning:</span> <span className="text-foreground">{rec.reasoning}</span>
                  </div>
                  <div>
                    <span className="font-bold text-muted-foreground">Timeline:</span> <span className="text-foreground">{rec.timeline}</span>
                  </div>
                  {rec.benefits && rec.benefits.length > 0 && (
                    <div>
                      <span className="font-bold text-muted-foreground">Benefits:</span>
                      <ul className="list-disc pl-4 mt-0.5 text-muted-foreground space-y-0.5">
                        {rec.benefits.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                  {rec.tradeoffs && rec.tradeoffs.length > 0 && (
                    <div>
                      <span className="font-bold text-muted-foreground">Tradeoffs:</span>
                      <ul className="list-disc pl-4 mt-0.5 text-muted-foreground space-y-0.5">
                        {rec.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                  {rec.required_resources && rec.required_resources.length > 0 && (
                    <div>
                      <span className="font-bold text-muted-foreground">Resources:</span> <span className="text-muted-foreground">{rec.required_resources.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Evidence Section */}
              <div className="border-t pt-3 bg-secondary/50/50 p-3 rounded-lg border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                    {rec.citation}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Similarity: {(rec.similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal italic">
                  "{rec.supporting_evidence}"
                </p>
              </div>
            </div>
          ))}
        </div>
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

      {/* 5. Complete Traceable Evidence Logs */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h3 className="text-sm font-bold text-foreground border-b pb-2 uppercase tracking-wide text-muted-foreground mb-3">Traceable Evidence Log</h3>
        <div className="space-y-3">
          {evidence_used.map((ev, i) => (
            <div key={i} className="border border-border/70 bg-secondary/50/50 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {ev.document_id}
                  </span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                    Chunk ID: {ev.chunk_id}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic">"{ev.quoted_evidence}"</p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div><span className="font-bold text-muted-foreground">Match Rank:</span> <span className="text-emerald-600 font-semibold">{(ev.similarity_score * 100).toFixed(0)}%</span></div>
                <div><span className="font-bold text-muted-foreground">Confidence:</span> <span className="text-muted-foreground">{ev.confidence.toFixed(2)}</span></div>
              </div>
            </div>
          ))}
          {evidence_used.length === 0 && <p className="text-xs text-muted-foreground italic">No traceable evidence references.</p>}
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

