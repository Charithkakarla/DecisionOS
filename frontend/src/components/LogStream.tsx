// Contains: LogStream.tsx implementation.
import { WorkflowEvent } from "../types/agent";

type LogStreamProps = {
  logs: string[];
  events: WorkflowEvent[];
};

const statusTone: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  failed: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

function formatAgent(agent: string) {
  return agent.charAt(0).toUpperCase() + agent.slice(1);
}

export default function LogStream({ logs, events }: LogStreamProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-200">Event Timeline</h2>
      <div className="mt-4 space-y-3">
        {events.length === 0 && (
          <p className="text-sm text-slate-500">No events yet. Trigger the workflow to begin.</p>
        )}

        {events.map((event, index) => (
          <div key={`${event.event_type}-${event.timestamp}-${index}`} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-slate-100">{event.event_type}</p>
              </div>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusTone[event.status] ?? "bg-slate-800 text-slate-300 border-slate-700"}`}>
                {event.status}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-3">
              <p>Timestamp: <span className="text-slate-200">{event.timestamp || "-"}</span></p>
              <p>Agent: <span className="text-slate-200">{formatAgent(event.agent)}</span></p>
              <p>Duration: <span className="text-slate-200">{event.duration_ms} ms</span></p>
              <p>Artifact: <span className="text-slate-200">{event.artifact_produced || "-"}</span></p>
              <p>Confidence: <span className="text-slate-200">{(event.confidence * 100).toFixed(0)}%</span></p>
              <p>Provider: <span className="text-slate-200">{event.provider || "-"}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-800 pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Raw Execution Logs</h3>
        <div className="mt-2 space-y-1.5">
          {logs.length === 0 && <p className="text-xs text-slate-600">No textual logs available.</p>}
          {logs.map((entry, index) => (
            <p key={`${entry}-${index}`} className="text-xs text-slate-400">{index + 1}. {entry}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
