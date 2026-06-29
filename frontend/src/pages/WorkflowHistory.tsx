import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import {
  RefreshCw, ChevronRight, CheckCircle2, AlertTriangle,
  Loader2, Database, ShieldCheck,
  Search, Filter, Inbox, Trash2, HardDrive, Cloud
} from "lucide-react";
import { api } from "../lib/api";
import {
  loadIndex, loadWorkflowState, deleteWorkflowState, clearAllWorkflows,
} from "../lib/workflowStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MergedEntry {
  id: string;
  source: "local" | "db" | "both";
  status: string;
  time_ago: string;
  timestamp: string;
  business_goal: string;
  top_recommendation: string;
  risk_level: string;
  confidence: number;
  trust_score: number;
  estimated_roi: number;
  selected_strategy: string;
  agents_completed: number;
  transcript_preview?: string;
  workflow_id: string;
  execution_id: string;
  has_state: boolean;
}

const TOTAL_AGENTS = 7;

function timeAgo(iso: string | null): string {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Small components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === "completed"
    ? "bg-status-success-bg text-status-success border-status-success/20"
    : s === "running"
      ? "bg-status-warning-bg text-status-warning border-status-warning/20 animate-pulse"
      : "bg-status-error-bg text-status-error border-status-error/20";
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>{status}</span>;
}

