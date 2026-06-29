import { createContext, useContext, useState, ReactNode } from "react";

export type TabId =
    | "context" | "readiness" | "knowledge" | "decision"
    | "advocate" | "simulator" | "strategy" | "reflection"
    | "approval" | "learning" | "report";

interface AgentStatus {
    context: boolean;
    knowledge: boolean;
    decision: boolean;
    strategy: boolean;
    reflection: boolean;
    approval: boolean;
    learning: boolean;
}

interface WorkflowTabContextValue {
    activeTab: TabId;
    setActiveTab: (tab: TabId) => void;
    agentStatus: AgentStatus;
    setAgentStatus: (s: AgentStatus) => void;
    hasPendingApproval: boolean;
    setHasPendingApproval: (v: boolean) => void;
}

const WorkflowTabContext = createContext<WorkflowTabContextValue | null>(null);

export function WorkflowTabProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState<TabId>("context");
    const [agentStatus, setAgentStatus] = useState<AgentStatus>({
        context: false, knowledge: false, decision: false,
        strategy: false, reflection: false, approval: false, learning: false,
    });
    const [hasPendingApproval, setHasPendingApproval] = useState(false);

    return (
        <WorkflowTabContext.Provider value={{
            activeTab, setActiveTab,
            agentStatus, setAgentStatus,
            hasPendingApproval, setHasPendingApproval,
        }}>
            {children}
        </WorkflowTabContext.Provider>
    );
}

export function useWorkflowTab() {
    const ctx = useContext(WorkflowTabContext);
    if (!ctx) throw new Error("useWorkflowTab must be used inside WorkflowTabProvider");
    return ctx;
}
