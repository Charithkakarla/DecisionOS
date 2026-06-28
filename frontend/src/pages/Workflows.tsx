import { useState } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { Upload, FileText, ArrowRight, Loader2, Link2, Mail, MessageSquare } from "lucide-react";
import { api } from "../lib/api";
import { AgentProgress } from "../components/workflows/AgentProgress";
import { RecommendationReview } from "../components/workflows/RecommendationReview";

type WorkflowStage = "INPUT" | "ANALYZING" | "RESULTS";

export function Workflows() {
  const [stage, setStage] = useState<WorkflowStage>("INPUT");
  const [inputText, setInputText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  
  // State from backend
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const handleStartAnalysis = async () => {
    if (!inputText.trim()) return;
    
    setStage("ANALYZING");
    setIsCompleted(false);

    try {
      const response = await api.workflows.run(inputText);
      setWorkflowState(response);
      
      // Extract recommendations from either decision_artifact or strategy_artifact
      let recs: any[] = [];
      if (response.decision_artifact?.payload?.recommendations) {
        recs = response.decision_artifact.payload.recommendations;
      } else if (response.strategy_artifact?.payload?.recommendations) {
        recs = response.strategy_artifact.payload.recommendations;
      }
      
      setRecommendations(recs);
      setIsCompleted(true);
      
      // Give the AgentProgress a tiny bit of time to show completion before moving to results
      setTimeout(() => {
        setStage("RESULTS");
      }, 800);
      
    } catch (err) {
      console.error(err);
      alert("Failed to run workflow. See console for details.");
      setStage("INPUT");
    }
  };

  const handleRecommendationAction = async (action: 'accept' | 'reject' | 'modify', data: any) => {
    try {
      if (action === 'accept') {
        await api.approval.submit(data);
      } else if (action === 'reject') {
        await api.approval.reject(data);
      } else if (action === 'modify') {
        await api.approval.modify(data);
      }
      // Assuming successful action, we'd probably want to move to a completed state
      // or navigate away, but for now we'll just alert and reset.
      alert(`Action '${action}' submitted successfully!`);
      
      // Reset after handling
      setStage("INPUT");
      setInputText("");
      setWorkflowState(null);
      setRecommendations([]);
    } catch (error) {
      console.error("Failed to submit approval action", error);
      alert("Failed to submit action. See console.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setInputText(event.target.result.toString());
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Workflows" 
        description="Monitor, execute, and inspect your AI Executive Pipelines."
      />

      {stage === "INPUT" && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
          <div className="p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Input Data Source</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Paste or type content for the agents to analyze. This can be meeting transcripts, CRM notes, emails, or internal playbooks.
            </p>
            
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste transcript or notes here..."
              className="w-full h-64 p-4 rounded-lg bg-background border border-border text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow mb-4"
            />
            
            <button 
              onClick={handleStartAnalysis}
              disabled={!inputText.trim()}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              <span>Analyze Content</span>
              <ArrowRight size={18} />
            </button>
          </div>
          
          <div className="p-8 md:w-1/2 bg-secondary/30 flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Or upload a file</h3>
            
            <div 
              className="relative border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-10 flex flex-col items-center justify-center bg-background transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input 
                type="file" 
                id="file-upload" 
                accept=".txt,.md,.csv"
                className="hidden" 
                onChange={handleFileUpload}
              />
              <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4 text-muted-foreground">
                <Upload size={28} />
              </div>
              <p className="font-medium text-foreground text-center">Click or drag file to upload</p>
              <p className="text-sm text-muted-foreground mt-1 text-center">Supports TXT, MD, CSV</p>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 text-sm text-muted-foreground bg-background p-3 rounded-lg border border-border">
                <Link2 size={16} className="text-primary" />
                <span>CRM Integrations</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground bg-background p-3 rounded-lg border border-border">
                <Mail size={16} className="text-primary" />
                <span>Email Sync</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground bg-background p-3 rounded-lg border border-border">
                <MessageSquare size={16} className="text-primary" />
                <span>Slack / Teams</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground bg-background p-3 rounded-lg border border-border">
                <FileText size={16} className="text-primary" />
                <span>Zoom Transcripts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "ANALYZING" && (
        <AgentProgress isCompleted={isCompleted} />
      )}

      {stage === "RESULTS" && workflowState && (
        <RecommendationReview 
          workflowId={workflowState.workflow_id}
          executionId={workflowState.execution_id}
          recommendations={recommendations}
          onAction={handleRecommendationAction}
        />
      )}
    </div>
  );
}
