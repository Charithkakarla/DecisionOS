// Contains: LogStream.tsx implementation.
type LogStreamProps = {
  logs: string[];
};

export default function LogStream({ logs }: LogStreamProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Execution Log Stream</h2>
      <div className="mt-4 space-y-3">
        {logs.length === 0 && (
          <p className="text-sm text-slate-500">No logs yet. Trigger the loop to begin.</p>
        )}
        {logs.map((entry, index) => (
          <div key={`${entry}-${index}`} className="flex items-start gap-3">
            <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {index + 1}
            </div>
            <p className="text-sm text-slate-700">{entry}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
