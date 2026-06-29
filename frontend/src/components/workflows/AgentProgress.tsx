import { useEffect, useState } from "react";
import {
  CheckCircle2, BrainCircuit, Search, Route,
  LayoutTemplate, ShieldCheck, Handshake, Sparkles, Zap
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  durationMs: number;
  color: string;
  bgColor: string;
}

const AGENTS: Agent[] = [
  {
    id: "context", name: "Context Intelligence",
    description: "Parsing interaction data and extracting structured enterprise context...",
    icon: <LayoutTemplate size={16} />, durationMs: 1200,
    color: "text-violet-600", bgColor: "bg-violet-100",
  },
  {
    id: "knowledge", name: "Knowledge Retrieval",
    description: "Querying vector DB — matching against playbooks, SOPs, and case history...",
    icon: <Search size={16} />, durationMs: 1800,
    color: "text-sky-600", bgColor: "bg-sky-100",
  },
  {
    id: "decision", name: "Decision Intelligence",
    description: "Analyzing business context, scoring opportunities, risks, and readiness...",
    icon: <BrainCircuit size={16} />, durationMs: 2200,
    color: "text-amber-600", bgColor: "bg-amber-100",
  },
  {
    id: "strategy", name: "Strategy Planning",
    description: "Simulating 3 strategic scenarios and selecting optimal execution plan...",
    icon: <Route size={16} />, durationMs: 2000,
    color: "text-emerald-600", bgColor: "bg-emerald-100",
  },
  {
    id: "reflection", name: "AI Governance",
    description: "Running hallucination detection, consistency checks, and trust scoring...",
    icon: <ShieldCheck size={16} />, durationMs: 1500,
    color: "text-blue-600", bgColor: "bg-blue-100",
  },
  {
    id: "approval", name: "Human-in-the-Loop",
    description: "Preparing governance package for reviewer sign-off...",
    icon: <Handshake size={16} />, durationMs: 900,
    color: "text-rose-600", bgColor: "bg-rose-100",
  },
  {
    id: "learning", name: "Organizational Learning",
    description: "Indexing patterns and updating organizational memory...",
    icon: <Sparkles size={16} />, durationMs: 800,
    color: "text-orange-600", bgColor: "bg-orange-100",
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
    <div className="max-w-xl mx-auto w-full animate-in slide-up duration-300">
      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card-md">
        <div className="px-8 pt-7 pb-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Zap size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isCompleted ? "Pipeline Complete" : "Running AI Pipeline"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isCompleted
                  ? "All agents finished — redirecting to results..."
                  : "7 specialized agents working in sequence"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">{completedCount} of {AGENTS.length} agents complete</span>
              <span className="font-semibold text-foreground">{progressPct}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-700 ease-out progress-shine"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Agent list */}
        <div className="px-8 py-6 space-y-4">
          {AGENTS.map((agent, index) => {
            const isActive = !isCompleted && currentStep === index;
            const isDone = isCompleted || currentStep > index;
            const isPending = !isDone && !isActive;

            return (
              <div
                key={agent.id}
                className={`flex items-center gap-4 transition-all duration-500 ${isPending ? "opacity-30" : "opacity-100"
                  }`}
              >
                {/* Status icon */}
                <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                  {isDone ? (
                    <div className="w-8 h-8 rounded-xl bg-status-success-bg flex items-center justify-center">
                      <CheckCircle2 className="text-status-success" size={16} />
                    </div>
                  ) : isActive ? (
                    <div className={`w-8 h-8 rounded-xl ${agent.bgColor} flex items-center justify-center`}>
                      <div className={`w-3 h-3 rounded-full ${agent.color.replace('text-', 'bg-')} animate-pulse`} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-border" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`${isDone ? "text-status-success" : isActive ? agent.color : "text-muted-foreground"}`}>
                      {agent.icon}
                    </span>
                    <h3 className={`text-sm font-semibold truncate ${isActive ? "text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"
                      }`}>
                      {agent.name}
                    </h3>
                    {isDone && !isActive && (
                      <span className="text-xs text-status-success font-semibold ml-auto shrink-0">Done</span>
                    )}
                    {isActive && (
                      <span className="text-xs text-primary font-semibold ml-auto shrink-0 animate-pulse">Running...</span>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed ${isActive ? "text-muted-foreground" : "text-muted-foreground/70"
                    }`}>
                    {agent.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
