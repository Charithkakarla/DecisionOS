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
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between items-center text-center">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="relative my-4 flex items-center justify-center">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r="40" stroke="hsl(220,10%,88%)" strokeWidth="6" fill="transparent" />
          <circle cx="48" cy="48" r="40" stroke={color} strokeWidth="6" fill="transparent"
            strokeDasharray={SCORE_RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-xl font-bold text-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 italic">{sublabel}</span>
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
      <section className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-3 mb-4 gap-2">
          <div>
            <h3 className="text-lg font-bold text-foreground">Enterprise AI Governance Portal</h3>
            <p className="text-xs text-muted-foreground">Review, approve, modify, escalate, or reject the AI-generated strategy</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Workflow</span>
            <span className="text-xs font-mono text-primary">{workflowId}</span>
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
        <section className="bg-status-error-bg rounded-xl p-4 border border-status-error/20 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider bg-status-error text-white px-2 py-0.5 rounded">
              Escalation Signals Detected
            </span>
            <span className="text-xs text-muted-foreground">
              {escalationSignals.length} risk signal{escalationSignals.length > 1 ? "s" : ""} flagged
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {escalationSignals.map((sig, i) => (
              <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg p-2.5 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  sig.severity === "high" ? "bg-status-error-bg text-status-error" : "bg-status-warning-bg text-status-warning"
                }`}>
                  {sig.severity}
                </span>
                <span className="text-foreground">{sig.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Executive Summary ──────────────────────────────────────────── */}
      <section className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <h4 className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2">Executive Workflow Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-secondary/40 rounded-lg p-3 border border-border space-y-2">
            <p className="font-semibold text-foreground">Selected Strategy</p>
            <p className="text-muted-foreground">{(strategyPayload as Record<string, any>)?.selected_strategy ?? "N/A"}</p>
            <div className="flex gap-4 mt-2">
              <div><span className="text-muted-foreground">Est. ROI:</span>{" "}<span className="text-status-success font-bold">{((strategyPayload as Record<string, any>)?.estimated_roi ?? 0).toFixed(1)}x</span></div>
              <div><span className="text-muted-foreground">Timeline:</span>{" "}<span className="text-foreground">{(strategyPayload as Record<string, any>)?.implementation_timeline ?? "N/A"}</span></div>
              <div><span className="text-muted-foreground">Complexity:</span>{" "}<span className="text-foreground">{(strategyPayload as Record<string, any>)?.implementation_complexity ?? "N/A"}</span></div>
            </div>
          </div>
          <div className="bg-secondary/40 rounded-lg p-3 border border-border space-y-2">
            <p className="font-semibold text-foreground">Decision Reasoning</p>
            <p className="text-muted-foreground">{(decisionPayload as Record<string, any>)?.decision_reasoning ?? "N/A"}</p>
            <p className="font-semibold text-foreground mt-2">Reflection Verdict</p>
            <p className="text-muted-foreground">{reflectionPayload?.audit_summary ?? "N/A"}</p>
          </div>
        </div>
      </section>

      {/* ── Interactive Review Actions ─────────────────────────────────── */}
      {!isDecisionMade && (
        <section className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <h4 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-2">
            Reviewer Identity & Action
          </h4>

          {/* Reviewer fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Reviewer Name / ID</label>
              <input type="text" value={reviewer} onChange={e => setReviewer(e.target.value)}
                placeholder="John Smith, VP Operations"
                className="w-full text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Business Owner</label>
              <input type="text" value={businessOwner} onChange={e => setBusinessOwner(e.target.value)}
                placeholder="IT Department, Finance Team"
                className="w-full text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)}
                className="w-full text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none focus:border-primary">
                {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Action tabs */}
          <div className="flex border-b border-border text-xs mb-4">
            {([
              { key: "approve" as const,  label: "Approve",  color: "emerald" },
              { key: "modify" as const,   label: "Modify",   color: "yellow"  },
              { key: "escalate" as const, label: "Escalate", color: "purple"  },
              { key: "reject" as const,   label: "Reject",   color: "rose"    },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveAction(tab.key)}
                className={`px-4 py-2.5 border-b-2 font-bold transition ${
                  activeAction === tab.key ? `border-${tab.color}-500 text-${tab.color}-600` : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={activeAction === tab.key ? { borderBottomColor: tab.color === "emerald" ? "#10b981" : tab.color === "yellow" ? "#f59e0b" : tab.color === "purple" ? "#8b5cf6" : "#ef4444", color: tab.color === "emerald" ? "#059669" : tab.color === "yellow" ? "#d97706" : tab.color === "purple" ? "#7c3aed" : "#dc2626" } : {}}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Approve panel */}
          {activeAction === "approve" && (
            <div className="space-y-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Approval Comments (min 10 characters)</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Provide detailed justification for approving this strategy..."
                  className="w-full h-20 text-xs bg-white border border-emerald-200 p-2.5 rounded-lg text-foreground outline-none resize-none focus:border-emerald-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Approval Reason</label>
                  <input type="text" value={approvalReason} onChange={e => setApprovalReason(e.target.value)}
                    placeholder="All validation criteria met."
                    className="w-full text-xs bg-white border border-emerald-200 p-2.5 rounded-lg text-foreground outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Approval Confidence: {(approvalConfidence * 100).toFixed(0)}%
                  </label>
                  <input type="range" min="0" max="1" step="0.05" value={approvalConfidence}
                    onChange={e => setApprovalConfidence(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-600" />
                </div>
              </div>
              <button onClick={handleSubmitApproval} disabled={submitting || !reviewer.trim() || approvalComments.length < 10 || !businessOwner.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? "Submitting..." : "Submit Approval"}
              </button>
            </div>
          )}

          {/* Modify panel */}
          {activeAction === "modify" && (
            <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Modification Comments (min 10 characters)</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Describe why modifications are needed..."
                  className="w-full h-20 text-xs bg-white border border-amber-200 p-2.5 rounded-lg text-foreground outline-none resize-none focus:border-amber-400" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Modified Sections (Before → After)</span>
                  <button onClick={addModifiedSection} className="text-[10px] text-amber-600 hover:text-amber-700 font-semibold">+ Add Section</button>
                </div>
                {modifiedSections.map((mod, idx) => (
                  <div key={idx} className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <input type="text" value={mod.section} onChange={e => updateModifiedSection(idx, "section", e.target.value)}
                        placeholder="Section name (e.g., strategy.timeline)"
                        className="flex-1 text-xs bg-background border border-border p-2 rounded text-foreground outline-none mr-2 focus:border-primary" />
                      {modifiedSections.length > 1 && (
                        <button onClick={() => removeModifiedSection(idx)} className="text-[10px] text-status-error hover:text-red-700">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={mod.before} onChange={e => updateModifiedSection(idx, "before", e.target.value)}
                        placeholder="Original value"
                        className="text-xs bg-status-error-bg border border-status-error/20 p-2 rounded text-foreground outline-none focus:border-status-error" />
                      <input type="text" value={mod.after} onChange={e => updateModifiedSection(idx, "after", e.target.value)}
                        placeholder="New value"
                        className="text-xs bg-status-success-bg border border-status-success/20 p-2 rounded text-foreground outline-none focus:border-status-success" />
                    </div>
                    <input type="text" value={mod.change_reason} onChange={e => updateModifiedSection(idx, "change_reason", e.target.value)}
                      placeholder="Reason for change"
                      className="w-full text-xs bg-background border border-border p-2 rounded text-foreground outline-none focus:border-primary" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Confidence in Modified Strategy: {(approvalConfidence * 100).toFixed(0)}%
                </label>
                <input type="range" min="0" max="1" step="0.05" value={approvalConfidence}
                  onChange={e => setApprovalConfidence(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-primary" />
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
            <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Escalate To</label>
                  <select value={escalatedTo} onChange={e => setEscalatedTo(e.target.value)}
                    className="w-full text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none focus:border-primary">
                    {ESCALATION_TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Escalation Reason (min 10 characters)</label>
                  <input type="text" value={escalationReason} onChange={e => setEscalationReason(e.target.value)}
                    placeholder="Why does this require executive review?"
                    className="w-full text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Additional Comments</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Provide context for the executive reviewer..."
                  className="w-full h-16 text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none resize-none focus:border-primary" />
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
            <div className="space-y-4 bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rejection Comments (min 10 characters)</label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Explain why this strategy is being rejected..."
                  className="w-full h-20 text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none resize-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rejection Reason</label>
                <input type="text" value={approvalReason} onChange={e => setApprovalReason(e.target.value)}
                  placeholder="Insufficient risk mitigation plan."
                  className="w-full text-xs bg-background border border-border p-2.5 rounded-lg text-foreground outline-none focus:border-primary" />
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
            <div className="bg-status-error-bg border border-status-error/20 rounded-lg p-3 mt-3">
              <p className="text-xs text-status-error font-semibold">Submission Error</p>
              <p className="text-xs text-rose-300 mt-1">{submitError}</p>
            </div>
          )}

          {/* ── Feedback Items Section ──────────────────────────────── */}
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Structured Feedback Items ({feedbackItems.length})
              </span>
              <button onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                className="text-[10px] text-primary hover:text-primary/80 font-semibold">
                {showFeedbackForm ? "Cancel" : "+ Add Feedback"}
              </button>
            </div>

            {feedbackItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-secondary/40 border border-border rounded-lg p-2.5 mb-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-bold uppercase">{item.feedback_type}</span>
                <div className="flex-1">
                  <span className="text-foreground font-semibold">{item.section}</span>
                  {item.original_value && <span className="text-rose-400 ml-2 line-through">{item.original_value}</span>}
                  {item.corrected_value && <span className="text-emerald-400 ml-2">{item.corrected_value}</span>}
                  {item.comment && <p className="text-muted-foreground mt-0.5 italic">{item.comment}</p>}
                </div>
                <button onClick={() => removeFeedbackItem(idx)} className="text-[10px] text-rose-400 hover:text-rose-300">✕</button>
              </div>
            ))}

            {showFeedbackForm && (
              <div className="bg-secondary/40 border border-border rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newFeedback.section} onChange={e => setNewFeedback(prev => ({ ...prev, section: e.target.value }))}
                    placeholder="Section (e.g., strategy.timeline)"
                    className="text-xs bg-background border border-border p-2 rounded text-foreground outline-none focus:border-primary" />
                  <select value={newFeedback.feedback_type}
                    onChange={e => setNewFeedback(prev => ({ ...prev, feedback_type: e.target.value as FeedbackItem["feedback_type"] }))}
                    className="text-xs bg-background border border-border p-2 rounded text-foreground outline-none focus:border-primary">
                    <option value="note">Note</option>
                    <option value="correction">Correction</option>
                    <option value="addition">Addition</option>
                    <option value="deletion">Deletion</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newFeedback.original_value} onChange={e => setNewFeedback(prev => ({ ...prev, original_value: e.target.value }))}
                    placeholder="Original value (optional)"
                    className="text-xs bg-background border border-border p-2 rounded text-foreground outline-none focus:border-primary" />
                  <input type="text" value={newFeedback.corrected_value} onChange={e => setNewFeedback(prev => ({ ...prev, corrected_value: e.target.value }))}
                    placeholder="Corrected value (optional)"
                    className="text-xs bg-background border border-border p-2 rounded text-foreground outline-none focus:border-primary" />
                </div>
                <input type="text" value={newFeedback.comment} onChange={e => setNewFeedback(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Comment or note"
                  className="w-full text-xs bg-background border border-border p-2 rounded text-foreground outline-none focus:border-primary" />
                <button onClick={addFeedbackItem}
                  disabled={!newFeedback.section.trim() || (!newFeedback.comment.trim() && !newFeedback.corrected_value.trim())}
                  className="text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed">
                  Add Feedback Item
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Decision Result Card ───────────────────────────────────────── */}
      {isDecisionMade && (
        <section className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Approval Decision Recorded</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {submitResult?.message ?? `Workflow has been ${finalStatus} by ${approvalPayload?.reviewer ?? "reviewer"}.`}
              </p>
            </div>
            <StatusBadge status={finalStatus} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-secondary/40 rounded-lg p-3 border border-border">
              <span className="text-muted-foreground block mb-1">Artifact ID</span>
              <span className="text-primary font-mono text-[10px] break-all">{submitResult?.artifact_id ?? approvalPayload?.workflow_report_reference ?? "N/A"}</span>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 border border-border">
              <span className="text-muted-foreground block mb-1">Learning Queue</span>
              <span className="text-violet-600 font-mono text-[10px] break-all">
                {submitResult?.learning_queue_id ? `✓ Queued: ${submitResult.learning_queue_id.slice(0, 8)}...` : "Not queued"}
              </span>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 border border-border">
              <span className="text-muted-foreground block mb-1">Governance Compliance</span>
              {submitResult?.governance_compliant !== undefined ? (
                <span className={submitResult.governance_compliant ? "text-status-success" : "text-status-error"}>
                  {submitResult.governance_compliant ? "✓ Compliant" : "✕ Non-Compliant"}
                </span>
              ) : (
                <span className="text-muted-foreground">Pending verification</span>
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
      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex border-b border-border text-xs">
          <button onClick={() => setExpandedPanel("timeline")}
            className={`px-4 py-3 border-b-2 font-bold transition ${expandedPanel === "timeline" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            Pipeline Timeline
          </button>
          <button onClick={() => setExpandedPanel("history")}
            className={`px-4 py-3 border-b-2 font-bold transition ${expandedPanel === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            Audit History ({auditHistory.length})
          </button>
        </div>

        <div className="p-4">
          {expandedPanel === "timeline" && (
            <div className="relative">
              {timeline.length === 0 ? (
                <div className="space-y-4">
                  {PIPELINE_AGENTS.map((agent, idx) => {
                    const artifactKey = `${agent.key}_artifact` as keyof WorkflowState;
                    const artifact = workflowState[artifactKey];
                    const meta = workflowState.agent_metadata?.[agent.key];
                    const isComplete = !!artifact;
                    return (
                      <div key={agent.key} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                            isComplete ? "border-status-success bg-status-success-bg text-status-success" : "border-border bg-secondary text-muted-foreground"
                          }`}>
                            {idx + 1}
                          </div>
                          {idx < PIPELINE_AGENTS.length - 1 && (
                            <div className={`w-0.5 h-8 ${isComplete ? "bg-status-success/30" : "bg-border"}`} />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-foreground">{agent.label}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              isComplete ? "bg-status-success-bg text-status-success border border-status-success/20" : "bg-secondary text-muted-foreground"
                            }`}>
                              {isComplete ? "Completed" : "Pending"}
                            </span>
                          </div>
                          {isComplete && meta && (
                            <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                              <span>Latency: <span className="text-foreground">{meta.latency_ms}ms</span></span>
                              <span>Provider: <span className="text-foreground font-mono">{meta.provider}</span></span>
                              {(artifact as Record<string, any>)?.confidence !== undefined && (
                                <span>Confidence: <span className="text-foreground">{((artifact as Record<string, any>).confidence * 100).toFixed(0)}%</span></span>
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
                          step.status === "completed" ? "border-status-success bg-status-success-bg text-status-success"
                            : step.status === "pending" ? "border-blue-400 bg-blue-50 text-blue-600 animate-pulse"
                            : "border-border bg-secondary text-muted-foreground"
                        }`}>
                          {step.step + 1}
                        </div>
                        {idx < timeline.length - 1 && (
                          <div className={`w-0.5 h-8 ${step.status === "completed" ? "bg-status-success/30" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-foreground">{step.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            step.status === "completed" ? "bg-status-success-bg text-status-success border border-status-success/20"
                              : step.status === "pending" ? "bg-blue-50 text-blue-600 border border-blue-200 animate-pulse"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                            {step.status}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                          {step.timestamp && <span>Time: <span className="text-foreground">{new Date(step.timestamp).toLocaleTimeString()}</span></span>}
                          {step.duration_ms > 0 && <span>Duration: <span className="text-foreground">{step.duration_ms}ms</span></span>}
                          {step.provider && <span>Provider: <span className="text-foreground font-mono">{step.provider}</span></span>}
                          {step.confidence > 0 && <span>Confidence: <span className="text-foreground">{(step.confidence * 100).toFixed(0)}%</span></span>}
                          {step.reviewer && <span>Reviewer: <span className="text-foreground">{step.reviewer}</span></span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {expandedPanel === "history" && (
            <div>
              {auditHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No audit history recorded yet. Submit an approval action to generate audit records.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2 pr-4">Timestamp</th>
                        <th className="pb-2 pr-4">Event Type</th>
                        <th className="pb-2 pr-4">Actor</th>
                        <th className="pb-2 pr-4">Artifact</th>
                        <th className="pb-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditHistory.map((entry) => (
                        <tr key={entry.event_id} className="border-b border-border text-foreground">
                          <td className="py-2 pr-4 text-muted-foreground font-mono text-[10px]">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              entry.event_type.includes("Granted") || entry.event_type.includes("Completed") ? "bg-status-success-bg text-status-success" :
                              entry.event_type.includes("Rejected") || entry.event_type.includes("Failed") ? "bg-status-error-bg text-status-error" :
                              entry.event_type.includes("Escalated") ? "bg-violet-100 text-violet-700" :
                              entry.event_type.includes("Modified") ? "bg-status-warning-bg text-status-warning" :
                              "bg-secondary text-muted-foreground"
                            }`}>
                              {entry.event_type}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-foreground">{entry.actor}</td>
                          <td className="py-2 pr-4 text-primary font-mono text-[10px]">{entry.artifact_id ? entry.artifact_id.slice(0, 8) + "..." : "—"}</td>
                          <td className="py-2 text-muted-foreground text-[10px] max-w-[200px] truncate">
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
      <section className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Approval Observability</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {[
            { label: "Review Time",       value: isDecisionMade ? `${Math.round((Date.now() - reviewStartTime) / 1000)}s` : "Active" },
            { label: "Reviewer",          value: approvalPayload?.reviewer || reviewer || "Unassigned" },
            { label: "Final Status",      value: finalStatus, highlight: true },
            { label: "Escalation Signals",value: String(escalationSignals.length) },
            { label: "Feedback Items",    value: String(feedbackItems.length + (approvalPayload?.feedback_items?.length ?? 0)) },
            { label: "Audit Events",      value: String(auditHistory.length) },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="bg-secondary/40 rounded-lg p-2.5 border border-border">
              <span className="text-[9px] text-muted-foreground block mb-0.5">{label}</span>
              <span className={`text-sm font-bold capitalize ${highlight
                ? finalStatus === "approved" ? "text-status-success"
                  : finalStatus === "rejected" ? "text-status-error"
                  : finalStatus === "modified" ? "text-status-warning"
                  : finalStatus === "escalated" ? "text-violet-600"
                  : "text-primary"
                : "text-foreground"}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
