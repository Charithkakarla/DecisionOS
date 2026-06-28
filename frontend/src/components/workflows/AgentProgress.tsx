import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, BrainCircuit, Search, Route, LayoutTemplate, MessageSquare, Handshake, Network } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  durationMs: number;
}

const AGENTS: Agent[] = [
  { id: "context", name: "Context Agent", description: "Parsing input and establishing baseline context...", icon: <LayoutTemplate size={20} />, durationMs: 1500 },
  { id: "knowledge", name: "Knowledge Agent", description: "Querying vector DB for playbooks, CRM, & docs...", icon: <Search size={20} />, durationMs: 2000 },
  { id: "decision", name: "Decision Agent", description: "Analyzing business context, identifying risks & opportunities...", icon: <BrainCircuit size={20} />, durationMs: 2500 },
  { id: "strategy", name: "Strategy Agent", description: "Formulating execution plan and next best actions...", icon: <Route size={20} />, durationMs: 2000 },
  { id: "reflection", name: "Reflection Agent", description: "Evaluating actions for alignment and safety...", icon: <MessageSquare size={20} />, durationMs: 1500 },
  { id: "approval", name: "Approval Agent", description: "Preparing Human-In-The-Loop review package...", icon: <Handshake size={20} />, durationMs: 1000 },
];

export function AgentProgress({ isCompleted = false }: { isCompleted?: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isCompleted) {
      setCurrentStep(AGENTS.length);
      return;
    }

    let timeout: NodeJS.Timeout;
    const runStep = (stepIndex: number) => {
      if (stepIndex >= AGENTS.length) return;
      setCurrentStep(stepIndex);
      timeout = setTimeout(() => {
        runStep(stepIndex + 1);
      }, AGENTS[stepIndex].durationMs);
    };

    runStep(0);
    return () => clearTimeout(timeout);
  }, [isCompleted]);

  return (
    <div className="max-w-2xl mx-auto w-full bg-card border border-border rounded-xl p-8 shadow-sm">
      <div className="flex items-center space-x-4 mb-8 border-b border-border pb-6">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Network size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">AI Executive Pipeline Running</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isCompleted ? "Analysis complete." : "Please wait while our autonomous agents analyze your data."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {AGENTS.map((agent, index) => {
          const isActive = currentStep === index;
          const isDone = currentStep > index || isCompleted;
          
          return (
            <div 
              key={agent.id} 
              className={`flex items-start space-x-4 transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : isDone ? 'opacity-70 scale-100' : 'opacity-30 scale-95'}`}
            >
              <div className="mt-1">
                {isDone ? (
                  <CheckCircle2 className="text-status-success" size={24} />
                ) : isActive ? (
                  <Loader2 className="text-primary animate-spin" size={24} />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`${isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {agent.icon}
                  </span>
                  <h3 className={`font-semibold ${isActive ? 'text-foreground' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {agent.name}
                  </h3>
                </div>
                <p className={`text-sm mt-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
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