function SourceBadge({ source }: { source: MergedEntry["source"] }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${source === "local" ? "bg-secondary text-muted-foreground border-border" :
        source === "db" ? "bg-primary/8 text-primary border-primary/15" :
          "bg-status-success-bg text-status-success border-status-success/20"
      }`}>
      {source === "local" ? <HardDrive size={9} /> : <Cloud size={9} />}
      {source === "both" ? "Local + DB" : source === "local" ? "Local" : "DB"}
    </span>
  );
}

function RiskBadge({ level }: { level?: string }) {
  if (!level || level === "—" || level === "") return null;
  const cls = level === "High" ? "bg-rose-50 text-rose-600 border-rose-200"
    : level === "Medium" ? "bg-amber-50 text-amber-600 border-amber-200"
      : "bg-emerald-50 text-emerald-600 border-emerald-200";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cls}`}>{level} Risk</span>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function WorkflowHistory() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<MergedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSrc, setFilterSrc] = useState<"all" | "local" | "db">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Build merged list ──────────────────────────────────────────────────────
  const buildEntries = useCallback(async () => {
    setLoading(true);

    // 1. Local index (instant)
    const local = loadIndex();
    const localMap = new Map(local.map(e => [e.id, e]));

    // 2. DB list (async)
    let dbRuns: any[] = [];
    try { dbRuns = await api.workflows.list(); } catch { }
    const dbMap = new Map(dbRuns.map((r: any) => [r.id, r]));

    // 3. Merge: prefer local data for state loading; show both sources
    const allIds = new Set([...localMap.keys(), ...dbMap.keys()]);
    const merged: MergedEntry[] = [];

    for (const id of allIds) {
      const loc = localMap.get(id);
      const db = dbMap.get(id);
      const source: MergedEntry["source"] = loc && db ? "both" : loc ? "local" : "db";

      merged.push({
        id,
        source,
        status: db?.status ?? "Completed",
        time_ago: timeAgo(loc?.timestamp ?? db?.started_at ?? null),
        timestamp: loc?.timestamp ?? db?.started_at ?? "",
        business_goal: loc?.business_goal || db?.business_goal || "",
        top_recommendation: loc?.top_recommendation || db?.top_recommendation || "",
        risk_level: db?.risk_level || "",
        confidence: loc?.confidence ?? db?.confidence ?? 0,
        trust_score: loc?.trust_score ?? db?.trust_score ?? 0,
        estimated_roi: loc?.estimated_roi ?? db?.estimated_roi ?? 0,
        selected_strategy: loc?.selected_strategy ?? db?.selected_strategy ?? "",
        agents_completed: loc?.agents_completed ?? db?.agents_completed ?? 0,
        transcript_preview: loc?.transcript_preview ?? "",
        workflow_id: loc?.workflow_id ?? db?.workflow_id ?? id,
        execution_id: loc?.execution_id ?? db?.execution_id ?? "",
        has_state: !!loc || (db?.has_payload ?? false),
      });
    }

    // Sort newest first
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEntries(merged);
    setLoading(false);
  }, []);

  useEffect(() => { buildEntries(); }, [buildEntries]);

  // ── Open a run ─────────────────────────────────────────────────────────────
  const openRun = async (entry: MergedEntry) => {
    if (!entry.has_state) {
      alert("No stored state for this run.");
      return;
    }
    setLoadingId(entry.id);
    try {
      // Try localStorage first (instant), fall back to DB
      let state = loadWorkflowState(entry.id);
      if (!state && (entry.source === "db" || entry.source === "both")) {
        state = await api.workflows.getState(entry.id);
      }
      if (!state) throw new Error("State not found");
      navigate(`/workflows/${entry.id}`, { state: { initialData: state } });
    } catch {
      alert("Failed to load workflow state.");
    } finally {
      setLoadingId(null);
    }
  };

  // ── Delete local entry ─────────────────────────────────────────────────────
  const deleteEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteWorkflowState(id);
    setEntries(prev => prev.filter(en => en.id !== id || en.source === "db"));
    buildEntries();
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.business_goal.toLowerCase().includes(q) ||
      e.top_recommendation.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.selected_strategy.toLowerCase().includes(q);
    const matchSrc = filterSrc === "all" ||
      (filterSrc === "local" && (e.source === "local" || e.source === "both")) ||
      (filterSrc === "db" && (e.source === "db" || e.source === "both"));
    return matchSearch && matchSrc;
  });

  const completedCount = entries.filter(e => e.status.toLowerCase() === "completed").length;
  const localCount = entries.filter(e => e.source === "local" || e.source === "both").length;
  const avgTrust = entries.length
    ? (entries.reduce((s, e) => s + e.trust_score, 0) / entries.length * 100).toFixed(0)
    : "—";

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in slide-up duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Workflow History"
          description="Every workflow run is persisted locally and in the database. Click any run to reopen the full analysis."
          badge="Run History"
        />
        <div className="flex items-center gap-2 mt-1 shrink-0">
          {confirmClear ? (
            <>
              <span className="text-xs text-rose-600 font-medium">Clear all local?</span>
              <button onClick={() => { clearAllWorkflows(); buildEntries(); setConfirmClear(false); }}
                className="px-3 py-1.5 text-xs bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 text-xs border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
              <Trash2 size={13} /> Clear Local
            </button>
          )}
          <button onClick={buildEntries} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: entries.length.toString(), icon: <Database size={16} />, color: "text-primary" },
          { label: "Completed", value: completedCount.toString(), icon: <CheckCircle2 size={16} />, color: "text-status-success" },
          { label: "Stored Locally", value: localCount.toString(), icon: <HardDrive size={16} />, color: "text-violet-600" },
          { label: "Avg Trust Score", value: `${avgTrust}%`, icon: <ShieldCheck size={16} />, color: "text-blue-600" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-card-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={color}>{icon}</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Storage legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><HardDrive size={12} className="text-violet-500" /><span>Local = stored in browser localStorage (instant load)</span></div>
        <div className="flex items-center gap-1.5"><Cloud size={12} className="text-sky-500" /><span>DB = persisted to PostgreSQL (survives browser clear)</span></div>
        <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /><span>Both = full redundancy</span></div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by goal, recommendation, strategy, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {(["all", "local", "db"] as const).map(f => (
            <button key={f} onClick={() => setFilterSrc(f)}
              className={`px-3 py-2 text-xs rounded-lg border font-medium transition-colors capitalize ${filterSrc === f ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-secondary"
                }`}>
              {f === "all" ? "All" : f === "local" ? "Local" : "Database"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin mb-3" size={28} />
          <p className="text-sm">Loading workflow history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
          <Inbox size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">{entries.length === 0 ? "No workflow runs yet" : "No runs match your filter"}</p>
          <p className="text-xs mt-1">{entries.length === 0 ? "Run a workflow to see it here." : "Try adjusting your search."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const pct = Math.round((entry.agents_completed / TOTAL_AGENTS) * 100);
            const isLoading = loadingId === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => openRun(entry)}
                className={`bg-card border border-border rounded-2xl p-5 shadow-card transition-all duration-200 group ${entry.has_state ? "hover:border-primary/30 hover:shadow-card-md hover:-translate-y-0.5 cursor-pointer" : "opacity-55 cursor-not-allowed"
                  }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge status={entry.status} />
                      <SourceBadge source={entry.source} />
                      <RiskBadge level={entry.risk_level} />
                      <span className="text-xs text-muted-foreground font-mono ml-auto">{entry.time_ago}</span>
                    </div>

                    {entry.business_goal ? (
                      <p className="font-semibold text-foreground text-sm mb-1 truncate">{entry.business_goal}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mb-1 truncate">{entry.transcript_preview || "No preview available"}...</p>
                    )}

                    {entry.top_recommendation && (
                      <p className="text-xs text-muted-foreground truncate">
                        Top action: <span className="font-medium text-foreground">{entry.top_recommendation}</span>
                      </p>
                    )}
                    {entry.selected_strategy && entry.selected_strategy !== "—" && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Strategy: <span className="font-medium text-foreground">{entry.selected_strategy}</span>
                      </p>
                    )}

                    {/* Agent progress */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{entry.agents_completed}/{TOTAL_AGENTS} agents</span>
                    </div>
                  </div>

                  {/* Right: metrics */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {entry.trust_score > 0 && (
                      <div className="text-center">
                        <div className="text-sm font-bold text-foreground">{(entry.trust_score * 100).toFixed(0)}%</div>
                        <div className="text-[10px] text-muted-foreground">Trust</div>
                      </div>
                    )}
                    {entry.confidence > 0 && (
                      <div className="text-center">
                        <div className="text-sm font-bold text-foreground">{(entry.confidence * 100).toFixed(0)}%</div>
                        <div className="text-[10px] text-muted-foreground">Confidence</div>
                      </div>
                    )}
                    {entry.estimated_roi > 0 && (
                      <div className="text-center">
                        <div className="text-sm font-bold text-status-success">${(entry.estimated_roi / 1000).toFixed(0)}K</div>
                        <div className="text-[10px] text-muted-foreground">Est. ROI</div>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {/* Delete local */}
                      {(entry.source === "local" || entry.source === "both") && (
                        <button
                          onClick={e => deleteEntry(e, entry.id)}
                          className="p-1 text-muted-foreground/40 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from local storage"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin text-primary" />
                      ) : entry.has_state ? (
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      ) : (
                        <AlertTriangle size={14} className="text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground/50">
                  <span>Run: {entry.id.substring(0, 18)}...</span>
                  {entry.execution_id && <span>Exec: {entry.execution_id}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

