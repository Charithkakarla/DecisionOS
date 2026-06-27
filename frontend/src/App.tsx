// Contains: App.tsx implementation.
import { useMemo, useState } from "react";
import Inspector from "./components/Inspector";
import LogStream from "./components/LogStream";
import KnowledgeDashboard from "./components/KnowledgeDashboard";
import DecisionDashboard from "./components/DecisionDashboard";
import { WorkflowState } from "./types/agent";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const API_URL = `${API_BASE_URL}/api/v1/agent/run`;

export default function App() {
  const [activeTab, setActiveTab] = useState<"workspace" | "knowledge">("workspace");
  const [transcript, setTranscript] = useState("");
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logs = useMemo(() => state?.execution_logs ?? [], [state]);

  const runAgentLoop = async () => {
    setLoading(true);
    setError(null);

    const payload: WorkflowState = {
      transcript,
      extracted_context: null,
      relevant_playbooks: null,
      draft_recommendation: null,
      final_action: null,
      execution_logs: [],
      evidence_package: null,
      decision_package: null,
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

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Decision OS</h1>
            <p className="text-sm text-slate-600">
              Enterprise Agentic Workflow & Knowledge Intelligence Control Center.
            </p>
          </div>
          <div className="flex gap-2 bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("workspace")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "workspace"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agent Workspace
            </button>
            <button
              onClick={() => setActiveTab("knowledge")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "knowledge"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Knowledge Base
            </button>
          </div>
        </header>

        {activeTab === "workspace" ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label htmlFor="transcript" className="mb-2 block text-sm font-medium">
                Transcript Input
              </label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste call transcript or incident narrative..."
                className="h-36 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none ring-emerald-500 transition focus:ring"
              />

              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={runAgentLoop}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {loading ? "Running..." : "Trigger Agentic Loop"}
                </button>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
            </section>

            {state?.decision_package && (
              <DecisionDashboard decisionPackage={state.decision_package} />
            )}

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <LogStream logs={logs} />
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
