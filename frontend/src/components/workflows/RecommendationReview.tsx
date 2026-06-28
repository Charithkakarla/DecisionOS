import { useState } from "react";
import { Check, X, Edit2, AlertCircle, FileText, ChevronRight, ShieldCheck, Loader2 } from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  supporting_evidence: string;
  risk_level: string;
}

interface RecommendationReviewProps {
  workflowId: string;
  executionId: string;
  recommendations: Recommendation[];
  onAction: (action: 'accept' | 'reject' | 'modify', data: any) => Promise<void>;
}

export function RecommendationReview({ workflowId, executionId, recommendations, onAction }: RecommendationReviewProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const handleAction = async (recId: string, action: 'accept' | 'reject' | 'modify') => {
    setProcessingId(recId);
    try {
      // In a real application, you'd show a modal for 'modify' or 'reject' to get comments.
      // We pass some mock data for the action for now.
      await onAction(action, {
        workflow_id: workflowId,
        execution_id: executionId,
        reviewer: "user_123", // normally from auth context
        approval_comments: action === 'accept' ? "Looks good to me." : "Needs review.",
        state_snapshot: {} // In a real app, pass the full state
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-xl">
        <ShieldCheck className="mx-auto text-status-success mb-4" size={48} />
        <h3 className="text-xl font-semibold text-foreground mb-2">No further actions required</h3>
        <p className="text-muted-foreground">The AI agents did not identify any immediate next best actions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Next Best Actions</h2>
          <p className="text-muted-foreground">Human-in-the-loop review required before execution.</p>
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20">
          {recommendations.length} Pending
        </div>
      </div>

      <div className="space-y-6">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    {rec.title}
                    <span className={`ml-3 text-xs px-2 py-1 rounded-md font-medium border ${
                      rec.risk_level === 'High' ? 'bg-status-error-bg text-status-error border-status-error/20' :
                      rec.risk_level === 'Medium' ? 'bg-status-warning-bg text-status-warning border-status-warning/20' :
                      'bg-status-success-bg text-status-success border-status-success/20'
                    }`}>
                      {rec.risk_level} Risk
                    </span>
                    <span className="ml-2 text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground border border-border font-medium">
                      {(rec.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </h3>
                  <p className="text-foreground mt-2">{rec.description}</p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <div className="flex items-center space-x-2 text-primary font-medium mb-2">
                    <AlertCircle size={16} />
                    <h4>Reasoning</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                </div>
                
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <div className="flex items-center space-x-2 text-primary font-medium mb-2">
                    <FileText size={16} />
                    <h4>Supporting Evidence</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.supporting_evidence}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-secondary/50 px-6 py-4 border-t border-border flex items-center justify-end space-x-3">
              <button 
                disabled={processingId === rec.id}
                onClick={() => handleAction(rec.id, 'reject')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-status-error hover:bg-status-error-bg border border-transparent hover:border-status-error/20 transition-colors disabled:opacity-50"
              >
                {processingId === rec.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                <span>Reject</span>
              </button>
              <button 
                disabled={processingId === rec.id}
                onClick={() => handleAction(rec.id, 'modify')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary border border-border transition-colors disabled:opacity-50"
              >
                {processingId === rec.id ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
                <span>Modify</span>
              </button>
              <button 
                disabled={processingId === rec.id}
                onClick={() => handleAction(rec.id, 'accept')}
                className="flex items-center space-x-2 px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {processingId === rec.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Accept & Execute</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
