import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, PlayCircle, Workflow, Database, BrainCircuit,
  Target, BookOpen, ShieldCheck, Zap, ScrollText, Cpu, Eye,
  Sliders, ShieldAlert, GaugeCircle, FileText, Search, Loader2
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { WorkflowState } from "../types/agent";
import { api } from "../lib/api";

import DecisionDashboard from "../components/DecisionDashboard";
import StrategyDashboard from "../components/StrategyDashboard";
import ReflectionDashboard from "../components/ReflectionDashboard";
import ApprovalDashboard from "../components/ApprovalDashboard";
import LearningDashboard from "../components/LearningDashboard";
import KnowledgeDashboard from "../components/KnowledgeDashboard";
import LogStream from "../components/LogStream";
import Inspector from "../components/Inspector";
import DecisionReadiness from "../components/DecisionReadiness";
import DevilsAdvocate from "../components/DevilsAdvocate";
import WhatIfSimulator from "../components/WhatIfSimulator";
import ExecutiveReport from "../components/ExecutiveReport";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ContextPanel({ artifact }: { artifact: WorkflowState["context_artifact"] }) {
  if (!artifact?.payload) return <EmptyTab label="Context" />;
  const p = artifact.payload as Record<string, any>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-3 text-xs bg-secondary/40 border border-border rounded-lg px-4 py-2.5">
        <span>Provider: <span className="font-mono text-primary">{artifact.provider}</span></span>
        <span>Confidence: <span className="font-semibold text-status-success">{(artifact.confidence * 100).toFixed(0)}%</span></span>
        <span>Schema: <span className="font-mono">{artifact.schema_version}</span></span>
        <span>Created: <span className="font-mono">{artifact.created_at}</span></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Meeting Summary",  key: "meeting_summary" },
          { label: "Business Problem", key: "business_problem" },
          { label: "Business Goal",    key: "business_goal" },
          { label: "Customer Intent",  key: "customer_intent" },
          { label: "Buying Stage",     key: "buying_stage" },
          { label: "Decision Maker",   key: "decision_maker" },
        ].map(({ label, key }) =>
          p[key] ? (
            <div key={key} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-foreground">{p[key]}</p>
            </div>
          ) : null
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Pain Points",   key: "pain_points" },
          { label: "Stakeholders",  key: "stakeholders" },
          { label: "Opportunities", key: "opportunities" },
        ].map(({ label, key }) =>
          Array.isArray(p[key]) && p[key].length > 0 ? (
            <div key={key} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
              <ul className="space-y-1">
                {p[key].map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {item}
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

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <Workflow size={40} className="mb-3 opacity-20" />
      <p className="text-sm">The {label} agent did not produce output for this workflow run.</p>
    </div>
  );
}

function FeatureGate({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  // Core pipeline
  { id: "context",    label: "Context",          icon: <Cpu size={14} />,          group: "pipeline" },
  { id: "readiness",  label: "Readiness",         icon: <GaugeCircle size={14} />,  group: "pipeline", badge: "new" },
  { id: "knowledge",  label: "Knowledge",         icon: <Database size={14} />,     group: "pipeline" },
  { id: "decision",   label: "Decision",          icon: <BrainCircuit size={14} />, group: "pipeline" },
  { id: "advocate",   label: "Devil's Advocate",  icon: <ShieldAlert size={14} />,  group: "pipeline", badge: "new" },
  { id: "simulator",  label: "What-If",           icon: <Sliders size={14} />,      group: "pipeline", badge: "new" },
  { id: "strategy",   label: "Strategy",          icon: <Target size={14} />,       group: "pipeline" },
  { id: "reflection", label: "Reflection",        icon: <BookOpen size={14} />,     group: "pipeline" },
  { id: "approval",   label: "Approval",          icon: <ShieldCheck size={14} />,  group: "pipeline" },
  { id: "learning",   label: "Learning",          icon: <Zap size={14} />,          group: "pipeline" },
  // Reports & tools
  { id: "report",     label: "Report",            icon: <FileText size={14} />,     group: "tools",    badge: "new" },
  { id: "inspector",  label: "Inspector",         icon: <Eye size={14} />,          group: "tools" },
  { id: "logs",       label: "Logs",              icon: <ScrollText size={14} />,   group: "tools" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Main component ────────────────────────────────────────────────────────────

export function WorkflowDetails() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("context");
  const [approvalCompleted, setApprovalCompleted] = useState(false);
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState("");
  const [isKnowledgeSearching, setIsKnowledgeSearching] = useState(false);
  const [knowledgeSearchResults, setKnowledgeSearchResults] = useState<any>(null);

  const handleKnowledgeSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && knowledgeSearchQuery.trim()) {
      setIsKnowledgeSearching(true);
      try {
        const results = await api.knowledge.search(knowledgeSearchQuery);
        setKnowledgeSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
        alert("Search failed. Check console for details.");
      } finally {
        setIsKnowledgeSearching(false);
      }
    }
  };

  const workflowState: WorkflowState | null = location.state?.initialData ?? null;

  const agentStatus: Record<string, boolean> = {
    context:    !!workflowState?.context_artifact,
    knowledge:  !!workflowState?.knowledge_artifact,
    decision:   !!workflowState?.decision_artifact,
    strategy:   !!workflowState?.strategy_artifact,
    reflection: !!workflowState?.reflection_artifact,
    approval:   !!workflowState?.approval_artifact,
    learning:   !!workflowState?.learning_artifact,
  };

  const hasPendingApproval =
    workflowState?.approval_artifact?.payload &&
    (workflowState.approval_artifact.payload as any)?.approval_status === "pending" &&
    !approvalCompleted;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-4rem)] animate-in fade-in duration-500">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="mb-4 flex-shrink-0">
        <button
          onClick={() => navigate("/workflows")}
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-3 font-medium"
        >
          <ArrowLeft size={14} className="mr-1" /> Back to Workflows
        </button>

        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Workflow Inspection"
            description={`ID: ${id} — Full multi-agent reasoning chain, decision intelligence, and governance portal.`}
          />
          <button
            onClick={() => navigate("/workflows")}
            className="shrink-0 flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors shadow-sm text-sm"
          >
            <PlayCircle size={15} />
            New Run
          </button>
        </div>

        {workflowState && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(agentStatus).map(([agent, done]) => (
              <span key={agent} className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                done
                  ? "bg-status-success-bg border-status-success/25 text-status-success"
                  : "bg-secondary border-border text-muted-foreground"
              }`}>
                {done ? "✓" : "○"} {agent.charAt(0).toUpperCase() + agent.slice(1)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Main card ────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl flex flex-col flex-1 overflow-hidden shadow-md">

        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto bg-secondary/20 flex-shrink-0">
          {/* Group separator labels */}
          {TABS.map((tab, i) => {
            const prevGroup = i > 0 ? TABS[i - 1].group : null;
            const showSep   = prevGroup && prevGroup !== tab.group;
            const isActive  = activeTab === tab.id;
            const hasStatusDot = tab.id in agentStatus;

            return (
              <div key={tab.id} className="flex items-center">
                {showSep && <div className="w-px h-6 bg-border mx-1 self-center" />}
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-3.5 border-b-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary bg-background"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>

                  {/* Agent status dot */}
                  {hasStatusDot && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      agentStatus[tab.id] ? "bg-status-success" : "bg-muted-foreground/30"
                    }`} />
                  )}

                  {/* "new" badge */}
                  {"badge" in tab && tab.badge === "new" && (
                    <span className="text-[8px] font-black bg-primary text-primary-foreground px-1 py-0.5 rounded uppercase leading-none">
                      NEW
                    </span>
                  )}

                  {/* Pending approval pulse */}
                  {tab.id === "approval" && hasPendingApproval && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-status-warning animate-pulse" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {!workflowState ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <Workflow size={52} className="mb-4 opacity-20" />
              <p className="text-base font-medium mb-1">No workflow data</p>
              <p className="text-sm text-center max-w-sm">
                Run a workflow from the Sales Intelligence Hub and click "Open Full Analysis" to inspect results here.
              </p>
              <button
                onClick={() => navigate("/workflows")}
                className="mt-5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Go to Pipeline
              </button>
            </div>
          ) : (
            <div className="p-6">

              {activeTab === "context" && (
                workflowState.context_artifact
                  ? <ContextPanel artifact={workflowState.context_artifact} />
                  : <EmptyTab label="Context" />
              )}

              {activeTab === "readiness" && (
                <FeatureGate label="Decision Readiness">
                  <DecisionReadiness workflowState={workflowState} />
                </FeatureGate>
              )}

              {activeTab === "knowledge" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Semantic Search Box */}
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Interactive Semantic Search</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Query the organization's vector base for real-time playbooks or documentation matches.</p>
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="text" 
                        value={knowledgeSearchQuery}
                        onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                        onKeyDown={handleKnowledgeSearch}
                        placeholder="Ask a question or search playbooks..." 
                        className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>

                    {/* Search Results */}
                    {isKnowledgeSearching ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        <p>Searching semantic embeddings...</p>
                      </div>
                    ) : knowledgeSearchResults ? (
                      <div className="space-y-3 mt-2 border-t border-border/50 pt-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Results ({knowledgeSearchResults.knowledge_results?.length ?? 0})</h4>
                        {knowledgeSearchResults.knowledge_results?.map((item: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-lg border border-border bg-secondary/30 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary">{item.document_name}</span>
                              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">Match: {(item.similarity_score * 100).toFixed(0)}%</span>
                            </div>
                            <p className="text-foreground leading-relaxed font-mono bg-card border border-border/40 p-2.5 rounded whitespace-pre-wrap">{item.content}</p>
                          </div>
                        ))}
                        {(!knowledgeSearchResults.knowledge_results || knowledgeSearchResults.knowledge_results.length === 0) && (
                          <p className="text-center text-muted-foreground text-xs py-4">No matching playbooks or documents found.</p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Original Run Results */}
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Pipeline Retrieval Evidence</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">The exact context chunks collected by the agent during the automated run.</p>
                    </div>

                    {workflowState.knowledge_artifact?.payload
                      ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {workflowState.knowledge_artifact.payload.knowledge_results.length} evidence chunks retrieved
                              · confidence <strong>{(workflowState.knowledge_artifact.payload.confidence_score * 100).toFixed(0)}%</strong>
                            </p>
                          </div>
                          {workflowState.knowledge_artifact.payload.knowledge_results.length === 0
                            ? <p className="text-sm text-muted-foreground py-8 text-center">No knowledge retrieved for this workflow. Upload playbooks to the Knowledge Base to improve results.</p>
                            : workflowState.knowledge_artifact.payload.knowledge_results.map((r: any) => (
                              <div key={r.id} className="bg-secondary/20 border border-border/80 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{r.citation}</span>
                                  <span className="text-xs font-bold text-foreground">{(r.similarity_score * 100).toFixed(0)}% match</span>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed font-mono bg-background p-3 rounded-lg border border-border whitespace-pre-wrap">{r.content}</p>
                              </div>
                            ))
                          }
                        </div>
                      )
                      : <EmptyTab label="Knowledge" />
                    }
                  </div>
                </div>
              )}

              {activeTab === "decision" && (
                workflowState.decision_artifact?.payload
                  ? <DecisionDashboard decisionPackage={workflowState.decision_artifact.payload} />
                  : <EmptyTab label="Decision" />
              )}

              {activeTab === "advocate" && (
                workflowState.decision_artifact?.payload
                  ? (
                    <FeatureGate label="Devil's Advocate">
                      <DevilsAdvocate decisionPackage={workflowState.decision_artifact.payload} />
                    </FeatureGate>
                  )
                  : <EmptyTab label="Decision (required for Devil's Advocate)" />
              )}

              {activeTab === "simulator" && (
                workflowState.decision_artifact?.payload
                  ? (
                    <FeatureGate label="What-If Simulator">
                      <WhatIfSimulator decisionPackage={workflowState.decision_artifact.payload} />
                    </FeatureGate>
                  )
                  : <EmptyTab label="Decision (required for Simulator)" />
              )}

              {activeTab === "strategy" && (
                workflowState.strategy_artifact?.payload
                  ? <StrategyDashboard strategyPackage={workflowState.strategy_artifact.payload} />
                  : <EmptyTab label="Strategy" />
              )}

              {activeTab === "reflection" && (
                workflowState.reflection_artifact
                  ? <ReflectionDashboard
                      reflectionArtifact={workflowState.reflection_artifact}
                      apiBaseUrl={API_BASE_URL}
                    />
                  : <EmptyTab label="Reflection" />
              )}

              {activeTab === "approval" && (
                workflowState.approval_artifact
                  ? <ApprovalDashboard
                      workflowState={workflowState}
                      apiBaseUrl={API_BASE_URL}
                      onApprovalComplete={() => setApprovalCompleted(true)}
                    />
                  : <EmptyTab label="Approval" />
              )}

              {activeTab === "learning" && (
                workflowState.learning_artifact
                  ? <LearningDashboard workflowState={workflowState} />
                  : <EmptyTab label="Learning" />
              )}

              {/* ── Tool tabs ─────────────────────────────────────────────── */}
              {activeTab === "report" && (
                <FeatureGate label="Executive Report">
                  <ExecutiveReport workflowState={workflowState} />
                </FeatureGate>
              )}

              {activeTab === "inspector" && (
                <Inspector state={workflowState} />
              )}

              {activeTab === "logs" && (
                <LogStream
                  logs={workflowState.execution_logs ?? []}
                  events={workflowState.workflow_events ?? []}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
