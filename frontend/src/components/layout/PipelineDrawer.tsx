import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Cpu, GaugeCircle, Database, BrainCircuit,
    ShieldAlert, Sliders, Target, GitMerge,
    Settings2, Sparkles, FileText,
} from "lucide-react";
import { useWorkflowTab, type TabId } from "../../lib/workflowTabContext";

const TABS: {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    agentKey?: string;
}[] = [
        { id: "context", label: "Context", icon: <Cpu size={15} />, agentKey: "context" },
        { id: "readiness", label: "Readiness", icon: <GaugeCircle size={15} /> },
        { id: "knowledge", label: "Knowledge", icon: <Database size={15} />, agentKey: "knowledge" },
        { id: "decision", label: "Decision", icon: <BrainCircuit size={15} />, agentKey: "decision" },
        { id: "advocate", label: "Devil's Advocate", icon: <ShieldAlert size={15} /> },
        { id: "simulator", label: "What-If", icon: <Sliders size={15} /> },
        { id: "strategy", label: "Strategy", icon: <Target size={15} />, agentKey: "strategy" },
        { id: "reflection", label: "Reflection", icon: <GitMerge size={15} />, agentKey: "reflection" },
        { id: "approval", label: "Approval", icon: <Settings2 size={15} />, agentKey: "approval" },
        { id: "learning", label: "Learning", icon: <Sparkles size={15} />, agentKey: "learning" },
        { id: "report", label: "Report", icon: <FileText size={15} /> },
    ];

export function PipelineDrawer() {
    const navigate = useNavigate();
    const { activeTab, setActiveTab, agentStatus, hasPendingApproval } = useWorkflowTab();

    return (
        <div className="w-[232px] bg-card border-r border-border h-full flex flex-col shrink-0 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 h-[65px] border-b border-border shrink-0">
                <span className="text-[10px] font-black tracking-[0.22em] text-muted-foreground uppercase select-none">
                    Analysis Pipeline
                </span>
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate("/workflows")}
                    aria-label="Close pipeline"
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                    <X size={13} />
                </motion.button>
            </div>

            {/* Tab list */}
            <nav className="flex-1 overflow-y-auto py-2.5 px-2.5 space-y-0.5">
                <AnimatePresence initial={false}>
                    {TABS.map((tab, i) => {
                        const isActive = activeTab === tab.id;
                        const isDone = tab.agentKey
                            ? agentStatus[tab.agentKey as keyof typeof agentStatus]
                            : false;
                        const isPending = tab.id === "approval" && hasPendingApproval;

                        return (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02, duration: 0.18, ease: "easeOut" }}
                                whileHover={{ x: isActive ? 0 : 2 }}
                                className={`group relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    }`}
                            >
                                {/* Active left bar */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            layoutId="active-bar"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary"
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            exit={{ scaleY: 0 }}
                                            transition={{ duration: 0.18 }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Icon */}
                                <span className={`shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    }`}>
                                    {tab.icon}
                                </span>

                                {/* Label */}
                                <span className="flex-1 text-left truncate">{tab.label}</span>

                                {/* Badges + status dots */}
                                <span className="flex items-center gap-1.5 shrink-0">

                                    {tab.agentKey && (
                                        <motion.span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            animate={{
                                                backgroundColor: isDone ? "#22c55e" : "#d1d5db",
                                                boxShadow: isDone ? "0 0 0 3px rgba(34,197,94,0.2)" : "none",
                                            }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    )}

                                    {isPending && (
                                        <motion.span
                                            className="w-2 h-2 rounded-full bg-status-warning"
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        />
                                    )}
                                </span>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </nav>

            {/* Footer */}
            <div className="border-t border-border px-3 py-3 shrink-0">
                <p className="text-[9px] font-semibold text-muted-foreground/60 text-center uppercase tracking-widest">
                    Decision OS · v1.0
                </p>
            </div>
        </div>
    );
}
