import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, Lightbulb, ShieldAlert, TrendingDown, HelpCircle } from "lucide-react";
import type { DecisionPackage, Recommendation } from "../types/agent";

interface Props {
  decisionPackage: DecisionPackage;
}

interface Critique {
  recId: string;
  recTitle: string;
  counterArguments: string[];
  weakEvidence: string[];
  strongEvidence: string[];
  assumptions: string[];
  alternative: string;
  confidenceImpact: string;
  whenAlternativeWins: string;
}

function buildCritiques(recommendations: Recommendation[], decPkg: DecisionPackage): Critique[] {
  return recommendations.map((rec) => {
    const riskLevel = rec.risk_level;
    const confidence = rec.confidence;
    const hasEvidence = rec.similarity_score > 0.6;
    const isHighRisk = riskLevel === "High";
    const isMediumRisk = riskLevel === "Medium";

    const counterArguments: string[] = [];

    // Generate contextual counter-arguments based on rec data
    if (rec.risks?.length > 0) {
      counterArguments.push(...rec.risks.slice(0, 2));
    }
    if (rec.tradeoffs?.length > 0) {
      counterArguments.push(rec.tradeoffs[0]);
    }
    if (!hasEvidence) {
      counterArguments.push("Supporting evidence similarity score is below optimal threshold — recommendation may be weakly grounded.");
    }
    if (isHighRisk) {
      counterArguments.push("High risk classification means unforeseen obstacles could invalidate the expected ROI.");
    }
    if (rec.timeline && rec.timeline.includes("day")) {
      counterArguments.push(`The ${rec.timeline} timeline may be optimistic under real operational constraints.`);
    }
    if (counterArguments.length < 2) {
      counterArguments.push("Stakeholder buy-in is assumed but not confirmed — organizational resistance is possible.");
    }

    const weakEvidence: string[] = [];
    const strongEvidence: string[] = [];

    if (rec.similarity_score < 0.7) {
      weakEvidence.push(`Knowledge base match at ${(rec.similarity_score * 100).toFixed(0)}% — may not fully apply to this context.`);
    }
    if (decPkg.missing_information?.length > 0) {
      weakEvidence.push(`${decPkg.missing_information[0]} — this gap reduces evidentiary completeness.`);
    }
    if (weakEvidence.length === 0) {
      weakEvidence.push("No critical evidence gaps detected, but all assumptions warrant independent verification.");
    }

    if (rec.similarity_score >= 0.7) {
      strongEvidence.push(`Playbook alignment at ${(rec.similarity_score * 100).toFixed(0)}% supports this approach.`);
    }
    if (rec.benefits?.length > 0) {
      strongEvidence.push(rec.benefits[0]);
    }
    if (strongEvidence.length === 0) {
      strongEvidence.push("Historical patterns from similar cases support the core logic of this recommendation.");
    }

    const assumptions = rec.assumptions_made?.length > 0 ? rec.assumptions_made : [
      "Stakeholders will agree on the proposed timeline.",
      "Required resources will be available without competing priorities.",
      `The ${riskLevel.toLowerCase()} risk level remains stable throughout execution.`,
    ];

    const altRec = recommendations.find((r) => r.rank !== rec.rank);
    const alternative = altRec ? altRec.title : "A phased discovery approach to gather more information before committing.";

    const confidenceImpact = confidence >= 0.8
      ? "High confidence — strong basis for proceeding. Minor unknowns are acceptable."
      : confidence >= 0.6
        ? "Moderate confidence — proceed but establish checkpoints to validate assumptions."
        : "Low confidence — significant uncertainty exists. Gather additional data before approval.";

    const whenAlternativeWins = isHighRisk
      ? "If budget constraints tighten or compliance requirements change, the lower-risk alternative gains priority."
      : isMediumRisk
        ? `If resource availability is lower than expected, "${alternative}" becomes the stronger choice.`
        : `If speed is prioritized over thoroughness, "${alternative}" may deliver faster results.`;

    return {
      recId: rec.id,
      recTitle: rec.title,
      counterArguments,
      weakEvidence,
      strongEvidence,
      assumptions,
      alternative,
      confidenceImpact,
      whenAlternativeWins,
    };
  });
}

function CritiqueCard({ critique }: { critique: Critique }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <ShieldAlert size={14} className="text-rose-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{critique.recTitle}</p>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
              {critique.counterArguments.length} challenge{critique.counterArguments.length !== 1 ? "s" : ""} identified
            </p>
          </div>
        </div>
        {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-slate-50/20">
          
          {/* Left Panel: Challenges & Evidence (7 columns) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Why This Could Fail */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} className="text-rose-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Key Challenges</span>
              </div>
              <ul className="space-y-1.5 pl-1">
                {critique.counterArguments.map((arg, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">•</span>
                    {arg}
                  </li>
                ))}
              </ul>
            </div>

            {/* Evidence Evaluation - Simple side-by-side capsules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-rose-50/50 border border-rose-100/60 rounded-xl p-3">
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1.5">Weak Evidence</p>
                <div className="space-y-1.5">
                  {critique.weakEvidence.map((e, i) => (
                    <p key={i} className="text-xs text-rose-700 leading-normal">• {e}</p>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5">Supporting Evidence</p>
                <div className="space-y-1.5">
                  {critique.strongEvidence.map((e, i) => (
                    <p key={i} className="text-xs text-emerald-700 leading-normal">• {e}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Adaptive Pathway & Impact (5 columns) */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3.5">
            {/* Confidence Impact */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence Impact</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  critique.confidenceImpact.toLowerCase().includes("high") 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                    : critique.confidenceImpact.toLowerCase().includes("moderate")
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                }`}>
                  {critique.confidenceImpact.split(" — ")[0] || "Assessment"}
                </span>
                <span className="text-xs text-slate-500 truncate">
                  {critique.confidenceImpact.split(" — ")[1] || critique.confidenceImpact}
                </span>
              </div>
            </div>

            {/* Alternative Pathway */}
            <div className="border-t border-slate-200/60 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alternative Path</p>
              <p className="text-xs text-slate-800 font-bold mt-1">🔀 {critique.alternative}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                <strong className="text-slate-600 font-bold">Trigger:</strong> {critique.whenAlternativeWins}
              </p>
            </div>

            {/* Assumptions */}
            <div className="border-t border-slate-200/60 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assumptions Made</p>
              <div className="flex flex-wrap gap-1.5">
                {critique.assumptions.map((a, i) => (
                  <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium shadow-sm leading-normal">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function DevilsAdvocate({ decisionPackage }: Props) {
  const critiques = useMemo(
    () => buildCritiques(decisionPackage.recommendations, decisionPackage),
    [decisionPackage]
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-rose-900 text-sm">AI Self-Critique Engine</p>
          <p className="text-xs text-rose-700 mt-0.5">
            Before accepting any recommendation, the system challenges its own reasoning. This is not Reflection — it runs before governance checks and highlights potential failure modes, weak evidence, and hidden assumptions.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {critiques.map((c) => (
          <CritiqueCard key={c.recId} critique={c} />
        ))}
      </div>

      <div className="text-xs text-slate-400 text-center pt-2">
        All critiques are generated from the same evidence and context used to produce the recommendations.
      </div>
    </div>
  );
}
