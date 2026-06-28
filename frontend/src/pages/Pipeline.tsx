import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutTemplate, Search, BrainCircuit, Route, ShieldCheck,
  Handshake, Sparkles, Play, ZoomIn, ZoomOut, Maximize2,
  X, ChevronDown, ChevronUp, Activity, Cpu, Database,
  ArrowRight, CheckCircle2, Clock, Settings, RotateCcw
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number; }
type NodeStatus = "idle" | "queued" | "running" | "done" | "error";

interface AgentNode {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  accent: string;        // hex colour
  bg: string;            // light bg hex
  position: Pt;
  status: NodeStatus;
  provider: string;
  enabled: boolean;
  description: string;
  inputs: string[];
  outputs: string[];
  latencyMs?: number;
  confidence?: number;
  tokenCount?: number;
}

interface Edge { from: string; to: string; }

// ── Data ──────────────────────────────────────────────────────────────────────
const NODE_W = 200;
const NODE_H = 92;
const PROVIDERS = ["groq", "gemini", "grok", "mock", "human"];

const INITIAL_NODES: AgentNode[] = [
  {
    id: "context", label: "Context Intelligence", sublabel: "Extraction Layer",
    icon: <LayoutTemplate size={16} />, accent: "#10b981", bg: "#f0fdf4",
    position: { x: 60,  y: 220 }, status: "idle", provider: "groq", enabled: true,
    description: "Parses raw customer interactions. Extracts stakeholders, pain points, intent, buying stage, and business goals using LLM reasoning.",
    inputs: ["transcript"], outputs: ["context_artifact"],
  },
  {
    id: "knowledge", label: "Knowledge Intelligence", sublabel: "Retrieval Layer",
    icon: <Search size={16} />, accent: "#0ea5e9", bg: "#f0f9ff",
    position: { x: 320, y: 80  }, status: "idle", provider: "groq", enabled: true,
    description: "Hybrid vector + keyword search across the enterprise knowledge base. Retrieves playbooks, SOPs, and historical cases as grounded evidence.",
    inputs: ["context_artifact"], outputs: ["knowledge_artifact"],
  },
  {
    id: "decision", label: "Decision Intelligence", sublabel: "Reasoning Layer",
    icon: <BrainCircuit size={16} />, accent: "#f59e0b", bg: "#fffbeb",
    position: { x: 580, y: 220 }, status: "idle", provider: "groq", enabled: true,
    description: "Business reasoning engine producing ranked next-best-actions with opportunity scores, risk scores, and full traceable evidence links.",
    inputs: ["context_artifact", "knowledge_artifact"], outputs: ["decision_artifact"],
  },
  {
    id: "strategy", label: "Strategy Intelligence", sublabel: "Planning Layer",
    icon: <Route size={16} />, accent: "#8b5cf6", bg: "#faf5ff",
    position: { x: 840, y: 80  }, status: "idle", provider: "groq", enabled: true,
    description: "3-scenario simulation engine (optimistic / realistic / conservative). Selects optimal path and generates phased roadmap with ROI projections.",
    inputs: ["decision_artifact"], outputs: ["strategy_artifact"],
  },
  {
    id: "reflection", label: "AI Governance", sublabel: "Audit Layer",
    icon: <ShieldCheck size={16} />, accent: "#3b82f6", bg: "#eff6ff",
    position: { x: 1100, y: 220 }, status: "idle", provider: "mock", enabled: true,
    description: "Hallucination detection, consistency checks, evidence coverage audit, and governance scoring. Computes a trust score before human review.",
    inputs: ["strategy_artifact", "decision_artifact", "knowledge_artifact"], outputs: ["reflection_artifact"],
  },
  {
    id: "approval", label: "Human-in-the-Loop", sublabel: "Governance Gate",
    icon: <Handshake size={16} />, accent: "#ef4444", bg: "#fff1f2",
    position: { x: 1100, y: 400 }, status: "idle", provider: "human", enabled: true,
    description: "Human reviewer approves, modifies, escalates, or rejects the AI strategy. Captures structured feedback for the learning engine.",
    inputs: ["reflection_artifact"], outputs: ["approval_artifact"],
  },
  {
    id: "learning", label: "Organizational Learning", sublabel: "Memory Layer",
    icon: <Sparkles size={16} />, accent: "#f97316", bg: "#fff7ed",
    position: { x: 840, y: 400 }, status: "idle", provider: "mock", enabled: true,
    description: "Indexes decision patterns into organizational memory. Continuously improves future retrieval quality, prompts, and recommendation accuracy.",
    inputs: ["approval_artifact"], outputs: ["learning_artifact"],
  },
];

