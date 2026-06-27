import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, PlayCircle, BarChart3, Workflow, Database, BrainCircuit, Target, BookOpen, ShieldCheck, Zap, ScrollText } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";

// Import legacy components
import DecisionDashboard from "../components/DecisionDashboard";
import StrategyDashboard from "../components/StrategyDashboard";
import ReflectionDashboard from "../components/ReflectionDashboard";
import ApprovalDashboard from "../components/ApprovalDashboard";
import LearningDashboard from "../components/LearningDashboard";
import KnowledgeDashboard from "../components/KnowledgeDashboard";
import LogStream from "../components/LogStream";
import Inspector from "../components/Inspector";

export function WorkflowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("action_plan");

  // Get the workflow state from navigation location, or use null
  const workflowState = location.state?.initialData || null;

  const tabs = [
    { id: "action_plan", label: "Sales Action Plan", icon: <BrainCircuit size={16} /> },
    { id: "strategy", label: "Deal Strategy", icon: <Target size={16} /> },
    { id: "knowledge", label: "Playbooks", icon: <Database size={16} /> },
    { id: "reflection", label: "Coach Reflection", icon: <BookOpen size={16} /> },
    { id: "approval", label: "Manager Approval", icon: <ShieldCheck size={16} /> },
    { id: "learning", label: "Learning", icon: <Zap size={16} /> },
    { id: "artifacts", label: "Inspector", icon: <Database size={16} /> },
    { id: "logs", label: "Logs", icon: <ScrollText size={16} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
      <div className="mb-6 flex-shrink-0">
        <button 
          onClick={() => navigate("/workflows")}
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 font-medium"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Workflows
        </button>
        <div className="flex items-center justify-between">
          <PageHeader 
            title={`Workflow Execution: ${id}`}
            description="Inspect the autonomous multi-agent reasoning chain."
          />
          <button className="flex items-center space-x-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors shadow-sm">
            <PlayCircle size={18} />
            <span>Re-Run Pipeline</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl flex flex-col flex-1 overflow-hidden shadow-md">
        {/* Tabs Header */}
        <div className="flex border-b border-border overflow-x-auto bg-secondary/30 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-background/50">
          {!workflowState ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Workflow size={48} className="mb-4 opacity-20" />
              <p>No workflow data available. Run a new workflow to inspect its state.</p>
            </div>
          ) : (
            <>
              {activeTab === "knowledge" && workflowState.knowledge_artifact && (
                <KnowledgeDashboard artifact={workflowState.knowledge_artifact} />
              )}
              
              {activeTab === "action_plan" && workflowState.decision_package && (
                <DecisionDashboard decisionPackage={workflowState.decision_package} />
              )}
              
              {activeTab === "strategy" && workflowState.strategy_plan && (
                <StrategyDashboard strategyPlan={workflowState.strategy_plan} />
              )}
              
              {activeTab === "reflection" && workflowState.reflection_report && (
                <ReflectionDashboard reflectionReport={workflowState.reflection_report} />
              )}
              
              {activeTab === "approval" && workflowState.approval_record && (
                <ApprovalDashboard approvalRecord={workflowState.approval_record} />
              )}
              
              {activeTab === "learning" && (
                <LearningDashboard workflowState={workflowState} />
              )}
              
              {activeTab === "artifacts" && (
                <div className="h-full">
                  <Inspector state={workflowState} />
                </div>
              )}
              
              {activeTab === "logs" && (
                <div className="h-full p-6">
                  <LogStream 
                    isOpen={true} 
                    onClose={() => {}} 
                    logs={[{
                      agent: "Orchestrator",
                      level: "info",
                      message: "Workflow finished running",
                      timestamp: new Date().toISOString()
                    }]} 
                  />
                </div>
              )}

              {/* Handle empty tabs for agents that haven't run */}
              {["knowledge", "action_plan", "strategy", "reflection", "approval", "learning"].includes(activeTab) && 
                !workflowState[`${activeTab === 'action_plan' ? 'decision' : activeTab}_package`] && 
                !workflowState[`${activeTab}_artifact`] && 
                !workflowState[`${activeTab}_plan`] && 
                !workflowState[`${activeTab}_record`] && 
                activeTab !== "learning" && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                  <p>The {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Agent has not generated any data yet.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
