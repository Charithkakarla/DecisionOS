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
    if (p === "high") return "bg-rose-100 text-rose-800 border-rose-200";
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
      {/* Top Banner with generated timestamp & metadata */}
      <div className="flex justify-between items-center bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs">
        <span>Decision Package Version: <strong>{schema_version}</strong></span>
        <span>Generated At: <strong>{generated_at || "Just Now"}</strong></span>
      </div>

      {/* 1. Core Score Metrics & Split Confidence */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Business Scores */}
        <div className="lg:col-span-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Decision Readiness</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{(business_scores.decision_readiness * 100).toFixed(0)}%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${getScoreColor(business_scores.decision_readiness)}`} style={{ width: `${business_scores.decision_readiness * 100}%` }}></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Opportunity Score</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{(business_scores.opportunity_score * 100).toFixed(0)}%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${getScoreColor(business_scores.opportunity_score)}`} style={{ width: `${business_scores.opportunity_score * 100}%` }}></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk Score</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{(business_scores.risk_score * 100).toFixed(0)}%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${getScoreColor(business_scores.risk_score, true)}`} style={{ width: `${business_scores.risk_score * 100}%` }}></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm col-span-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall Confidence</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{(confidence.overall_confidence * 100).toFixed(0)}%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${getScoreColor(confidence.overall_confidence)}`} style={{ width: `${confidence.overall_confidence * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Split Confidence Gauges */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-700 uppercase border-b pb-2 mb-3">Split Confidence Gauges</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Context Confidence (Information populated)</span>
                <span>{(confidence_split.context_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.context_confidence)}`} style={{ width: `${confidence_split.context_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Evidence Confidence (Playbook validation)</span>
                <span>{(confidence_split.evidence_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.evidence_confidence)}`} style={{ width: `${confidence_split.evidence_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Provider Confidence (LLM parsing accuracy)</span>
                <span>{(confidence_split.provider_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.provider_confidence)}`} style={{ width: `${confidence_split.provider_confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Decision Confidence (Deal execution signals)</span>
                <span>{(confidence_split.decision_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreColor(confidence_split.decision_confidence)}`} style={{ width: `${confidence_split.decision_confidence * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive Summary & Goal */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Summary</h3>
          <p className="mt-1 text-slate-800 font-medium leading-relaxed">{executive_summary}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Goal</h3>
            <p className="text-sm font-bold text-slate-800">{business_goal}</p>
          </div>
          <div className="flex gap-2">
            <span className={`rounded-md border px-3 py-1 text-xs font-bold ${getPriorityColor(business_scores.priority_score >= 0.7 ? "High" : business_scores.priority_score >= 0.4 ? "Medium" : "Low")}`}>
              Priority: {business_scores.priority_score >= 0.7 ? "High" : business_scores.priority_score >= 0.4 ? "Medium" : "Low"}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              Value Tier: {business_scores.business_value_score >= 0.75 ? "Enterprise" : "Standard"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Three Ranked Recommendations */}
      <div>
        <h3 className="text-md font-bold text-slate-700 uppercase tracking-wider mb-4">Ranked Action Recommendations</h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {recommendations.map((rec, idx) => (
            <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    Rank {rec.rank}: {idx === 0 ? "Primary" : idx === 1 ? "Alternative" : "Fallback"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getRiskLevelColor(rec.risk_level)}`}>
                    Risk: {rec.risk_level}
                  </span>
                </div>
                
                <h4 className="font-bold text-slate-800 text-base">{rec.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                
                <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase">Explainability: Why this choice?</h5>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{rec.why_this_recommendation}</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-500">Reasoning:</span> <span className="text-slate-700">{rec.reasoning}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Timeline:</span> <span className="text-slate-700">{rec.timeline}</span>
                  </div>
                  {rec.benefits && rec.benefits.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-500">Benefits:</span>
                      <ul className="list-disc pl-4 mt-0.5 text-slate-600 space-y-0.5">
                        {rec.benefits.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                  {rec.tradeoffs && rec.tradeoffs.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-500">Tradeoffs:</span>
                      <ul className="list-disc pl-4 mt-0.5 text-slate-600 space-y-0.5">
                        {rec.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                  {rec.required_resources && rec.required_resources.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-500">Resources:</span> <span className="text-slate-600">{rec.required_resources.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Evidence Section */}
              <div className="border-t pt-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                    {rec.citation}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Similarity: {(rec.similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal italic">
                  "{rec.supporting_evidence}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Strategic Tradeoffs, Assumptions, Constraints */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wide text-slate-500">Strategic Assumptions</h3>
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1.5">
            {assumptions.map((item, i) => <li key={i}>{item}</li>)}
            {assumptions.length === 0 && <li>No strategic assumptions logged.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wide text-slate-500">Business Constraints</h3>
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1.5">
            {constraints.map((item, i) => <li key={i}>{item}</li>)}
            {constraints.length === 0 && <li>No boundary constraints logged.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wide text-slate-500">System Tradeoffs</h3>
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1.5">
            {tradeoffs.map((item, i) => <li key={i}>{item}</li>)}
            {tradeoffs.length === 0 && <li>No strategic tradeoffs logged.</li>}
          </ul>
        </div>
      </div>

      {/* 5. Complete Traceable Evidence Logs */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wide text-slate-500 mb-3">Traceable Evidence Log</h3>
        <div className="space-y-3">
          {evidence_used.map((ev, i) => (
            <div key={i} className="border border-slate-100 bg-slate-50/50 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {ev.document_id}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">
                    Chunk ID: {ev.chunk_id}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic">"{ev.quoted_evidence}"</p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div><span className="font-bold text-slate-400">Match Rank:</span> <span className="text-emerald-600 font-semibold">{(ev.similarity_score * 100).toFixed(0)}%</span></div>
                <div><span className="font-bold text-slate-400">Confidence:</span> <span className="text-slate-600">{ev.confidence.toFixed(2)}</span></div>
              </div>
            </div>
          ))}
          {evidence_used.length === 0 && <p className="text-xs text-slate-400 italic">No traceable evidence references.</p>}
        </div>
      </div>

      {/* 6. Context Warnings & Missing Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 text-amber-600">Decision Reasoning Details</h3>
          <p className="text-xs text-slate-700 leading-relaxed">{decision_reasoning}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 text-rose-600">Missing Information & KPI Impact</h3>
          <div className="space-y-2">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase">Missing Details</h4>
              <ul className="list-disc pl-4 text-xs text-slate-700 mt-1 space-y-1">
                {missing_information.map((item, i) => <li key={i}>{item}</li>)}
                {missing_information.length === 0 && <li>All critical details obtained.</li>}
              </ul>
            </div>
            
            <div className="bg-slate-50 p-2.5 rounded border">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase">Confidence Reasoning</h4>
              <p className="text-xs text-slate-600 mt-1 leading-normal">{confidence.confidence_reasoning}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
