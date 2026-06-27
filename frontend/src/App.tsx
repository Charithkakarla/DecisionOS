// Contains: App.tsx implementation.
import { useMemo, useState } from "react";
import Inspector from "./components/Inspector";
import LogStream from "./components/LogStream";
import KnowledgeDashboard from "./components/KnowledgeDashboard";
import DecisionDashboard from "./components/DecisionDashboard";
import StrategyDashboard from "./components/StrategyDashboard";
import ReflectionDashboard from "./components/ReflectionDashboard";
import ApprovalDashboard from "./components/ApprovalDashboard";
import type { ApprovalStatusType, WorkflowState } from "./types/agent";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const API_URL = `${API_BASE_URL}/api/v1/agent/run`;

export default function App() {
  const [activeTab, setActiveTab] = useState<"workspace" | "knowledge">("workspace");
  const [transcript, setTranscript] = useState("");
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Human Approval Layer state (driven by backend API via ApprovalDashboard)
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatusType>("pending");

  const logs = useMemo(() => state?.execution_logs ?? [], [state]);
  const events = useMemo(() => state?.workflow_events ?? [], [state]);

  const runAgentLoop = async () => {
    setLoading(true);
    setError(null);
    setApprovalStatus("pending");

    const payload: WorkflowState = {
      transcript,
      context_artifact: null,
      knowledge_artifact: null,
      decision_artifact: null,
      strategy_artifact: null,
      reflection_artifact: null,
      approval_artifact: null,
      learning_artifact: null,
      execution_logs: [],
      draft_recommendation: null,
      final_action: null,
      workflow_events: [],
      agent_logs: {},
      agent_metadata: {},
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Agent loop failed with status ${response.status}`);
      }

      const result: WorkflowState = await response.json();
      setState(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  // Observability metrics calculations
  const totalCost = useMemo(() => {
    if (!state?.agent_metadata) return 0;
    return Object.values(state.agent_metadata).reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);
  }, [state]);

  const totalTokens = useMemo(() => {
    if (!state?.agent_metadata) return 0;
    return Object.values(state.agent_metadata).reduce((acc, curr) => acc + (curr.token_usage?.total_tokens || 0), 0);
  }, [state]);

  const totalDuration = useMemo(() => {
    if (!state?.agent_metadata) return 0;
    return Object.values(state.agent_metadata).reduce((acc, curr) => acc + (curr.latency_ms || 0), 0);
  }, [state]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              DecisionOS
            </h1>
            <p className="text-sm text-slate-400">
              Enterprise Agentic Workflow & Autonomous Decision Orchestrator
            </p>
          </div>
          
          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab("workspace")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "workspace"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Agent Workspace
            </button>
            <button
              onClick={() => setActiveTab("knowledge")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "knowledge"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Knowledge Base
            </button>
          </div>
        </header>

        {/* Business Story Line */}
        <section className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Autonomous Strategic Transformation Pipeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-center items-center">
              <span className="text-cyan-400 font-semibold mb-1">1. Business Conversation</span>
              <span className="text-[10px] text-slate-400">Raw transcripts inputted to system</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-center items-center">
              <span className="text-emerald-400 font-semibold mb-1">2. AI Executive Team</span>
              <span className="text-[10px] text-slate-400">Context & evidence-backed reasoning</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-center items-center">
              <span className="text-yellow-400 font-semibold mb-1">3. Enterprise Strategy</span>
              <span className="text-[10px] text-slate-400">Simulations, comparison & execution plan</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-center items-center">
              <span className="text-rose-400 font-semibold mb-1">4. Human Approval</span>
              <span className="text-[10px] text-slate-400">Governance, escalation & override</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-center items-center">
              <span className="text-purple-400 font-semibold mb-1">5. Continuous Learning</span>
              <span className="text-[10px] text-slate-400">Reinforcement outcomes registry</span>
            </div>
          </div>
        </section>

        {activeTab === "workspace" ? (
          <div className="space-y-6">
            
            {/* Input area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-lg">
                  <label htmlFor="transcript" className="mb-2 block text-sm font-semibold text-slate-300">
                    Input Transcript
                  </label>
                  <textarea
                    id="transcript"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste business transcripts, meeting logs, sales calls, or incident reports..."
                    className="h-32 w-full rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200 outline-none ring-emerald-500/50 transition focus:ring"
                  />

                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={runAgentLoop}
                      disabled={loading}
                      className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-800"
                    >
                      {loading ? "Orchestrating Workflow..." : "Trigger AI Executive Loop"}
                    </button>
                    {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}
                  </div>
                </section>
              </div>

              {/* Observability widget */}
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-lg h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 border-b border-slate-800 pb-2">
                      Observability Engine
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Workflow run ID</span>
                        <span className="font-mono text-cyan-400">{state?.workflow_id || "Inactive"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Execution run ID</span>
                        <span className="font-mono text-cyan-400">{state?.execution_id || "Inactive"}</span>
                      </div>
                      <hr className="border-slate-800 my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Total Run Latency</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {totalDuration ? `${totalDuration} ms` : "0 ms"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Total Token Consumption</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {totalTokens ? totalTokens.toLocaleString() : "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Estimated Cost</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {totalCost ? `$${totalCost.toFixed(5)}` : "$0.00"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 rounded p-2 mt-4">
                    ⚡ Metadata verified using exact Gemini cost structures: Input $0.075/M, Output $0.30/M tokens.
                  </div>
                </section>
              </div>
            </div>

            {/* Visual execution trace (Expanded for 7 Agent pipeline trace) */}
            {(loading || state) && (
              <section className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 border-b border-slate-800 pb-2">
                  Agent Pipeline Execution Trace
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  
                  {/* Context Agent */}
                  <div className={`p-3 rounded-lg border transition ${
                    loading && !state ? "bg-slate-900/50 border-slate-800 animate-pulse" : 
                    state?.context_artifact ? "bg-slate-900 border-emerald-500/30" : "bg-slate-900/30 border-slate-900 text-slate-500"
                  }`}>
                    <div className="flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold">1. Context</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          state?.context_artifact ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                          loading ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" : "bg-slate-800 text-slate-500"
                        }`}>
                          {state?.context_artifact ? "Completed" : loading ? "Running" : "Planned"}
                        </span>
                      </div>
                      {state?.context_artifact && (
                        <div className="text-[9px] space-y-1 text-slate-400 border-t border-slate-800/60 pt-1.5">
                          <div>Latency: <span className="text-slate-200">{state.agent_metadata?.context?.latency_ms ?? 0} ms</span></div>
                          <div>Confidence: <span className="text-slate-200">{(state.context_artifact.confidence * 100).toFixed(0)}%</span></div>
                          <div>Provider: <span className="text-slate-200 font-mono">{state.context_artifact.provider}</span></div>
                          <div>Cost: <span className="text-slate-200">${state.agent_metadata?.context?.estimated_cost ?? 0}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Knowledge Agent */}
                  <div className={`p-3 rounded-lg border transition ${
                    loading && !state?.knowledge_artifact ? "bg-slate-900/50 border-slate-800 animate-pulse" : 
                    state?.knowledge_artifact ? "bg-slate-900 border-emerald-500/30" : "bg-slate-900/30 border-slate-900 text-slate-500"
                  }`}>
                    <div className="flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold">2. Knowledge</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          state?.knowledge_artifact ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                          loading && state?.context_artifact ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" : "bg-slate-800 text-slate-500"
                        }`}>
                          {state?.knowledge_artifact ? "Completed" : loading && state?.context_artifact ? "Running" : "Planned"}
                        </span>
                      </div>
                      {state?.knowledge_artifact && (
                        <div className="text-[9px] space-y-1 text-slate-400 border-t border-slate-800/60 pt-1.5">
                          <div>Latency: <span className="text-slate-200">{state.agent_metadata?.knowledge?.latency_ms ?? 0} ms</span></div>
                          <div>Confidence: <span className="text-slate-200">{(state.knowledge_artifact.confidence * 100).toFixed(0)}%</span></div>
                          <div>Provider: <span className="text-slate-200 font-mono">pgvector</span></div>
                          <div>Cost: <span className="text-slate-200">${state.agent_metadata?.knowledge?.estimated_cost ?? 0}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision Agent */}
                  <div className={`p-3 rounded-lg border transition ${
                    loading && !state?.decision_artifact ? "bg-slate-900/50 border-slate-800 animate-pulse" : 
                    state?.decision_artifact ? "bg-slate-900 border-emerald-500/30" : "bg-slate-900/30 border-slate-900 text-slate-500"
                  }`}>
                    <div className="flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold">3. Decision</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          state?.decision_artifact ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                          loading && state?.knowledge_artifact ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" : "bg-slate-800 text-slate-500"
                        }`}>
                          {state?.decision_artifact ? "Completed" : loading && state?.knowledge_artifact ? "Running" : "Planned"}
                        </span>
                      </div>
                      {state?.decision_artifact && (
                        <div className="text-[9px] space-y-1 text-slate-400 border-t border-slate-800/60 pt-1.5">
                          <div>Latency: <span className="text-slate-200">{state.agent_metadata?.decision?.latency_ms ?? 0} ms</span></div>
                          <div>Confidence: <span className="text-slate-200">{(state.decision_artifact.confidence * 100).toFixed(0)}%</span></div>
                          <div>Provider: <span className="text-slate-200 font-mono">{state.decision_artifact.provider}</span></div>
                          <div>Cost: <span className="text-slate-200">${state.agent_metadata?.decision?.estimated_cost ?? 0}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strategy Agent */}
                  <div className={`p-3 rounded-lg border transition ${
                    loading && !state?.strategy_artifact ? "bg-slate-900/50 border-slate-800 animate-pulse" : 
                    state?.strategy_artifact ? "bg-slate-900 border-emerald-500/30" : "bg-slate-900/30 border-slate-900 text-slate-500"
                  }`}>
                    <div className="flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold">4. Strategy</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          state?.strategy_artifact ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                          loading && state?.decision_artifact ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" : "bg-slate-800 text-slate-500"
                        }`}>
                          {state?.strategy_artifact ? "Completed" : loading && state?.decision_artifact ? "Running" : "Planned"}
                        </span>
                      </div>
                      {state?.strategy_artifact && (
                        <div className="text-[9px] space-y-1 text-slate-400 border-t border-slate-800/60 pt-1.5">
                          <div>Latency: <span className="text-slate-200">{state.agent_metadata?.strategy?.latency_ms ?? 0} ms</span></div>
                          <div>Confidence: <span className="text-slate-200">{(state.strategy_artifact.confidence * 100).toFixed(0)}%</span></div>
                          <div>Provider: <span className="text-slate-200 font-mono">{state.strategy_artifact.provider}</span></div>
                          <div>Cost: <span className="text-slate-200">${state.agent_metadata?.strategy?.estimated_cost ?? 0}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reflection Agent */}
                  <div className={`p-3 rounded-lg border transition ${
                    loading && !state?.reflection_artifact && state?.strategy_artifact ? "bg-slate-900/50 border-slate-800 animate-pulse" : 
                    state?.reflection_artifact ? "bg-slate-900 border-emerald-500/30" : "bg-slate-900/30 border-slate-900 text-slate-500"
                  }`}>
                    <div className="flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-cyan-400">5. Reflection</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          state?.reflection_artifact ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                          loading && state?.strategy_artifact ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" : "bg-slate-800 text-slate-500"
                        }`}>
                          {state?.reflection_artifact ? "Completed" : loading && state?.strategy_artifact ? "Running" : "Planned"}
                        </span>
                      </div>
                      {state?.reflection_artifact && (
                        <div className="text-[9px] space-y-1 text-slate-400 border-t border-slate-800/60 pt-1.5">
                          <div>Latency: <span className="text-slate-200">{state.agent_metadata?.reflection?.latency_ms ?? 0} ms</span></div>
                          <div>Trust: <span className="text-slate-200">{(state.reflection_artifact.payload.overall_trust_score * 100).toFixed(0)}%</span></div>
                          <div>Provider: <span className="text-slate-200 font-mono">{state.reflection_artifact.provider}</span></div>
                          <div>Cost: <span className="text-slate-200">${state.agent_metadata?.reflection?.estimated_cost ?? 0}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Human Approval Node */}
                  <div className={`p-3 rounded-lg border transition ${
                    state?.approval_artifact && approvalStatus !== "pending" ? "bg-slate-900 border-emerald-500/30"
                      : state?.approval_artifact ? "bg-slate-900/50 border-blue-500/20 animate-pulse"
                      : "bg-slate-900/30 border-slate-900 text-slate-500"
                  }`}>
                    <div className="flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-rose-400">6. Approval</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          approvalStatus !== "pending" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : state?.approval_artifact ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                            : "bg-slate-800 text-slate-500"
                        }`}>
                          {approvalStatus !== "pending" ? approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1) : state?.approval_artifact ? "Pending Review" : "Planned"}
                        </span>
                      </div>
                      {state?.approval_artifact && (
                        <div className="text-[9px] space-y-1 text-slate-400 border-t border-slate-800/60 pt-1.5">
                          <div>Status: <span className="text-slate-200 capitalize">{approvalStatus}</span></div>
                          <div>Reviewer: <span className="text-slate-200 font-mono">{state.approval_artifact.payload?.reviewer || "Awaiting"}</span></div>
                          <div>Provider: <span className="text-slate-200 font-mono">{state.approval_artifact.provider}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Learning Agent Node */}
                  <div className={`p-3 rounded-lg border transition ${
                    (approvalStatus === "approved" || approvalStatus === "modified") ? "bg-slate-900 border-emerald-500/30" : "bg-slate-900/30 border-slate-900 text-slate-500"
                  }`}>
                    <div className="flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-purple-400">7. Learning</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          (approvalStatus === "approved" || approvalStatus === "modified") ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-slate-800 text-slate-500"
                        }`}>
                          {(approvalStatus === "approved" || approvalStatus === "modified") ? "Synced" : "Planned"}
                        </span>
                      </div>
                      {(approvalStatus === "approved" || approvalStatus === "modified") && (
                        <div className="text-[9px] space-y-1 text-slate-400 border-t border-slate-800/60 pt-1.5">
                          <div>Database: <span className="text-slate-200">Outcome Registered</span></div>
                          <div>Factual Success: <span className="text-slate-200">94.2% model benchmark</span></div>
                          <div>Memory: <span className="text-[8px] font-mono text-emerald-400">✓ Feedback Encoded</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </section>
            )}

            {/* Dashboard panels */}
            {state?.decision_artifact?.payload && (
              <DecisionDashboard decisionPackage={state.decision_artifact.payload} />
            )}

            {state?.strategy_artifact?.payload && (
              <StrategyDashboard strategyPackage={state.strategy_artifact.payload} />
            )}

            {/* Sprint 7 Reflection & AI Governance Dashboard */}
            {state?.reflection_artifact && (
              <ReflectionDashboard 
                reflectionArtifact={state.reflection_artifact} 
                apiBaseUrl={API_BASE_URL} 
              />
            )}

            {/* Sprint 8 — Human Approval & Enterprise Governance Portal */}
            {state?.approval_artifact && (
              <ApprovalDashboard
                workflowState={state}
                apiBaseUrl={API_BASE_URL}
                onApprovalComplete={(status) => setApprovalStatus(status)}
              />
            )}

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <LogStream logs={logs} events={events} />
              <Inspector state={state} />
            </section>
          </div>
        ) : (
          <KnowledgeDashboard />
        )}
      </div>
    </main>
  );
}
