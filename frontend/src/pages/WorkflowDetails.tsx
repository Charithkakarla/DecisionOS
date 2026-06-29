import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft, PlayCircle, Workflow, Database, BrainCircuit,
    Target, BookOpen, ShieldCheck, Zap, Cpu, Sliders,
    ShieldAlert, GaugeCircle, FileText, Search, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WorkflowState } from "../types/agent";
import { api } from "../lib/api";
import { useWorkflowTab } from "../lib/workflowTabContext";
import type { TabId } from "../lib/workflowTabContext";
import DecisionDashboard from "../components/DecisionDashboard";
import StrategyDashboard from "../components/StrategyDashboard";
import ReflectionDashboard from "../components/ReflectionDashboard";
import ApprovalDashboard from "../components/ApprovalDashboard";
import LearningDashboard from "../components/LearningDashboard";
import KnowledgeDashboard from "../components/KnowledgeDashboard";
import DecisionReadiness from "../components/DecisionReadiness";
import DevilsAdvocate from "../components/DevilsAdvocate";
import WhatIfSimulator from "../components/WhatIfSimulator";
import ExecutiveReport from "../components/ExecutiveReport";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const TAB_META: Record<TabId, { label: string; icon: React.ReactNode }> = {
    context: { label: "Context", icon: <Cpu size={15} /> },
    readiness: { label: "Readiness", icon: <GaugeCircle size={15} /> },
    knowledge: { label: "Knowledge", icon: <Database size={15} /> },
    decision: { label: "Decision", icon: <BrainCircuit size={15} /> },
    advocate: { label: "Devil's Advocate", icon: <ShieldAlert size={15} /> },
    simulator: { label: "What-If", icon: <Sliders size={15} /> },
    strategy: { label: "Strategy", icon: <Target size={15} /> },
    reflection: { label: "Reflection", icon: <BookOpen size={15} /> },
    approval: { label: "Approval", icon: <ShieldCheck size={15} /> },
    learning: { label: "Learning", icon: <Zap size={15} /> },
    report: { label: "Report", icon: <FileText size={15} /> },
};

function fmt(v?: number | null): string {
    if (typeof v !== "number" || Number.isNaN(v)) return "—";
    return `${Math.round(v <= 1 ? v * 100 : v)}%`;
}

function EmptyTab({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[260px] rounded-md border-2 border-dashed border-border bg-secondary/30">
            <Workflow size={28} className="mb-3 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">No {label} data</p>
            <p className="text-xs text-muted-foreground/60 mt-1 text-center max-w-xs">The {label} agent did not produce output for this run.</p>
        </div>
    );
}

