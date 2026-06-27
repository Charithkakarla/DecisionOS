// Sprint 8 — Human Approval & Enterprise Governance Portal
import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  WorkflowState,
  ApprovalPayload,
  ApprovalStatusType,
  ApprovalResponse,
  AuditHistoryEntry,
  AuditHistoryResponse,
  FeedbackItem,
  ModifiedSection,
  TimelineStep,
} from "../types/agent";

interface ApprovalDashboardProps {
  workflowState: WorkflowState;
  apiBaseUrl: string;
  onApprovalComplete: (status: ApprovalStatusType) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_RING_CIRCUMFERENCE = 251.2;

function ScoreRing({ value, color, label, sublabel }: { value: number; color: string; label: string; sublabel: string }) {
  const offset = SCORE_RING_CIRCUMFERENCE - SCORE_RING_CIRCUMFERENCE * Math.min(value, 1);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 shadow-sm flex flex-col justify-between items-center text-center">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="relative my-4 flex items-center justify-center">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
          <circle cx="48" cy="48" r="40" stroke={color} strokeWidth="6" fill="transparent"
            strokeDasharray={SCORE_RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-xl font-bold text-slate-200">{(value * 100).toFixed(0)}%</span>
      </div>
      <span className="text-[10px] text-slate-400 mt-1 italic">{sublabel}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ApprovalStatusType }) {
  const styles: Record<ApprovalStatusType, string> = {
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    modified: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    escalated: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    pending: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse",
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase border ${styles[status]}`}>
      {status}
    </span>
  );
}

const PIPELINE_AGENTS = [
  { key: "context", label: "Context Intelligence", color: "#10b981" },
  { key: "knowledge", label: "Knowledge Intelligence", color: "#06b6d4" },
  { key: "decision", label: "Decision Intelligence", color: "#f59e0b" },
  { key: "strategy", label: "Strategy Intelligence", color: "#8b5cf6" },
  { key: "reflection", label: "Reflection & Governance", color: "#3b82f6" },
  { key: "approval", label: "Human Approval", color: "#f43f5e" },
];

const DEPARTMENT_OPTIONS = [
  "technology", "finance", "legal", "compliance", "operations",
  "sales", "marketing", "engineering", "security", "executive",
];

const ESCALATION_TARGETS = [
  "Chief Financial Officer",
  "Chief Executive Officer",
  "Chief Risk Officer",
  "Chief Operating Officer",
  "Chief Technology Officer",
  "Chief Compliance Officer",
  "Board of Directors",
];

// ── Main Component ───────────────────────────────────────────────────────────

export default function ApprovalDashboard({ workflowState, apiBaseUrl, onApprovalComplete }: ApprovalDashboardProps) {
  const approvalPayload: ApprovalPayload | null = workflowState.approval_artifact?.payload ?? null;
  const currentStatus: ApprovalStatusType = approvalPayload?.approval_status ?? "pending";
  const workflowId = workflowState.workflow_id ?? "";
  const executionId = workflowState.execution_id ?? "";

  // ── Form state ─────────────────────────────────────────────────────────
  const [activeAction, setActiveAction] = useState<"approve" | "modify" | "escalate" | "reject" | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [businessOwner, setBusinessOwner] = useState("");
  const [department, setDepartment] = useState("technology");
  const [approvalComments, setApprovalComments] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [approvalConfidence, setApprovalConfidence] = useState(0.9);
  const [escalatedTo, setEscalatedTo] = useState(ESCALATION_TARGETS[0]);
  const [escalationReason, setEscalationReason] = useState("");
  const [reviewStartTime] = useState(() => Date.now());

  // Modified sections state
  const [modifiedSections, setModifiedSections] = useState<ModifiedSection[]>([
    { section: "", before: "", after: "", change_reason: "" },
  ]);

  // Feedback items state
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [newFeedback, setNewFeedback] = useState<FeedbackItem>({
    section: "",
    original_value: "",
    corrected_value: "",
    comment: "",
    feedback_type: "note",
  });

  // API state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<(ApprovalResponse & { governance_compliant?: boolean; governance_violations?: string[]; governance_warnings?: string[]; escalation_required?: boolean; escalation_triggers?: string[] }) | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Timeline and history
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);
  const [expandedPanel, setExpandedPanel] = useState<"timeline" | "history" | "report">("timeline");

  // ── Reflection data extraction ─────────────────────────────────────────
  const reflectionPayload = workflowState.reflection_artifact?.payload;
  const trustScore = reflectionPayload?.overall_trust_score ?? 0;
  const governanceScore = reflectionPayload?.governance_score ?? 0;
  const hallucinationRisk = reflectionPayload?.hallucination_risk ?? 0;
  const evidenceCoverage = reflectionPayload?.evidence_coverage ?? 0;

  // Strategy and decision summaries
  const strategyPayload = workflowState.strategy_artifact?.payload;
  const decisionPayload = workflowState.decision_artifact?.payload;

  // ── Escalation signals ─────────────────────────────────────────────────
  const escalationSignals = useMemo(() => {
    const signals: { trigger: string; description: string; severity: string }[] = [];
    if (trustScore < 0.5) signals.push({ trigger: "low_trust", description: `Low trust score (${(trustScore * 100).toFixed(0)}%)`, severity: "high" });
    if (hallucinationRisk >= 0.4) signals.push({ trigger: "high_hallucination", description: `Elevated hallucination risk (${(hallucinationRisk * 100).toFixed(0)}%)`, severity: "high" });
    if (governanceScore < 0.5) signals.push({ trigger: "low_governance", description: `Low governance score (${(governanceScore * 100).toFixed(0)}%)`, severity: "medium" });

    const riskScore = (decisionPayload as Record<string, any>)?.business_scores?.risk_score ?? 0;
    if (riskScore >= 0.6) signals.push({ trigger: "high_risk", description: `High risk score (${(riskScore * 100).toFixed(0)}%)`, severity: "high" });

    const revenue = (decisionPayload as Record<string, any>)?.analysis?.estimated_revenue ?? 0;
    if (revenue >= 150000) signals.push({ trigger: "high_revenue", description: `High-value workflow ($${revenue.toLocaleString()})`, severity: "medium" });

    const complexity = (strategyPayload as Record<string, any>)?.implementation_complexity ?? "Medium";
    if (complexity === "High") signals.push({ trigger: "high_complexity", description: "High implementation complexity", severity: "medium" });

    if (approvalPayload?.escalation_required) {
      if (!signals.some(s => s.trigger === "auto_escalation")) {
        signals.push({ trigger: "auto_escalation", description: approvalPayload.escalation_reason || "Automatic escalation triggered", severity: "high" });
      }
    }
    return signals;
  }, [trustScore, hallucinationRisk, governanceScore, decisionPayload, strategyPayload, approvalPayload]);

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchTimeline = useCallback(async () => {
    if (!workflowId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/approval/timeline/${workflowId}`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline ?? []);
      }
    } catch {
      // Timeline might not be available if cache expired
    }
  }, [workflowId, apiBaseUrl]);

  const fetchHistory = useCallback(async () => {
    if (!workflowId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/approval/history/${workflowId}`);
      if (res.ok) {
        const data: AuditHistoryResponse = await res.json();
        setAuditHistory(data.events);
      }
    } catch {
      // History might not exist yet
    }
  }, [workflowId, apiBaseUrl]);

  useEffect(() => {
    fetchTimeline();
    fetchHistory();
  }, [fetchTimeline, fetchHistory]);

  // ── State snapshot builder ─────────────────────────────────────────────
  const buildStateSnapshot = (): Record<string, unknown> => {
    return JSON.parse(JSON.stringify({
      workflow_id: workflowState.workflow_id,
      execution_id: workflowState.execution_id,
      transcript: workflowState.transcript,
      context_artifact: workflowState.context_artifact,
      knowledge_artifact: workflowState.knowledge_artifact,
      decision_artifact: workflowState.decision_artifact,
      strategy_artifact: workflowState.strategy_artifact,
      reflection_artifact: workflowState.reflection_artifact,
      approval_artifact: workflowState.approval_artifact,
      final_action: workflowState.final_action,
      agent_metadata: workflowState.agent_metadata,
      workflow_events: workflowState.workflow_events,
    }));
  };

  // ── Submit handlers ────────────────────────────────────────────────────
  const handleSubmitApproval = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const durationSeconds = (Date.now() - reviewStartTime) / 1000;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/approval/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          execution_id: executionId,
          reviewer,
          approval_comments: approvalComments,
          approval_reason: approvalReason,
          approval_confidence: approvalConfidence,
          business_owner: businessOwner,
          department,
          review_duration_seconds: durationSeconds,
          feedback_items: feedbackItems,
          state_snapshot: buildStateSnapshot(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.errors?.join("; ") ?? `Approval failed (${res.status})`);
      }
      const result = await res.json();
      setSubmitResult(result);
      onApprovalComplete("approved");
      fetchHistory();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitModification = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const durationSeconds = (Date.now() - reviewStartTime) / 1000;
    const validSections = modifiedSections.filter(s => s.section.trim() && s.after.trim());
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/approval/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          execution_id: executionId,
          reviewer,
          approval_comments: approvalComments,
          modified_sections: validSections,
          approval_confidence: approvalConfidence,
          business_owner: businessOwner,
          department,
          review_duration_seconds: durationSeconds,
          feedback_items: feedbackItems,
          state_snapshot: buildStateSnapshot(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.errors?.join("; ") ?? `Modification failed (${res.status})`);
      }
      const result = await res.json();
      setSubmitResult(result);
      onApprovalComplete("modified");
      fetchHistory();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEscalation = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/approval/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          execution_id: executionId,
          reviewer,
          escalated_to: escalatedTo,
          escalation_reason: escalationReason,
          approval_comments: approvalComments,
          business_owner: businessOwner,
          department,
          state_snapshot: buildStateSnapshot(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.errors?.join("; ") ?? `Escalation failed (${res.status})`);
      }
      const result = await res.json();
      setSubmitResult(result);
      onApprovalComplete("escalated");
      fetchHistory();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRejection = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/approval/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          execution_id: executionId,
          reviewer,
          approval_comments: approvalComments,
          approval_reason: approvalReason,
          business_owner: businessOwner,
          department,
          feedback_items: feedbackItems,
          state_snapshot: buildStateSnapshot(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.errors?.join("; ") ?? `Rejection failed (${res.status})`);
      }
      const result = await res.json();
      setSubmitResult(result);
      onApprovalComplete("rejected");
      fetchHistory();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Feedback item management ───────────────────────────────────────────
  const addFeedbackItem = () => {
    if (newFeedback.section.trim() && (newFeedback.comment.trim() || newFeedback.corrected_value.trim())) {
      setFeedbackItems(prev => [...prev, { ...newFeedback }]);
      setNewFeedback({ section: "", original_value: "", corrected_value: "", comment: "", feedback_type: "note" });
      setShowFeedbackForm(false);
    }
  };

  const removeFeedbackItem = (idx: number) => {
    setFeedbackItems(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Modified section management ────────────────────────────────────────
  const updateModifiedSection = (idx: number, field: keyof ModifiedSection, value: string) => {
    setModifiedSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addModifiedSection = () => {
    setModifiedSections(prev => [...prev, { section: "", before: "", after: "", change_reason: "" }]);
  };

  const removeModifiedSection = (idx: number) => {
    setModifiedSections(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Determine if review is already completed ───────────────────────────
  const isDecisionMade = currentStatus !== "pending" || submitResult !== null;
  const finalStatus: ApprovalStatusType = submitResult?.approval_status ?? currentStatus;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 mb-4 gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-200">Enterprise AI Governance Portal</h3>
            <p className="text-xs text-slate-400">Review, approve, modify, escalate, or reject the AI-generated strategy</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Workflow</span>
            <span className="text-xs font-mono text-cyan-400">{workflowId}</span>
            <StatusBadge status={finalStatus} />
          </div>
        </div>

        {/* ── Governance Score Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreRing value={trustScore} color="#10b981" label="Trust Score" sublabel="Overall pipeline confidence" />
          <ScoreRing value={governanceScore} color="#3b82f6" label="Governance Score" sublabel="Audit & compliance adherence" />
          <ScoreRing value={1 - hallucinationRisk} color={hallucinationRisk > 0.4 ? "#f43f5e" : "#f59e0b"} label="Factual Safety" sublabel={`Hallucination risk: ${(hallucinationRisk * 100).toFixed(0)}%`} />
          <ScoreRing value={evidenceCoverage} color="#8b5cf6" label="Evidence Coverage" sublabel="Citation completeness ratio" />
        </div>
      </section>

      {/* ── Escalation Signals Banner ──────────────────────────────────── */}
      {escalationSignals.length > 0 && (
        <section className="bg-rose-950/20 rounded-xl p-4 border border-rose-500/20 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded">
              Escalation Signals Detected
            </span>
            <span className="text-xs text-slate-400">
              {escalationSignals.length} risk signal{escalationSignals.length > 1 ? "s" : ""} flagged by governance engine
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {escalationSignals.map((sig, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-900/60 border border-rose-500/10 rounded-lg p-2.5 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  sig.severity === "high" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {sig.severity}
                </span>
                <span className="text-slate-300">{sig.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Executive Summary ──────────────────────────────────────────── */}
      <section className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-lg">
        <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-800 pb-2">Executive Workflow Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-900 space-y-2">
            <p className="font-semibold text-slate-300">Selected Strategy</p>
            <p className="text-slate-400">{(strategyPayload as Record<string, any>)?.selected_strategy ?? "N/A"}</p>
            <div className="flex gap-4 mt-2">
              <div>
                <span className="text-slate-500">Est. ROI:</span>{" "}
                <span className="text-emerald-400 font-bold">{((strategyPayload as Record<string, any>)?.estimated_roi ?? 0).toFixed(1)}x</span>
              </div>
              <div>
                <span className="text-slate-500">Timeline:</span>{" "}
                <span className="text-slate-200">{(strategyPayload as Record<string, any>)?.implementation_timeline ?? "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500">Complexity:</span>{" "}
                <span className="text-slate-200">{(strategyPayload as Record<string, any>)?.implementation_complexity ?? "N/A"}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-900 space-y-2">
            <p className="font-semibold text-slate-300">Decision Reasoning</p>
            <p className="text-slate-400">{(decisionPayload as Record<string, any>)?.decision_reasoning ?? "N/A"}</p>
            <p className="font-semibold text-slate-300 mt-2">Reflection Verdict</p>
            <p className="text-slate-400">{reflectionPayload?.audit_summary ?? "N/A"}</p>
          </div>
        </div>
      </section>

      {/* ── Interactive Review Actions ─────────────────────────────────── */}
      {!isDecisionMade && (
        <section className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-lg">
          <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">
            Reviewer Identity & Action
          </h4>

          {/* Reviewer fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Reviewer Name / ID</label>
              <input type="text" value={reviewer} onChange={e => setReviewer(e.target.value)}
                placeholder="e.g., John Smith, VP Operations"
                className="w-full text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none ring-emerald-500/30 focus:ring transition" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Business Owner</label>
              <input type="text" value={businessOwner} onChange={e => setBusinessOwner(e.target.value)}
                placeholder="e.g., IT Department, Finance Team"
                className="w-full text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none ring-emerald-500/30 focus:ring transition" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none">
                {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Action selection tabs */}
          <div className="flex border-b border-slate-800 text-xs mb-4">
            {([
              { key: "approve" as const, label: "Approve", color: "emerald" },
              { key: "modify" as const, label: "Modify", color: "yellow" },
              { key: "escalate" as const, label: "Escalate", color: "purple" },
              { key: "reject" as const, label: "Reject", color: "rose" },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveAction(tab.key)}
                className={`px-4 py-2.5 border-b-2 font-bold transition ${
                  activeAction === tab.key
                    ? `border-${tab.color}-400 text-${tab.color}-400`
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                style={activeAction === tab.key ? { borderBottomColor: tab.color === "emerald" ? "#34d399" : tab.color === "yellow" ? "#fbbf24" : tab.color === "purple" ? "#a78bfa" : "#fb7185", color: tab.color === "emerald" ? "#34d399" : tab.color === "yellow" ? "#fbbf24" : tab.color === "purple" ? "#a78bfa" : "#fb7185" } : {}}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Approve panel ───────────────────────────────────────── */}
          {activeAction === "approve" && (
            <div className="space-y-4 bg-emerald-950/10 border border-emerald-500/10 rounded-lg p-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Approval Comments (min 10 characters)</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Provide detailed justification for approving this strategy..."
                  className="w-full h-20 text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Approval Reason</label>
                  <input type="text" value={approvalReason} onChange={e => setApprovalReason(e.target.value)}
                    placeholder="e.g., All validation criteria met."
                    className="w-full text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    Approval Confidence: {(approvalConfidence * 100).toFixed(0)}%
                  </label>
                  <input type="range" min="0" max="1" step="0.05" value={approvalConfidence}
                    onChange={e => setApprovalConfidence(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                </div>
              </div>
              <button onClick={handleSubmitApproval} disabled={submitting || !reviewer.trim() || approvalComments.length < 10 || !businessOwner.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? "Submitting Approval..." : "Submit Approval"}
              </button>
            </div>
          )}

          {/* ── Modify panel ────────────────────────────────────────── */}
          {activeAction === "modify" && (
            <div className="space-y-4 bg-yellow-950/10 border border-yellow-500/10 rounded-lg p-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Modification Comments (min 10 characters)</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Describe why modifications are needed..."
                  className="w-full h-20 text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none resize-none" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Modified Sections (Before → After)</span>
                  <button onClick={addModifiedSection} className="text-[10px] text-yellow-400 hover:text-yellow-300 font-semibold">+ Add Section</button>
                </div>
                {modifiedSections.map((mod, idx) => (
                  <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <input type="text" value={mod.section} onChange={e => updateModifiedSection(idx, "section", e.target.value)}
                        placeholder="Section name (e.g., strategy.timeline)"
                        className="flex-1 text-xs bg-slate-950 border border-slate-800 p-2 rounded text-slate-200 outline-none mr-2" />
                      {modifiedSections.length > 1 && (
                        <button onClick={() => removeModifiedSection(idx)} className="text-[10px] text-rose-400 hover:text-rose-300">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={mod.before} onChange={e => updateModifiedSection(idx, "before", e.target.value)}
                        placeholder="Original value"
                        className="text-xs bg-rose-950/20 border border-rose-500/10 p-2 rounded text-slate-300 outline-none" />
                      <input type="text" value={mod.after} onChange={e => updateModifiedSection(idx, "after", e.target.value)}
                        placeholder="New value"
                        className="text-xs bg-emerald-950/20 border border-emerald-500/10 p-2 rounded text-slate-300 outline-none" />
                    </div>
                    <input type="text" value={mod.change_reason} onChange={e => updateModifiedSection(idx, "change_reason", e.target.value)}
                      placeholder="Reason for change"
                      className="w-full text-xs bg-slate-950 border border-slate-800 p-2 rounded text-slate-300 outline-none" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Confidence in Modified Strategy: {(approvalConfidence * 100).toFixed(0)}%
                </label>
                <input type="range" min="0" max="1" step="0.05" value={approvalConfidence}
                  onChange={e => setApprovalConfidence(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-yellow-500" />
              </div>

              <button onClick={handleSubmitModification}
                disabled={submitting || !reviewer.trim() || approvalComments.length < 10 || !businessOwner.trim() || !modifiedSections.some(s => s.section.trim() && s.after.trim())}
                className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? "Submitting Modifications..." : "Submit with Modifications"}
              </button>
            </div>
          )}

          {/* ── Escalate panel ──────────────────────────────────────── */}
          {activeAction === "escalate" && (
            <div className="space-y-4 bg-purple-950/10 border border-purple-500/10 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Escalate To</label>
                  <select value={escalatedTo} onChange={e => setEscalatedTo(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none">
                    {ESCALATION_TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Escalation Reason (min 10 characters)</label>
                  <input type="text" value={escalationReason} onChange={e => setEscalationReason(e.target.value)}
                    placeholder="Why does this require executive review?"
                    className="w-full text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Additional Comments</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Provide context for the executive reviewer..."
                  className="w-full h-16 text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none resize-none" />
              </div>
              <button onClick={handleSubmitEscalation}
                disabled={submitting || !reviewer.trim() || escalationReason.length < 10 || !escalatedTo.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? "Escalating..." : "Escalate to Executive Reviewer"}
              </button>
            </div>
          )}

          {/* ── Reject panel ────────────────────────────────────────── */}
          {activeAction === "reject" && (
            <div className="space-y-4 bg-rose-950/10 border border-rose-500/10 rounded-lg p-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Rejection Comments (min 10 characters)</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Explain why this strategy is being rejected..."
                  className="w-full h-20 text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Rejection Reason</label>
                <input type="text" value={approvalReason} onChange={e => setApprovalReason(e.target.value)}
                  placeholder="e.g., Insufficient risk mitigation plan."
                  className="w-full text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 outline-none" />
              </div>
              <button onClick={handleSubmitRejection}
                disabled={submitting || !reviewer.trim() || approvalComments.length < 10 || !businessOwner.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? "Rejecting..." : "Reject Strategy"}
              </button>
            </div>
          )}

          {/* ── Error display ───────────────────────────────────────── */}
          {submitError && (
            <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3 mt-3">
              <p className="text-xs text-rose-400 font-semibold">Submission Error</p>
              <p className="text-xs text-rose-300 mt-1">{submitError}</p>
            </div>
          )}

          {/* ── Feedback Items Section ──────────────────────────────── */}
          <div className="mt-4 border-t border-slate-800 pt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Structured Feedback Items ({feedbackItems.length})
              </span>
              <button onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold">
                {showFeedbackForm ? "Cancel" : "+ Add Feedback"}
              </button>
            </div>

            {feedbackItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-slate-900/40 border border-slate-800 rounded-lg p-2.5 mb-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-bold uppercase">{item.feedback_type}</span>
                <div className="flex-1">
                  <span className="text-slate-300 font-semibold">{item.section}</span>
                  {item.original_value && <span className="text-rose-400 ml-2 line-through">{item.original_value}</span>}
                  {item.corrected_value && <span className="text-emerald-400 ml-2">{item.corrected_value}</span>}
                  {item.comment && <p className="text-slate-400 mt-0.5 italic">{item.comment}</p>}
                </div>
                <button onClick={() => removeFeedbackItem(idx)} className="text-[10px] text-rose-400 hover:text-rose-300">✕</button>
              </div>
            ))}

            {showFeedbackForm && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newFeedback.section} onChange={e => setNewFeedback(prev => ({ ...prev, section: e.target.value }))}
                    placeholder="Section (e.g., strategy.timeline)"
                    className="text-xs bg-slate-950 border border-slate-800 p-2 rounded text-slate-200 outline-none" />
                  <select value={newFeedback.feedback_type}
                    onChange={e => setNewFeedback(prev => ({ ...prev, feedback_type: e.target.value as FeedbackItem["feedback_type"] }))}
                    className="text-xs bg-slate-950 border border-slate-800 p-2 rounded text-slate-200 outline-none">
                    <option value="note">Note</option>
                    <option value="correction">Correction</option>
                    <option value="addition">Addition</option>
                    <option value="deletion">Deletion</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newFeedback.original_value} onChange={e => setNewFeedback(prev => ({ ...prev, original_value: e.target.value }))}
                    placeholder="Original value (optional)"
                    className="text-xs bg-slate-950 border border-slate-800 p-2 rounded text-slate-200 outline-none" />
                  <input type="text" value={newFeedback.corrected_value} onChange={e => setNewFeedback(prev => ({ ...prev, corrected_value: e.target.value }))}
                    placeholder="Corrected value (optional)"
                    className="text-xs bg-slate-950 border border-slate-800 p-2 rounded text-slate-200 outline-none" />
                </div>
                <input type="text" value={newFeedback.comment} onChange={e => setNewFeedback(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Comment or note"
                  className="w-full text-xs bg-slate-950 border border-slate-800 p-2 rounded text-slate-200 outline-none" />
                <button onClick={addFeedbackItem}
                  disabled={!newFeedback.section.trim() || (!newFeedback.comment.trim() && !newFeedback.corrected_value.trim())}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed">
                  Add Feedback Item
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Decision Result Card ───────────────────────────────────────── */}
      {isDecisionMade && (
        <section className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-200">Approval Decision Recorded</h4>
              <p className="text-xs text-slate-400 mt-1">
                {submitResult?.message ?? `Workflow has been ${finalStatus} by ${approvalPayload?.reviewer ?? "reviewer"}.`}
              </p>
            </div>
            <StatusBadge status={finalStatus} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-900">
              <span className="text-slate-500 block mb-1">Artifact ID</span>
              <span className="text-cyan-400 font-mono text-[10px] break-all">{submitResult?.artifact_id ?? approvalPayload?.workflow_report_reference ?? "N/A"}</span>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-900">
              <span className="text-slate-500 block mb-1">Learning Queue</span>
              <span className="text-purple-400 font-mono text-[10px] break-all">
                {submitResult?.learning_queue_id ? `✓ Queued: ${submitResult.learning_queue_id.slice(0, 8)}...` : "Not queued"}
              </span>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-900">
              <span className="text-slate-500 block mb-1">Governance Compliance</span>
              {submitResult?.governance_compliant !== undefined ? (
                <span className={submitResult.governance_compliant ? "text-emerald-400" : "text-rose-400"}>
                  {submitResult.governance_compliant ? "✓ Compliant" : "✕ Non-Compliant"}
                </span>
              ) : (
                <span className="text-slate-400">Pending verification</span>
              )}
            </div>
          </div>

          {/* Governance violations / warnings */}
          {submitResult?.governance_violations && submitResult.governance_violations.length > 0 && (
            <div className="mt-3 space-y-1">
              {submitResult.governance_violations.map((v, i) => (
                <div key={i} className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2 rounded">{v}</div>
              ))}
            </div>
          )}
          {submitResult?.governance_warnings && submitResult.governance_warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {submitResult.governance_warnings.map((w, i) => (
                <div key={i} className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2 rounded">{w}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Audit Timeline & History ───────────────────────────────────── */}
      <section className="bg-slate-950 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
        <div className="flex border-b border-slate-800 text-xs">
          <button onClick={() => setExpandedPanel("timeline")}
            className={`px-4 py-3 border-b-2 font-bold transition ${expandedPanel === "timeline" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            Pipeline Timeline
          </button>
          <button onClick={() => setExpandedPanel("history")}
            className={`px-4 py-3 border-b-2 font-bold transition ${expandedPanel === "history" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            Audit History ({auditHistory.length})
          </button>
        </div>

        <div className="p-4">
          {/* ── Visual Pipeline Timeline ──────────────────────────────── */}
          {expandedPanel === "timeline" && (
            <div className="relative">
              {timeline.length === 0 ? (
                <div className="space-y-4">
                  {/* Build timeline from workflow events when API timeline isn't available */}
                  {PIPELINE_AGENTS.map((agent, idx) => {
                    const artifactKey = `${agent.key}_artifact` as keyof WorkflowState;
                    const artifact = workflowState[artifactKey];
                    const meta = workflowState.agent_metadata?.[agent.key];
                    const isComplete = !!artifact;
                    return (
                      <div key={agent.key} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                            isComplete ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}>
                            {idx + 1}
                          </div>
                          {idx < PIPELINE_AGENTS.length - 1 && (
                            <div className={`w-0.5 h-8 ${isComplete ? "bg-emerald-500/30" : "bg-slate-800"}`} />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-200">{agent.label}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              isComplete ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-500"
                            }`}>
                              {isComplete ? "Completed" : "Pending"}
                            </span>
                          </div>
                          {isComplete && meta && (
                            <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
                              <span>Latency: <span className="text-slate-300">{meta.latency_ms}ms</span></span>
                              <span>Provider: <span className="text-slate-300 font-mono">{meta.provider}</span></span>
                              {(artifact as Record<string, any>)?.confidence !== undefined && (
                                <span>Confidence: <span className="text-slate-300">{((artifact as Record<string, any>).confidence * 100).toFixed(0)}%</span></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                          step.status === "completed" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : step.status === "pending" ? "border-blue-500/40 bg-blue-500/10 text-blue-400 animate-pulse"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}>
                          {step.step + 1}
                        </div>
                        {idx < timeline.length - 1 && (
                          <div className={`w-0.5 h-8 ${step.status === "completed" ? "bg-emerald-500/30" : "bg-slate-800"}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-200">{step.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            step.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : step.status === "pending" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"
                              : "bg-slate-800 text-slate-500"
                          }`}>
                            {step.status}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
                          {step.timestamp && <span>Time: <span className="text-slate-300">{new Date(step.timestamp).toLocaleTimeString()}</span></span>}
                          {step.duration_ms > 0 && <span>Duration: <span className="text-slate-300">{step.duration_ms}ms</span></span>}
                          {step.provider && <span>Provider: <span className="text-slate-300 font-mono">{step.provider}</span></span>}
                          {step.confidence > 0 && <span>Confidence: <span className="text-slate-300">{(step.confidence * 100).toFixed(0)}%</span></span>}
                          {step.reviewer && <span>Reviewer: <span className="text-slate-300">{step.reviewer}</span></span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Audit History Table ───────────────────────────────────── */}
          {expandedPanel === "history" && (
            <div>
              {auditHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No audit history events recorded yet. Submit an approval action to generate audit records.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-800">
                        <th className="pb-2 pr-4">Timestamp</th>
                        <th className="pb-2 pr-4">Event Type</th>
                        <th className="pb-2 pr-4">Actor</th>
                        <th className="pb-2 pr-4">Artifact</th>
                        <th className="pb-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditHistory.map((entry) => (
                        <tr key={entry.event_id} className="border-b border-slate-900 text-slate-300">
                          <td className="py-2 pr-4 text-slate-400 font-mono text-[10px]">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              entry.event_type.includes("Granted") || entry.event_type.includes("Completed") ? "bg-emerald-500/10 text-emerald-400" :
                              entry.event_type.includes("Rejected") || entry.event_type.includes("Failed") ? "bg-rose-500/10 text-rose-400" :
                              entry.event_type.includes("Escalated") ? "bg-purple-500/10 text-purple-400" :
                              entry.event_type.includes("Modified") ? "bg-yellow-500/10 text-yellow-400" :
                              "bg-slate-800 text-slate-400"
                            }`}>
                              {entry.event_type}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-300">{entry.actor}</td>
                          <td className="py-2 pr-4 text-cyan-400 font-mono text-[10px]">{entry.artifact_id ? entry.artifact_id.slice(0, 8) + "..." : "—"}</td>
                          <td className="py-2 text-slate-400 text-[10px] max-w-[200px] truncate">
                            {Object.entries(entry.details).filter(([, v]) => v !== null && v !== "" && v !== 0).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v).slice(0, 30) : String(v)}`).join(" | ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Observability Metrics ──────────────────────────────────────── */}
      <section className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-lg">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Approval Observability</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-900">
            <span className="text-[9px] text-slate-500 block">Review Time</span>
            <span className="text-sm font-bold text-slate-200">
              {isDecisionMade ? `${Math.round((Date.now() - reviewStartTime) / 1000)}s` : "Active"}
            </span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-900">
            <span className="text-[9px] text-slate-500 block">Reviewer</span>
            <span className="text-sm font-bold text-slate-200">{approvalPayload?.reviewer || reviewer || "Unassigned"}</span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-900">
            <span className="text-[9px] text-slate-500 block">Final Status</span>
            <span className="text-sm font-bold capitalize" style={{ color: finalStatus === "approved" ? "#34d399" : finalStatus === "rejected" ? "#fb7185" : finalStatus === "modified" ? "#fbbf24" : finalStatus === "escalated" ? "#a78bfa" : "#60a5fa" }}>
              {finalStatus}
            </span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-900">
            <span className="text-[9px] text-slate-500 block">Escalation Signals</span>
            <span className="text-sm font-bold text-slate-200">{escalationSignals.length}</span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-900">
            <span className="text-[9px] text-slate-500 block">Feedback Items</span>
            <span className="text-sm font-bold text-slate-200">{feedbackItems.length + (approvalPayload?.feedback_items?.length ?? 0)}</span>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-900">
            <span className="text-[9px] text-slate-500 block">Audit Events</span>
            <span className="text-sm font-bold text-slate-200">{auditHistory.length}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