const EDGES: Edge[] = [
  { from: "context",    to: "knowledge"  },
  { from: "context",    to: "decision"   },
  { from: "knowledge",  to: "decision"   },
  { from: "decision",   to: "strategy"   },
  { from: "strategy",   to: "reflection" },
  { from: "knowledge",  to: "reflection" },
  { from: "decision",   to: "reflection" },
  { from: "reflection", to: "approval"   },
  { from: "approval",   to: "learning"   },
];

// Execution order for simulation
const EXEC_ORDER = ["context","knowledge","decision","strategy","reflection","approval","learning"];
const EXEC_LATENCIES = [820, 1240, 1680, 1950, 760, 0, 540]; // ms per agent (0 = manual)

// ── SVG helpers ───────────────────────────────────────────────────────────────
function nodeCenter(n: AgentNode): Pt {
  return { x: n.position.x + NODE_W / 2, y: n.position.y + NODE_H / 2 };
}

function edgePath(from: Pt, to: Pt): string {
  const mx = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`;
}

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_DOT: Record<NodeStatus, { bg: string; pulse: boolean; label: string }> = {
  idle:    { bg: "#cbd5e1", pulse: false, label: "Idle"    },
  queued:  { bg: "#fbbf24", pulse: true,  label: "Queued"  },
  running: { bg: "#f59e0b", pulse: true,  label: "Running" },
  done:    { bg: "#22c55e", pulse: false, label: "Done"    },
  error:   { bg: "#ef4444", pulse: false, label: "Error"   },
};

function StatusPill({ status }: { status: NodeStatus }) {
  const s = STATUS_DOT[status];
  return (
    <span className="flex items-center gap-1">
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${s.pulse ? "animate-pulse" : ""}`}
        style={{ background: s.bg }}
      />
      <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: s.bg }}>
        {s.label}
      </span>
    </span>
  );
}

// ── Node card (light) ─────────────────────────────────────────────────────────
interface NodeCardProps {
  node: AgentNode;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onSelect: (id: string) => void;
}