function MetricsRow({ ws }: { ws: WorkflowState }) {
    const d = ws.decision_artifact?.payload;
    const s = ws.strategy_artifact?.payload;
    const r = ws.reflection_artifact?.payload;
    const a = ws.approval_artifact?.payload;
    const readiness = d?.analysis?.decision_readiness ?? d?.business_scores?.decision_readiness ?? 0;
    const confidence = r?.overall_confidence ?? d?.confidence?.overall_confidence ?? a?.approval_confidence ?? 0;
    const bv = d?.analysis?.business_value_score ?? d?.business_scores?.business_value_score ?? 0;
    const risk = d?.analysis?.risk_score ?? d?.business_scores?.risk_score ?? 0;
    const roi = s?.estimated_roi ?? 0;
    const circ = 2 * Math.PI * 28;
    const cards = [
        { label: "Decision Readiness", big: fmt(readiness), sub: readiness >= 0.75 ? "Ready" : "Needs review", dot: "bg-primary", ring: true, pct: readiness },
        { label: "Overall Confidence", big: fmt(confidence), sub: confidence >= 0.85 ? "Very High" : "Stable", dot: "bg-primary", ring: false, pct: 0 },
        { label: "Business Value", big: bv >= 0.75 ? "High" : bv >= 0.5 ? "Medium" : "Low", sub: "Impact tier", dot: "bg-primary", ring: false, pct: 0 },
        { label: "Risk Level", big: risk >= 0.7 ? "Low" : risk >= 0.4 ? "Medium" : "High", sub: "Risk assessment", dot: "bg-primary", ring: false, pct: 0 },
        { label: "Est. ROI", big: roi ? `${roi.toFixed(1)}%` : "—", sub: "12–18 months", dot: "bg-status-warning", ring: false, pct: 0 },
    ];
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {cards.map((m, i) => (
                <div key={m.label} className="bg-card border border-border rounded-md p-4 shadow-card flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</p>
                        <span className={`w-2 h-2 rounded-sm shrink-0 ${m.dot}`} />
                    </div>
                    {i === 0 ? (
                        <div className="flex items-center gap-3 mt-1">
                            <div className="relative w-14 h-14 shrink-0">
                                <svg viewBox="0 0 64 64" className="w-14 h-14 -rotate-90">
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(214 16% 88%)" strokeWidth="5" />
                                    <motion.circle cx="32" cy="32" r="28" fill="none" stroke="hsl(213 94% 28%)" strokeWidth="5" strokeLinecap="round"
                                        initial={{ strokeDasharray: `0 ${circ}` }}
                                        animate={{ strokeDasharray: `${m.pct * circ} ${circ}` }}
                                        transition={{ duration: 1, ease: "easeOut" }} />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{m.big}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{m.sub}</p>
                        </div>
                    ) : (
                        <div className="mt-1">
                            <p className="text-[22px] font-bold text-foreground leading-tight">{m.big}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function WorkflowSnapshot({ ws }: { ws: WorkflowState }) {
    const d = ws.decision_artifact?.payload;
    const s = ws.strategy_artifact?.payload;
    const r = ws.reflection_artifact?.payload;
    const a = ws.approval_artifact?.payload;
    const done = [ws.context_artifact, ws.knowledge_artifact, ws.decision_artifact, ws.strategy_artifact, ws.reflection_artifact, ws.approval_artifact, ws.learning_artifact].filter(Boolean).length;
    const pct = Math.round((done / 7) * 100);
    const readiness = d?.analysis?.decision_readiness ?? d?.business_scores?.decision_readiness ?? 0;
    const confidence = r?.overall_confidence ?? d?.confidence?.overall_confidence ?? a?.approval_confidence ?? 0;
    const risk = d?.analysis?.risk_score ?? d?.business_scores?.risk_score ?? 0;
    const roi = s?.estimated_roi ?? 0;
    const words = ws.transcript?.trim().split(/\s+/).length ?? 0;
    return (
        <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="bg-card border border-border rounded-md p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground uppercase">Workflow Snapshot</p>
                    <span className="text-xs font-semibold text-primary bg-primary/8 border border-primary/15 px-2 py-0.5 rounded">{pct}%</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {([
                        { label: "Readiness", value: fmt(readiness), color: "bg-status-success" },
                        { label: "Confidence", value: fmt(confidence), color: "bg-primary" },
                        { label: "Risk", value: fmt(risk), color: "bg-status-error" },
                        { label: "ROI", value: roi ? `${roi.toFixed(1)}%` : "—", color: "bg-status-warning" }
                    ] as const).map(m => (
                        <div key={m.label}>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{m.label}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-sm shrink-0 ${m.color}`} />
                                <p className="text-sm font-bold text-foreground">{m.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="space-y-1.5">
                    {([
                        { label: "Workflow ID", value: ws.workflow_id ?? "latest" },
                        { label: "Execution ID", value: ws.execution_id ?? "pending" },
                        { label: "Transcript", value: `${words.toLocaleString()} words` },
                        { label: "Stages complete", value: `${done}/7` }
                    ] as const).map(row => (
                        <div key={row.label} className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{row.label}</span>
                            <span className="text-[11px] font-semibold text-foreground truncate text-right max-w-[130px]">{row.value}</span>
                        </div>
                    ))}
                </div>
                <div className="h-1.5 bg-secondary rounded overflow-hidden">
                    <motion.div className="h-full rounded bg-primary"
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
                </div>
            </div>
        </aside>
    );
}

function ContextPanel({ artifact }: { artifact: WorkflowState["context_artifact"] }) {
    if (!artifact?.payload) return <EmptyTab label="Context" />;
    const p = artifact.payload as Record<string, any>;
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2 p-4 rounded-md border border-border bg-secondary/30 shadow-card">
                {[{ label: "Provider", value: artifact.provider, mono: true }, { label: "Confidence", value: `${(artifact.confidence * 100).toFixed(0)}%`, ok: true }, { label: "Schema", value: artifact.schema_version, mono: true }, { label: "Created", value: artifact.created_at, mono: true }].map(({ label, value, mono, ok }) => (
                    <span key={label} className={`rounded px-3 py-1.5 text-xs border font-medium ${ok ? "bg-status-success-bg text-status-success border-status-success/20" : "bg-secondary text-muted-foreground border-border"}`}>
                        {label}: <span className={`font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                {([{ label: "Meeting Summary", key: "meeting_summary" }, { label: "Business Problem", key: "business_problem" }, { label: "Business Goal", key: "business_goal" }, { label: "Customer Intent", key: "customer_intent" }, { label: "Buying Stage", key: "buying_stage" }, { label: "Decision Maker", key: "decision_maker" }] as const).map(({ label, key }) =>
                    p[key] ? (
                        <div key={key} className={`relative overflow-hidden rounded-md border border-border bg-card p-5 shadow-card ${key === "meeting_summary" ? "xl:col-span-12" : key === "business_problem" || key === "business_goal" ? "xl:col-span-6" : "xl:col-span-4"}`}>
                            <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/50" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
                            <p className="text-sm leading-7 text-foreground">{p[key]}</p>
                        </div>
                    ) : null
                )}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {([{ label: "Pain Points", key: "pain_points" }, { label: "Stakeholders", key: "stakeholders" }, { label: "Opportunities", key: "opportunities" }] as const).map(({ label, key }) =>
                    Array.isArray(p[key]) && p[key].length > 0 ? (
                        <div key={key} className="relative overflow-hidden bg-card border border-border rounded-md p-5 shadow-card">
                            <div className="absolute inset-x-0 top-0 h-0.5 bg-status-success/50" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{label}</p>
                            <ul className="space-y-2.5">
                                {p[key].map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground leading-6">
                                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-sm bg-primary" />{item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null
                )}
            </div>
        </div>
    );
}

export function WorkflowDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeTab, setActiveTab, setAgentStatus, setHasPendingApproval } = useWorkflowTab();
    const [approvalCompleted, setApprovalCompleted] = useState(false);
    const [knowledgeQuery, setKnowledgeQuery] = useState("");
    const [knowledgeLoading, setKnowledgeLoading] = useState(false);
    const [knowledgeResults, setKnowledgeResults] = useState<any>(null);

    const ws: WorkflowState | null = location.state?.initialData ?? null;
    const pendingApproval = !!(ws?.approval_artifact?.payload) &&
        (ws.approval_artifact.payload as any)?.approval_status === "pending" && !approvalCompleted;

    useEffect(() => {
        setHasPendingApproval(pendingApproval);
        if (ws) {
            setAgentStatus({
                context: !!ws.context_artifact,
                knowledge: !!ws.knowledge_artifact,
                decision: !!ws.decision_artifact,
                strategy: !!ws.strategy_artifact,
                reflection: !!ws.reflection_artifact,
                approval: !!ws.approval_artifact,
                learning: !!ws.learning_artifact,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ws, approvalCompleted]);

    const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter" || !knowledgeQuery.trim()) return;
        setKnowledgeLoading(true);
        try { setKnowledgeResults(await api.knowledge.search(knowledgeQuery)); }
        catch { alert("Search failed."); }
        finally { setKnowledgeLoading(false); }
    };

    const tab = TAB_META[activeTab];

    return (
        <div className="w-full flex flex-col gap-5 min-h-[calc(100vh-4rem)] animate-in fade-in duration-300">
            <div className="flex flex-col gap-3 flex-shrink-0">
                <button onClick={() => navigate("/workflows")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-medium w-fit">
                    <ArrowLeft size={14} /> Back to Workflows
                </button>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Workflow Inspection</h1>
                        <p className="text-sm text-muted-foreground mt-1">ID: <span className="font-mono text-primary">{id}</span></p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => navigate("/workflows")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md font-semibold text-sm hover:bg-primary/90 transition-colors">
                            <PlayCircle size={15} /> New Run
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-md flex flex-col flex-1 overflow-hidden shadow-card min-h-0">
                {ws && <div className="border-b border-border bg-background/50 px-6 py-5"><MetricsRow ws={ws} /></div>}
                {ws && (
                    <div className="flex items-center gap-2.5 px-6 pt-4 pb-3 border-b border-border/40 flex-shrink-0">
                        <span className="text-primary opacity-80">{tab.icon}</span>
                        <h2 className="text-sm font-bold text-foreground">{tab.label}</h2>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto min-h-0 bg-[#f9fafb]">
                    {!ws ? (
                        <div className="flex flex-col items-center justify-center h-full p-8">
                            <div className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center mb-4"><Workflow size={28} className="opacity-30" /></div>
                            <p className="text-base font-semibold text-foreground mb-1">No workflow data</p>
                            <p className="text-sm text-center max-w-sm text-muted-foreground">Run a workflow from the Sales Intelligence Hub and click "Open Full Analysis" to inspect results here.</p>
                            <button onClick={() => navigate("/workflows")} className="mt-5 px-5 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Go to Pipeline</button>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: "easeOut" }}
                                className="grid gap-6 p-6 xl:grid-cols-[minmax(0,2fr)_300px] xl:items-start">
                                <div className="space-y-5 min-w-0">
                                    {activeTab === "context" && (ws.context_artifact ? <ContextPanel artifact={ws.context_artifact} /> : <EmptyTab label="Context" />)}
                                    {activeTab === "readiness" && <DecisionReadiness workflowState={ws} />}
                                    {activeTab === "knowledge" && (
                                        <div className="space-y-5">
                                            <div className="bg-card border border-border rounded-md p-5 shadow-card space-y-4">
                                                <h3 className="text-sm font-semibold text-foreground">Semantic Search</h3>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={15} />
                                                    <input type="text" value={knowledgeQuery} onChange={e => setKnowledgeQuery(e.target.value)} onKeyDown={handleSearch} placeholder="Ask a question or search playbooks…" className="w-full bg-background border border-border rounded-md py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                                </div>
                                                {knowledgeLoading && <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground"><Loader2 className="animate-spin" size={20} /><p className="text-xs">Searching…</p></div>}
                                                {knowledgeResults && (
                                                    <div className="space-y-3 border-t border-border/50 pt-4">
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase">Results ({knowledgeResults.knowledge_results?.length ?? 0})</h4>
                                                        {knowledgeResults.knowledge_results?.map((item: any, i: number) => (
                                                            <div key={i} className="p-3.5 rounded-xl border border-border bg-secondary/30 text-xs space-y-2">
                                                                <div className="flex items-center justify-between"><span className="font-semibold text-primary">{item.document_name}</span><span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{(item.similarity_score * 100).toFixed(0)}% match</span></div>
                                                                <p className="font-mono bg-card border border-border/40 p-2.5 rounded-lg whitespace-pre-wrap">{item.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-card border border-border rounded-md p-5 shadow-card space-y-3">
                                                <h3 className="text-sm font-semibold text-foreground">Pipeline Retrieval Evidence</h3>
                                                {ws.knowledge_artifact?.payload ? (
                                                    <div className="space-y-3">
                                                        <p className="text-xs text-muted-foreground">{ws.knowledge_artifact.payload.knowledge_results.length} chunks · confidence <strong>{(ws.knowledge_artifact.payload.confidence_score * 100).toFixed(0)}%</strong></p>
                                                        {ws.knowledge_artifact.payload.knowledge_results.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No knowledge retrieved.</p> : ws.knowledge_artifact.payload.knowledge_results.map((r: any) => (
                                                            <div key={r.id} className="bg-secondary/20 border border-border rounded-xl p-4">
                                                                <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{r.citation}</span><span className="text-xs font-bold">{(r.similarity_score * 100).toFixed(0)}%</span></div>
                                                                <p className="text-xs font-mono bg-card border border-border p-3 rounded-lg whitespace-pre-wrap">{r.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <EmptyTab label="Knowledge" />}
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === "decision" && (ws.decision_artifact?.payload ? <DecisionDashboard decisionPackage={ws.decision_artifact.payload} /> : <EmptyTab label="Decision" />)}
                                    {activeTab === "advocate" && (ws.decision_artifact?.payload ? <DevilsAdvocate decisionPackage={ws.decision_artifact.payload} /> : <EmptyTab label="Decision (required)" />)}
                                    {activeTab === "simulator" && (ws.decision_artifact?.payload ? <WhatIfSimulator decisionPackage={ws.decision_artifact.payload} /> : <EmptyTab label="Decision (required)" />)}
                                    {activeTab === "strategy" && (ws.strategy_artifact?.payload ? <StrategyDashboard strategyPackage={ws.strategy_artifact.payload} /> : <EmptyTab label="Strategy" />)}
                                    {activeTab === "reflection" && (ws.reflection_artifact ? <ReflectionDashboard reflectionArtifact={ws.reflection_artifact} apiBaseUrl={API_BASE_URL} /> : <EmptyTab label="Reflection" />)}
                                    {activeTab === "approval" && (ws.approval_artifact ? <ApprovalDashboard workflowState={ws} apiBaseUrl={API_BASE_URL} onApprovalComplete={() => setApprovalCompleted(true)} /> : <EmptyTab label="Approval" />)}
                                    {activeTab === "learning" && (ws.learning_artifact ? <LearningDashboard workflowState={ws} /> : <EmptyTab label="Learning" />)}
                                    {activeTab === "report" && <ExecutiveReport workflowState={ws} />}
                                </div>
                                <WorkflowSnapshot ws={ws} />
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
