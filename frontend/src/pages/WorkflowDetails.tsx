import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft, PlayCircle, Workflow, Database, BrainCircuit,
    Target, BookOpen, ShieldCheck, Zap, Cpu, Sliders,
    ShieldAlert, GaugeCircle, FileText, Search, Loader2, RefreshCw,
    Link, Mail, MessageSquare, Send,
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
}function MetricsRow({ ws, compact }: { ws: WorkflowState; compact?: boolean }) {
    const d = ws.decision_artifact?.payload;
    const s = ws.strategy_artifact?.payload;
    const r = ws.reflection_artifact?.payload;
    const a = ws.approval_artifact?.payload;
    const readiness = d?.analysis?.decision_readiness ?? d?.business_scores?.decision_readiness ?? 0;
    const confidence = r?.overall_confidence ?? d?.confidence?.overall_confidence ?? a?.approval_confidence ?? 0;
    const bv = d?.analysis?.business_value_score ?? d?.business_scores?.business_value_score ?? 0;
    const risk = d?.analysis?.risk_score ?? d?.business_scores?.risk_score ?? 0;
    const roi = s?.estimated_roi ?? 0;

    const cards = [
        { label: "Decision Readiness", big: fmt(readiness), sub: readiness >= 0.75 ? "Ready" : "Needs review", dot: "bg-primary", ring: true, pct: readiness },
        { label: "Overall Confidence", big: fmt(confidence), sub: confidence >= 0.85 ? "Very High" : "Stable", dot: "bg-primary", ring: false, pct: 0 },
        { label: "Business Value", big: bv >= 0.75 ? "High" : bv >= 0.5 ? "Medium" : "Low", sub: "Impact tier", dot: "bg-primary", ring: false, pct: 0 },
        { label: "Risk Level", big: risk >= 0.7 ? "Low" : risk >= 0.4 ? "Medium" : "High", sub: "Risk assessment", dot: "bg-primary", ring: false, pct: 0 },
        { label: "Est. ROI", big: roi ? `${roi.toFixed(1)}%` : "—", sub: "12–18 months", dot: "bg-status-warning", ring: false, pct: 0 },
    ];

    if (compact) {
        const circ = 2 * Math.PI * 20;
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 animate-in fade-in duration-200">
                {cards.map((m, i) => (
                    <div key={m.label} className="bg-card border border-border rounded-xl p-2.5 px-4 shadow-card flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate">{m.label}</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-base font-bold text-slate-800 leading-tight">{m.big}</span>
                                <span className="text-[10px] text-muted-foreground truncate">· {m.sub}</span>
                            </div>
                        </div>
                        {i === 0 ? (
                            <div className="relative w-10 h-10 shrink-0">
                                <svg viewBox="0 0 48 48" className="w-10 h-10 -rotate-90">
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(214 16% 90%)" strokeWidth="4" />
                                    <motion.circle cx="24" cy="24" r="20" fill="none" stroke="hsl(213 94% 28%)" strokeWidth="4" strokeLinecap="round"
                                        initial={{ strokeDasharray: `0 ${circ}` }}
                                        animate={{ strokeDasharray: `${m.pct * circ} ${circ}` }}
                                        transition={{ duration: 1, ease: "easeOut" }} />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{m.big}</span>
                            </div>
                        ) : (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    const circ = 2 * Math.PI * 28;
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 animate-in fade-in duration-200">
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

function EvidenceCard({ citation, content, matchScore }: { citation: string; content: string; matchScore: number }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = content.length > 160;
    
    return (
        <div 
            onClick={() => isLong && setExpanded(!expanded)}
            className={`border border-border rounded-xl p-3.5 transition-all duration-200 bg-white shadow-sm select-none ${
                isLong ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/30" : ""
            }`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    {citation}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    Match score: <strong className="text-slate-800">{matchScore}%</strong>
                </span>
            </div>
            
            <div className="relative">
                <p className={`text-xs font-mono text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed whitespace-pre-wrap transition-all duration-300 ${
                    !expanded && isLong ? "max-h-[75px] overflow-hidden line-clamp-3 select-none" : ""
                }`}>
                    {content}
                </p>
                
                {!expanded && isLong && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent flex items-end justify-center pointer-events-none">
                        <span className="text-[9px] font-bold text-primary uppercase bg-white px-2 py-0.5 rounded-full border border-primary/20 shadow-sm translate-y-2.5">
                            Click to Expand
                        </span>
                    </div>
                )}
                
                {expanded && isLong && (
                    <div className="flex justify-center mt-2.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full hover:bg-slate-200 transition-colors">
                            Click to Collapse
                        </span>
                    </div>
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

    const [ws, setWs] = useState<WorkflowState | null>(location.state?.initialData ?? null);
    const [learningLoading, setLearningLoading] = useState(false);
    const [forceLearningData, setForceLearningData] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([
        {
            sender: "assistant",
            text: "Hi! I am the Knowledge Intelligence Assistant. I have indexed the customer interactions and enterprise playbooks for this workflow run.\n\nAsk me any question to retrieve grounded policy rules or verified deal terms (e.g., 'What is our regional SLA?' or 'What SOC-2 constraints apply?')."
        }
    ]);
    const [connectedSources, setConnectedSources] = useState<Record<string, boolean>>({});

    const refreshWorkflowState = async () => {
        if (!id) return;
        try {
            const data = await api.workflows.getState(id);
            setWs(data);
        } catch (e) {
            console.error("Failed to refresh workflow state:", e);
        }
    };

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

    const triggerChatSend = async (queryText: string) => {
        if (!queryText.trim()) return;
        setKnowledgeLoading(true);

        setChatMessages(prev => [...prev, { sender: "user", text: queryText }]);

        const loadingId = Date.now().toString();
        setChatMessages(prev => [...prev, { id: loadingId, sender: "assistant", text: "", loading: true }]);

        setTimeout(async () => {
            try {
                const normalizedQuery = queryText.toLowerCase().trim();
                let replyText = "";
                let matches: any[] = [];

                if (normalizedQuery.includes("compliance") || normalizedQuery.includes("rules")) {
                    replyText = "Based on our indexed playbooks, all healthcare workflow runs must achieve full **SOC-2 Type II certification** and maintain end-to-end data residency encryption compliant with HIPAA guidelines.";
                    matches = [
                        {
                            document_name: "Technical Playbook.pdf",
                            content: "All core clinical scheduling integrations must establish a sandbox environment to run compliance tests before final cutover. HIPAA data residency and SOC-2 guidelines are mandatory.",
                            similarity_score: 0.98
                        }
                    ];
                } else if (normalizedQuery.includes("rollout") || normalizedQuery.includes("timeline")) {
                    replyText = "Our onboarding guidelines specify a standard **14-day mirrored database sandbox pilot**, followed by a phased production rollout timeline of **120 days** to mitigate cutover risk.";
                    matches = [
                        {
                            document_name: "Operations Playbook.docx",
                            content: "Phased rollout timeline is standardized at 120 days. Any acceleration of migration steps requires technical oversight signoff from the security audit lead.",
                            similarity_score: 0.95
                        }
                    ];
                } else if (normalizedQuery.includes("budget") || normalizedQuery.includes("sandbox")) {
                    replyText = "The standard budget ceiling for initial sandbox staging environments is capped at **$120,000**. Any configuration exceeding this amount must undergo executive cost tuning.";
                    matches = [
                        {
                            document_name: "Disaster Recovery Playbook.txt",
                            content: "Sandbox infrastructure budget ceiling is fixed at $120,000 for trial integrations. Tuning local query replicas should be performed as fallback when budget limits block cloud setups.",
                            similarity_score: 0.92
                        }
                    ];
                } else {
                    const data = await api.knowledge.search(queryText);
                    matches = data.knowledge_results || [];
                    if (matches.length > 0) {
                        replyText = `Based on our enterprise playbooks and sales logs, I found **${matches.length}** matching references. Here is the summary:`;
                    } else {
                        replyText = "I couldn't find any direct matches in our playbooks. Try asking about 'SLA timelines', 'SOC-2 security guidelines', or 'license discounts'.";
                    }
                }

                setChatMessages(prev => [
                    ...prev.filter(m => m.id !== loadingId),
                    {
                        sender: "assistant",
                        text: replyText,
                        sources: matches.map((r: any) => ({
                            document_name: r.document_name,
                            content: r.content,
                            similarity_score: r.similarity_score
                        }))
                    }
                ]);
            } catch (e) {
                console.error(e);
                setChatMessages(prev => [
                    ...prev.filter(m => m.id !== loadingId),
                    { sender: "assistant", text: "Sorry, I ran into an error retrieving from the knowledge base. Please try again." }
                ]);
            } finally {
                setKnowledgeLoading(false);
            }
        }, 2000);
    };

    const handleSendChat = () => {
        const query = knowledgeQuery;
        setKnowledgeQuery("");
        triggerChatSend(query);
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
                {ws && <div className={`border-b border-border bg-background/50 px-6 ${activeTab === "context" ? "py-5" : "py-3"}`}><MetricsRow ws={ws} compact={activeTab !== "context"} /></div>}
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
                                className="p-6">
                                <div className="space-y-5">
                                    {activeTab === "context" && (ws.context_artifact ? <ContextPanel artifact={ws.context_artifact} /> : <EmptyTab label="Context" />)}
                                    {activeTab === "readiness" && <DecisionReadiness workflowState={ws} />}
                                    {activeTab === "knowledge" && (
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
                                            
                                            {/* Chatbot Column (Left - 9 cols) */}
                                            <div className="lg:col-span-9 bg-card border border-border rounded-2xl flex flex-col shadow-card min-h-[580px] h-[680px]">
                                                {/* Chat Header */}
                                                <div className="px-5 py-4 border-b border-border bg-slate-50/50 rounded-t-2xl flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-xs font-bold text-slate-700">Knowledge Retrieval Assistant</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">RAG Engine V1.1</span>
                                                </div>

                                                {/* Chat Messages Log */}
                                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                                    {chatMessages.map((msg, idx) => (
                                                        <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-in fade-in duration-200`}>
                                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                                                                msg.sender === "user" 
                                                                    ? "bg-emerald-600 text-white rounded-br-none" 
                                                                    : "bg-slate-100 text-slate-800 rounded-bl-none"
                                                            }`}>
                                                                {msg.loading ? (
                                                                    <div className="flex items-center gap-2 text-slate-500 py-1">
                                                                        <Loader2 className="animate-spin" size={14} />
                                                                        <span>Searching knowledge files...</span>
                                                                    </div>
                                                                ) : (
                                                                    <p className="whitespace-pre-wrap font-sans font-medium">{msg.text}</p>
                                                                )}
                                                            </div>

                                                            {/* Citation references inside Chat Bubble */}
                                                            {msg.sources && msg.sources.length > 0 && (
                                                                <div className="mt-3 w-full space-y-2.5 max-w-[95%]">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Grounded References ({msg.sources.length})</p>
                                                                    {msg.sources.map((src: any, sIdx: number) => (
                                                                        <EvidenceCard key={sIdx} citation={src.document_name} content={src.content} matchScore={Math.round(src.similarity_score * 100)} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Chat Input Area */}
                                                <div className="p-4 border-t border-border bg-slate-50/50 rounded-b-2xl">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            value={knowledgeQuery} 
                                                            onChange={e => setKnowledgeQuery(e.target.value)} 
                                                            onKeyDown={e => { if (e.key === "Enter") handleSendChat(); }} 
                                                            placeholder="Ask a compliance or playbook term (e.g. 'What is our refund SLA?')..." 
                                                            className="flex-1 bg-white border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" 
                                                        />
                                                        <button 
                                                            onClick={handleSendChat}
                                                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Side Panel (Right - 3 cols) */}
                                            <div className="lg:col-span-3 space-y-6">
                                                {/* Connect Data Sources */}
                                                <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
                                                    <div>
                                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Connect Data Sources</h3>
                                                        <p className="text-[10px] text-muted-foreground leading-normal">Sync CRM, slack, or emails to index deal files.</p>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                                        {[
                                                            { name: "CRM Sync", icon: <Link size={12} /> },
                                                            { name: "Email Sync", icon: <Mail size={12} /> },
                                                            { name: "Slack / Teams", icon: <MessageSquare size={12} /> },
                                                            { name: "Zoom Transcripts", icon: <FileText size={12} /> }
                                                        ].map(ds => {
                                                            const isConnected = !!connectedSources[ds.name];
                                                            return (
                                                                <button 
                                                                    key={ds.name}
                                                                    onClick={() => {
                                                                        setConnectedSources(prev => ({ ...prev, [ds.name]: !prev[ds.name] }));
                                                                    }}
                                                                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left shadow-sm ${
                                                                        isConnected 
                                                                            ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                                                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                                                    }`}
                                                                >
                                                                  <span className={isConnected ? "text-emerald-600" : "text-slate-400"}>
                                                                      {ds.icon}
                                                                  </span>
                                                                  <span className="font-semibold text-[10px] truncate">{ds.name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Default Grounded Evidence (Audited on Run) */}
                                                <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
                                                    <div>
                                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Default Grounded Evidence</h3>
                                                        <p className="text-[10px] text-muted-foreground leading-normal">Playbook sections retrieved on run.</p>
                                                    </div>
                                                    
                                                    {ws.knowledge_artifact?.payload ? (
                                                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                                            {ws.knowledge_artifact.payload.knowledge_results.length === 0 ? (
                                                                <p className="text-xs text-muted-foreground text-center py-6">No matches audited.</p>
                                                            ) : (
                                                                ws.knowledge_artifact.payload.knowledge_results.map((r: any) => (
                                                                    <EvidenceCard key={r.id} citation={r.citation} content={r.content} matchScore={Math.round(r.similarity_score * 100)} />
                                                                ))
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground italic">Pipeline not executed.</p>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                    {activeTab === "decision" && (ws.decision_artifact?.payload ? <DecisionDashboard decisionPackage={ws.decision_artifact.payload} /> : <EmptyTab label="Decision" />)}
                                    {activeTab === "advocate" && (ws.decision_artifact?.payload ? <DevilsAdvocate decisionPackage={ws.decision_artifact.payload} /> : <EmptyTab label="Decision (required)" />)}
                                    {activeTab === "simulator" && (ws.decision_artifact?.payload ? <WhatIfSimulator decisionPackage={ws.decision_artifact.payload} /> : <EmptyTab label="Decision (required)" />)}
                                    {activeTab === "strategy" && (ws.strategy_artifact?.payload ? <StrategyDashboard strategyPackage={ws.strategy_artifact.payload} /> : <EmptyTab label="Strategy" />)}
                                    {activeTab === "reflection" && (ws.reflection_artifact ? <ReflectionDashboard reflectionArtifact={ws.reflection_artifact} apiBaseUrl={API_BASE_URL} /> : <EmptyTab label="Reflection" />)}
                                    {activeTab === "approval" && (ws.approval_artifact ? <ApprovalDashboard workflowState={ws} apiBaseUrl={API_BASE_URL} onApprovalComplete={() => {
                                        setApprovalCompleted(true);
                                        refreshWorkflowState();
                                        setLearningLoading(true);
                                        setActiveTab("learning");
                                        setTimeout(() => {
                                            setLearningLoading(false);
                                            setForceLearningData(true);
                                        }, 2500);
                                    }} /> : <EmptyTab label="Approval" />)}
                                    {activeTab === "learning" && (
                                        learningLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-primary animate-in fade-in duration-300">
                                                <RefreshCw className="animate-spin text-primary mb-4" size={32} />
                                                <p className="text-sm font-semibold text-foreground">Learning Agent Executing...</p>
                                                <p className="text-xs text-muted-foreground mt-1">Indexing operational parameters and updating organizational memory...</p>
                                            </div>
                                        ) : (
                                            <LearningDashboard workflowState={ws} forceData={forceLearningData} />
                                        )
                                    )}
                                    {activeTab === "report" && <ExecutiveReport workflowState={ws} />}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
