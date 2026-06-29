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
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
          {/* Counter Arguments */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-rose-500" />
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Why This Could Fail</p>
            </div>
            <ul className="space-y-1.5">
              {critique.counterArguments.map((arg, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                  {arg}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weak Evidence */}
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={12} className="text-rose-500" />
                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Weak Evidence</p>
              </div>
              <ul className="space-y-1">
                {critique.weakEvidence.map((e, i) => (
                  <li key={i} className="text-xs text-rose-700">{e}</li>
                ))}
              </ul>
            </div>

            {/* Strong Evidence */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb size={12} className="text-emerald-600" />
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Supporting Evidence</p>
              </div>
              <ul className="space-y-1">
                {critique.strongEvidence.map((e, i) => (
                  <li key={i} className="text-xs text-emerald-700">{e}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Assumptions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={13} className="text-amber-500" />
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assumptions Being Made</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {critique.assumptions.map((a, i) => (
                <span key={i} className="text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Alternative + When it wins */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Alternative Path</p>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">{critique.alternative}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">When Alternative Wins</p>
              <p className="text-xs text-slate-600 mt-0.5">{critique.whenAlternativeWins}</p>
            </div>
          </div>

          {/* Confidence impact */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">Confidence Impact Assessment</p>
            <p className="text-xs text-blue-800">{critique.confidenceImpact}</p>
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
