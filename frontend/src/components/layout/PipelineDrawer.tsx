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
        <div
            className="w-[232px] h-full flex flex-col shrink-0 overflow-hidden"
            style={{
                backgroundColor: "hsl(var(--sidebar-bg))",
                borderRight: "1px solid hsl(var(--sidebar-border))",
            }}
        >

            {/* Header */}
            <div
                className="flex items-center justify-between px-4 h-[65px] shrink-0"
                style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
            >
                <span
                    className="text-[10px] font-black tracking-[0.22em] uppercase select-none"
                    style={{ color: "hsl(var(--sidebar-muted))" }}
                >
                    Analysis Pipeline
                </span>
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate("/workflows")}
                    aria-label="Close pipeline"
                    className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
                    style={{ color: "hsl(var(--sidebar-muted))" }}
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
                                className="group relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
                                style={{
                                    backgroundColor: isActive
                                        ? "hsl(var(--sidebar-active-bg))"
                                        : "transparent",
                                    color: isActive
                                        ? "hsl(var(--sidebar-active-fg))"
                                        : "hsl(var(--sidebar-muted))",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-hover-bg))";
                                        e.currentTarget.style.color = "hsl(var(--sidebar-fg))";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.color = "hsl(var(--sidebar-muted))";
                                    }
                                }}
                            >
                                {/* Active left bar */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            layoutId="active-bar"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                                            style={{ backgroundColor: "hsl(var(--sidebar-active-fg))" }}
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            exit={{ scaleY: 0 }}
                                            transition={{ duration: 0.18 }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Icon */}
                                <span className="shrink-0">{tab.icon}</span>

                                {/* Label */}
                                <span className={`flex-1 text-left truncate ${isActive ? "font-semibold" : ""}`}>
                                    {tab.label}
                                </span>

                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </nav>

            {/* Footer */}
            <div
                className="px-3 py-3 shrink-0"
                style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
            >
                <p
                    className="text-[9px] font-semibold text-center uppercase tracking-widest"
                    style={{ color: "hsl(var(--sidebar-muted) / 0.5)" }}
                >
                    Decision OS · v1.0
                </p>
            </div>
        </div>
    );
}