function NodeCard({ node, selected, onPointerDown, onSelect }: NodeCardProps) {
  const borderCol = selected ? node.accent : "#e2e8f0";
  const shadowStr = selected
    ? `0 0 0 2px ${node.accent}40, 0 4px 20px ${node.accent}25`
    : "0 2px 8px rgba(0,0,0,0.08)";
  const opacity   = node.enabled ? 1 : 0.45;

  return (
    <g
      transform={`translate(${node.position.x},${node.position.y})`}
      style={{ cursor: "grab", opacity }}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, node.id); }}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
    >
      {/* Drop shadow */}
      <rect x={2} y={4} width={NODE_W} height={NODE_H} rx={12}
        fill="rgba(0,0,0,0.07)" />

      {/* Card background */}
      <rect width={NODE_W} height={NODE_H} rx={12}
        fill="white"
        stroke={borderCol}
        strokeWidth={selected ? 2 : 1}
      />

      {/* Top colour bar */}
      <rect width={NODE_W} height={4} rx={12} fill={node.accent} />
      <rect y={4} width={NODE_W} height={8} fill={node.accent} opacity={0.12} />

      {/* Disabled stripe */}
      {!node.enabled && (
        <rect width={NODE_W} height={NODE_H} rx={12}
          fill="white" opacity={0.5} />
      )}

      {/* Content */}
      <foreignObject x={0} y={0} width={NODE_W} height={NODE_H}>
        <div
          // @ts-ignore
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            height: NODE_H, padding: "14px 12px 10px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            pointerEvents: "none", boxSizing: "border-box",
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: node.bg, border: `1px solid ${node.accent}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: node.accent,
            }}>
              {node.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "#0f172a",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {node.label}
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {node.sublabel}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{
              fontSize: 9, background: node.bg, border: `1px solid ${node.accent}25`,
              borderRadius: 4, padding: "1px 6px", color: node.accent,
              fontWeight: 600, fontFamily: "monospace", textTransform: "uppercase",
            }}>
              {node.provider}
            </div>
            <StatusPill status={node.status} />
            {node.latencyMs != null && node.status === "done" && (
              <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>
                {node.latencyMs}ms
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

// ── Config Panel (light) ──────────────────────────────────────────────────────
function ConfigPanel({
  node, onClose, onUpdate,
}: { node: AgentNode; onClose: () => void; onUpdate: (id: string, p: Partial<AgentNode>) => void }) {
  return (
    <div className="absolute right-0 top-0 h-full w-72 bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
        style={{ borderTop: `3px solid ${node.accent}` }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: node.bg, color: node.accent }}>
            {node.icon}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{node.label}</p>
            <p className="text-[10px] text-slate-400">{node.sublabel}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
          <span className="text-xs text-slate-500 font-medium">Status</span>
          <StatusPill status={node.status} />
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
          <p className="text-xs text-slate-600 leading-relaxed">{node.description}</p>
        </div>

        {/* Provider */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">LLM Provider</label>
          <select
            value={node.provider}
            onChange={(e) => onUpdate(node.id, { provider: e.target.value })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-slate-400 transition-colors"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700">Agent Enabled</p>
            <p className="text-[10px] text-slate-400">Disable to skip in pipeline</p>
          </div>
          <button
            onClick={() => onUpdate(node.id, { enabled: !node.enabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${node.enabled ? "bg-emerald-500" : "bg-slate-200"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${node.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* I/O chips */}
        <div className="grid grid-cols-2 gap-3">
          {[{ label: "Inputs", items: node.inputs }, { label: "Outputs", items: node.outputs }].map(({ label, items }) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item} className="text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono text-slate-600 truncate">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Metrics (when done) */}
        {node.status === "done" && (
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Run Metrics</p>
            {node.latencyMs != null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Latency</span>
                <span className="font-mono font-bold text-slate-700">{node.latencyMs}ms</span>
              </div>
            )}
            {node.confidence != null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Confidence</span>
                <span className="font-mono font-bold text-slate-700">{(node.confidence * 100).toFixed(0)}%</span>
              </div>
            )}
            {node.tokenCount != null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Tokens</span>
                <span className="font-mono font-bold text-slate-700">{node.tokenCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats sidebar ─────────────────────────────────────────────────────────────
function StatsSidebar({ nodes, simulating }: { nodes: AgentNode[]; simulating: boolean }) {
  const done    = nodes.filter(n => n.status === "done").length;
  const total   = nodes.length;
  const enabled = nodes.filter(n => n.enabled).length;
  const avgConf = nodes.filter(n => n.confidence != null)
    .reduce((s, n) => s + (n.confidence ?? 0), 0) / Math.max(1, nodes.filter(n => n.confidence != null).length);
  const totalMs = nodes.reduce((s, n) => s + (n.latencyMs ?? 0), 0);

  return (
    <div className="w-52 bg-white border-r border-slate-200 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-700">Pipeline Stats</p>
      </div>
      <div className="p-4 space-y-4 flex-1">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Completion</span>
            <span className="font-bold text-slate-700">{done}/{total}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>

        {/* Stats */}
        {[
          { label: "Agents Active", value: `${enabled}/${total}`, icon: <Cpu size={12} /> },
          { label: "Avg Confidence", value: avgConf > 0 ? `${(avgConf * 100).toFixed(0)}%` : "—", icon: <Activity size={12} /> },
          { label: "Total Latency", value: totalMs > 0 ? `${(totalMs / 1000).toFixed(1)}s` : "—", icon: <Clock size={12} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-500">
              {icon}
              <span className="text-[11px]">{label}</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{value}</span>
          </div>
        ))}

        <div className="border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Agent Status</p>
          {nodes.map((n) => (
            <div key={n.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: n.accent + "40", border: `1px solid ${n.accent}60` }} />
                <span className="text-[10px] text-slate-600 truncate max-w-[90px]">{n.label.split(" ")[0]}</span>
              </div>
              <StatusPill status={n.status} />
            </div>
          ))}
        </div>
      </div>

      {simulating && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] text-amber-600 font-semibold">Simulating...</span>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Pipeline() {
  const navigate  = useNavigate();
  const svgRef    = useRef<SVGSVGElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  const [nodes,      setNodes]      = useState<AgentNode[]>(INITIAL_NODES);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [dragging,   setDragging]   = useState<{ id: string; sm: Pt; sp: Pt } | null>(null);
  const [vb,         setVb]         = useState({ x: -60, y: -30, w: 1400, h: 560 });
  const [panning,    setPanning]    = useState(false);
  const [panStart,   setPanStart]   = useState<Pt>({ x: 0, y: 0 });
  const [simulating, setSimulating] = useState(false);

  const selectedNode = nodes.find(n => n.id === selected) ?? null;
  const updateNode = useCallback((id: string, patch: Partial<AgentNode>) => {
    setNodes(p => p.map(n => n.id === id ? { ...n, ...patch } : n));
  }, []);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onNodePD = useCallback((e: React.PointerEvent, id: string) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const node = nodes.find(n => n.id === id)!;
    setDragging({ id, sm: { x: e.clientX, y: e.clientY }, sp: { ...node.position } });
    setSelected(id);
  }, [nodes]);

  const toSvg = useCallback((cx: number, cy: number): Pt => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return { x: cx, y: cy };
    return {
      x: (cx - r.left) * (vb.w / r.width)  + vb.x,
      y: (cy - r.top)  * (vb.h / r.height) + vb.y,
    };
  }, [vb]);

  const onPM = useCallback((e: React.PointerEvent) => {
    const W = wrapRef.current?.offsetWidth  ?? 1;
    const H = wrapRef.current?.offsetHeight ?? 1;
    if (dragging) {
      const dx = (e.clientX - dragging.sm.x) * (vb.w / W);
      const dy = (e.clientY - dragging.sm.y) * (vb.h / H);
      setNodes(p => p.map(n => n.id === dragging.id
        ? { ...n, position: { x: dragging.sp.x + dx, y: dragging.sp.y + dy } }
        : n));
    }
    if (panning) {
      const dx = (e.clientX - panStart.x) * (vb.w / W);
      const dy = (e.clientY - panStart.y) * (vb.h / H);
      setVb(v => ({ ...v, x: v.x - dx, y: v.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, panning, panStart, vb]);

  const onPU = useCallback(() => { setDragging(null); setPanning(false); }, []);

  const onSvgPD = useCallback((e: React.PointerEvent) => {
    if (e.target === svgRef.current) {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelected(null);
    }
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const f = e.deltaY > 0 ? 1.1 : 0.92;
    const pt = toSvg(e.clientX, e.clientY);
    setVb(v => ({
      x: pt.x - (pt.x - v.x) * f,
      y: pt.y - (pt.y - v.y) * f,
      w: v.w * f, h: v.h * f,
    }));
  }, [toSvg]);

  const zoom = (f: number) => {
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    setVb(v => ({ x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w: v.w * f, h: v.h * f }));
  };
  const fitView = () => setVb({ x: -60, y: -30, w: 1400, h: 560 });

  // ── Simulation run ────────────────────────────────────────────────────────
  const runSimulation = async () => {
    if (simulating) return;
    // reset
    setNodes(p => p.map(n => ({ ...n, status: "idle", latencyMs: undefined, confidence: undefined, tokenCount: undefined })));
    setSimulating(true);
    const confs   = [0.94, 0.87, 0.91, 0.88, 0.96, 0, 0.83];
    const tokens  = [1240, 890, 2180, 2640, 980, 0, 620];
    for (let i = 0; i < EXEC_ORDER.length; i++) {
      const id  = EXEC_ORDER[i];
      const ms  = EXEC_LATENCIES[i];
      if (!nodes.find(n => n.id === id)?.enabled) continue;
      if (ms === 0) {
        setNodes(p => p.map(n => n.id === id ? { ...n, status: "queued" } : n));
        await new Promise(r => setTimeout(r, 600));
        setNodes(p => p.map(n => n.id === id ? { ...n, status: "done", latencyMs: 0, confidence: confs[i], tokenCount: 0 } : n));
        continue;
      }
      setNodes(p => p.map(n => n.id === id ? { ...n, status: "running" } : n));
      await new Promise(r => setTimeout(r, ms));
      setNodes(p => p.map(n => n.id === id
        ? { ...n, status: "done", latencyMs: ms + Math.round(Math.random() * 80 - 40), confidence: confs[i], tokenCount: tokens[i] }
        : n));
    }
    setSimulating(false);
  };

  const resetSim = () => {
    setNodes(p => p.map(n => ({ ...n, status: "idle", latencyMs: undefined, confidence: undefined, tokenCount: undefined })));
    setSimulating(false);
  };

  // ── Edge colour ───────────────────────────────────────────────────────────
  const edgeAccent = (fromId: string) =>
    nodes.find(n => n.id === fromId)?.accent ?? "#cbd5e1";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] animate-in fade-in duration-300">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Pipeline Canvas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Drag nodes · scroll to zoom · click to configure · simulate execution</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetSim} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors">
            <RotateCcw size={13} /> Reset
          </button>
          <button
            onClick={runSimulation}
            disabled={simulating}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${simulating ? "bg-amber-100 text-amber-700 cursor-wait" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
          >
            {simulating ? <><Activity size={14} className="animate-pulse" /> Running...</> : <><Play size={14} /> Simulate Run</>}
          </button>
          <button
            onClick={() => navigate("/workflows")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm"
          >
            <ArrowRight size={14} /> Run Live
          </button>
        </div>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <StatsSidebar nodes={nodes} simulating={simulating} />

        <div className="relative flex-1 overflow-hidden">
          {/* Zoom toolbar */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-1 shadow-sm">
            <button onClick={() => zoom(0.85)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Zoom in"><ZoomIn size={13} /></button>
            <button onClick={() => zoom(1.15)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Zoom out"><ZoomOut size={13} /></button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button onClick={fitView} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Fit"><Maximize2 size={13} /></button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-20 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm flex items-center gap-3">
            {Object.entries(STATUS_DOT).filter(([k]) => k !== "queued").map(([, v]) => (
              <div key={v.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: v.bg }} />
                <span className="text-[10px] text-slate-500">{v.label}</span>
              </div>
            ))}
          </div>

          {/* Active count */}
          <div className="absolute top-3 right-3 z-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-500 shadow-sm font-mono">
            {nodes.filter(n => n.enabled).length}/{nodes.length} active
          </div>

          {/* SVG Canvas */}
          <div ref={wrapRef} className="w-full h-full">
            <svg
              ref={svgRef}
              className="w-full h-full select-none"
              viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              onPointerDown={onSvgPD}
              onPointerMove={onPM}
              onPointerUp={onPU}
              onWheel={onWheel}
              style={{ cursor: panning ? "grabbing" : "default", background: "white" }}
            >
              <defs>
                {/* Light dot grid */}
                <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.9" fill="#e2e8f0" />
                </pattern>
                {/* Arrowhead per node colour */}
                {INITIAL_NODES.map(n => (
                  <marker key={n.id} id={`arrow-${n.id}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0,8 3,0 6" fill={n.accent} opacity="0.7" />
                  </marker>
                ))}
              </defs>

              {/* Background */}
              <rect x={vb.x - 400} y={vb.y - 400} width={vb.w + 800} height={vb.h + 800} fill="url(#dots)" />

              {/* Edges */}
              {EDGES.map(edge => {
                const fn = nodes.find(n => n.id === edge.from);
                const tn = nodes.find(n => n.id === edge.to);
                if (!fn || !tn) return null;
                const disabled = !fn.enabled || !tn.enabled;
                const active   = fn.status === "running" || fn.status === "done";
                const from = nodeCenter(fn);
                const to   = nodeCenter(tn);
                return (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={edgePath(from, to)}
                    fill="none"
                    stroke={disabled ? "#e2e8f0" : edgeAccent(edge.from)}
                    strokeWidth={active && !disabled ? 2 : 1.5}
                    strokeOpacity={disabled ? 0.4 : active ? 0.75 : 0.35}
                    strokeDasharray={disabled ? "6 4" : undefined}
                    markerEnd={disabled ? undefined : `url(#arrow-${edge.from})`}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  selected={selected === node.id}
                  onPointerDown={onNodePD}
                  onSelect={setSelected}
                />
              ))}
            </svg>
          </div>

          {/* Config panel */}
          {selectedNode && (
            <ConfigPanel node={selectedNode} onClose={() => setSelected(null)} onUpdate={updateNode} />
          )}
        </div>
      </div>
    </div>
  );
}
