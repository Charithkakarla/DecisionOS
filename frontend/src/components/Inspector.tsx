// Contains: Inspector.tsx implementation.
import { WorkflowState } from "../types/agent";

type InspectorProps = {
  state: WorkflowState | null;
};

export default function Inspector({ state }: InspectorProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">State Inspector</h2>
      <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
        <code>{JSON.stringify(state, null, 2)}</code>
      </pre>
    </section>
  );
}
