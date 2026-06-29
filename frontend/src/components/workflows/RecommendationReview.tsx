import { useState } from "react";
import { Check, X, Edit2, AlertCircle, FileText, ShieldCheck, Loader2 } from "lucide-react";

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
      await onAction(action, {
        workflow_id: workflowId,
        execution_id: executionId,
        reviewer: "user_123",
        approval_comments: action === 'accept' ? "Looks good to me." : "Needs review.",
        state_snapshot: {}
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-card border border-border rounded-2xl">
        <div className="w-14 h-14 rounded-2xl bg-status-success-bg flex items-center justify-center mb-4">
          <ShieldCheck className="text-status-success" size={24} />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No further actions required</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">The AI agents did not identify any immediate next best actions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in slide-up duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Next Best Actions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Human-in-the-loop review required before execution.</p>
        </div>
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold border border-primary/20">
          {recommendations.length} Pending
        </span>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden hover:shadow-card-md transition-all">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-foreground">{rec.title}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${rec.risk_level === 'High' ? 'bg-status-error-bg text-status-error border-status-error/20' :
                        rec.risk_level === 'Medium' ? 'bg-status-warning-bg text-status-warning border-status-warning/20' :
                          'bg-status-success-bg text-status-success border-status-success/20'
                      }`}>
                      {rec.risk_level} Risk
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                      {(rec.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs mb-2">
                    <AlertCircle size={13} />
                    Reasoning
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.reasoning}</p>
                </div>
                <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs mb-2">
                    <FileText size={13} />
                    Supporting Evidence
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.supporting_evidence}</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/30 px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <button
                disabled={processingId === rec.id}
                onClick={() => handleAction(rec.id, 'reject')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-status-error hover:bg-status-error-bg border border-transparent hover:border-status-error/20 transition-all disabled:opacity-50"
              >
                {processingId === rec.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                Reject
              </button>
              <button
                disabled={processingId === rec.id}
                onClick={() => handleAction(rec.id, 'modify')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary border border-border transition-all disabled:opacity-50"
              >
                {processingId === rec.id ? <Loader2 size={13} className="animate-spin" /> : <Edit2 size={13} />}
                Modify
              </button>
              <button
                disabled={processingId === rec.id}
                onClick={() => handleAction(rec.id, 'accept')}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                {processingId === rec.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Accept & Execute
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
