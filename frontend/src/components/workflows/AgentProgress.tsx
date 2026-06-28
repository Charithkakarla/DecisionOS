import { useEffect, useState } from "react";
import {
  Loader2, CheckCircle2, BrainCircuit, Search, Route,
  LayoutTemplate, ShieldCheck, Handshake, Sparkles, Network
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  durationMs: number;
  color: string;
}

const AGENTS: Agent[] = [
  {
    id: "context", name: "Context Intelligence Agent",
    description: "Parsing interaction data and extracting structured enterprise context...",
    icon: <LayoutTemplate size={18} />, durationMs: 1200, color: "text-emerald-500"
  },
  {
    id: "knowledge", name: "Knowledge Intelligence Agent",
    description: "Querying vector DB — matching against playbooks, SOPs, and case history...",
    icon: <Search size={18} />, durationMs: 1800, color: "text-cyan-500"
  },
  {
    id: "decision", name: "Decision Intelligence Agent",
    description: "Analyzing business context, scoring opportunities, risks, and readiness...",
    icon: <BrainCircuit size={18} />, durationMs: 2200, color: "text-amber-500"
  },
  {
    id: "strategy", name: "Strategy Intelligence Agent",
    description: "Simulating 3 strategic scenarios and selecting optimal execution plan...",
    icon: <Route size={18} />, durationMs: 2000, color: "text-violet-500"
  },
  {
    id: "reflection", name: "AI Governance Agent",
    description: "Running hallucination detection, consistency checks, and trust scoring...",
    icon: <ShieldCheck size={18} />, durationMs: 1500, color: "text-blue-500"
  },
  {
    id: "approval", name: "Human-in-the-Loop Agent",
    description: "Preparing governance package for reviewer sign-off...",
    icon: <Handshake size={18} />, durationMs: 900, color: "text-rose-500"
  },
  {
    id: "learning", name: "Organizational Learning Agent",
    description: "Indexing patterns and updating organizational memory...",
    icon: <Sparkles size={18} />, durationMs: 800, color: "text-orange-400"
  },
];

export function AgentProgress({ isCompleted = false }: { isCompleted?: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isCompleted) {
      setCurrentStep(AGENTS.length);
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    const runStep = (stepIndex: number) => {
      if (stepIndex >= AGENTS.length) return;
      setCurrentStep(stepIndex);
      timeout = setTimeout(() => runStep(stepIndex + 1), AGENTS[stepIndex].durationMs);
    };
    runStep(0);
    return () => clearTimeout(timeout);
  }, [isCompleted]);

  const completedCount = isCompleted ? AGENTS.length : currentStep;
  const progressPct = Math.round((completedCount / AGENTS.length) * 100);

  return (
    <div className="max-w-2xl mx-auto w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Network size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isCompleted ? "Pipeline Complete" : "Running AI Pipeline"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isCompleted
                ? "All agents finished — redirecting to results..."
                : "7 specialized agents working in sequence..."}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completedCount} of {AGENTS.length} agents complete</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Agent list */}
      <div className="px-8 py-6 space-y-5">
        {AGENTS.map((agent, index) => {
          const isActive = !isCompleted && currentStep === index;
          const isDone = isCompleted || currentStep > index;
          const isPending = !isDone && !isActive;

          return (
            <div
              key={agent.id}
              className={`flex items-start gap-4 transition-all duration-500 ${
                isPending ? "opacity-35" : "opacity-100"
              }`}
            >
              {/* Status icon */}
              <div className="mt-0.5 shrink-0 w-6 flex justify-center">
                {isDone ? (
                  <CheckCircle2 className="text-status-success" size={22} />
                ) : isActive ? (
                  <Loader2 className="text-primary animate-spin" size={22} />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border mt-0.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`${isDone ? "text-status-success" : isActive ? agent.color : "text-muted-foreground"}`}>
                    {agent.icon}
                  </span>
                  <h3 className={`text-sm font-semibold truncate ${
                    isActive ? "text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {agent.name}
                  </h3>
                  {isDone && !isActive && (
                    <span className="text-xs text-status-success font-medium ml-auto shrink-0">Done</span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {agent.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
