import { useState, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { QuickAction } from "../components/ui/QuickAction";
import { Upload, FileText, Plus, Video, PlayCircle, Clock, CheckCircle, AlertTriangle, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function Workflows() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await api.workflows.list();
      setWorkflows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkflow = async () => {
    if (!selectedFile) return;
    setIsStarting(true);
    
    try {
      const text = await selectedFile.text();
      const response = await api.workflows.run(text);
      const runId = `wf_${Math.random().toString(36).substring(2, 7)}`;
      setIsModalOpen(false);
      navigate(`/workflows/${runId}`, { state: { initialData: response } });
    } catch (err) {
      console.error(err);
      alert("Failed to start workflow.");
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
      <PageHeader 
        title="Workflows" 
        description="Monitor, execute, and inspect your AI Executive Pipelines."
      />

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Start New Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onClick={() => setIsModalOpen(true)}>
            <QuickAction 
              primary
              title="Upload Transcript"
              description="Start pipeline from raw text or markdown"
              icon={<Plus size={24} />}
            />
          </div>
          <QuickAction 
            title="Import from Zoom"
            description="Sync latest meeting recordings"
            icon={<Video size={24} />}
          />
          <QuickAction 
            title="Trigger Integration"
            description="Start via Webhook or API"
            icon={<PlayCircle size={24} />}
          />
        </div>
      </section>

      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-foreground">Workflow History</h2>
          <div className="flex space-x-2 text-sm bg-secondary p-1 rounded-lg">
            <button className="px-4 py-1.5 bg-background text-foreground shadow-sm rounded-md font-medium">All</button>
            <button className="px-4 py-1.5 text-muted-foreground hover:text-foreground rounded-md font-medium transition-colors">Pending</button>
            <button className="px-4 py-1.5 text-muted-foreground hover:text-foreground rounded-md font-medium transition-colors">Completed</button>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-muted-foreground text-sm">
                <th className="p-4 font-medium">Workflow Run</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Confidence</th>
                <th className="p-4 font-medium">Trust Score</th>
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-background">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading workflows...
                  </td>
                </tr>
              ) : workflows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No workflows have been executed yet.
                  </td>
                </tr>
              ) : (
                workflows.map((row, i) => (
                  <tr key={i} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{row.id}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        row.type === "warning" ? "bg-status-warning-bg text-status-warning border border-status-warning/20" :
                        row.type === "success" ? "bg-status-success-bg text-status-success border border-status-success/20" :
                        "bg-status-error-bg text-status-error border border-status-error/20"
                      }`}>
                        {row.type === "warning" && <Clock size={12} />}
                        {row.type === "success" && <CheckCircle size={12} />}
                        {row.type === "error" && <AlertTriangle size={12} />}
                        <span>{row.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-sm text-foreground">{row.conf}</td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-foreground">{row.trust}</span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{row.time}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => navigate(`/workflows/${row.id}`)}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground tracking-tight">Run New Workflow</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-4">Upload a sales call transcript (.txt) to initialize the AI multi-agent pipeline.</p>
              
              <div 
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  selectedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/20"
                }`}
                onClick={() => document.getElementById('transcript-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="transcript-upload" 
                  accept=".txt"
                  className="hidden" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                
                {selectedFile ? (
                  <>
                    <FileText size={48} className="text-primary mb-3" />
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    <p className="text-sm text-primary mt-4 font-medium">Click to replace file</p>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4 text-muted-foreground">
                      <Upload size={28} />
                    </div>
                    <p className="font-medium text-foreground text-lg mb-1">Click to upload transcript</p>
                    <p className="text-sm text-muted-foreground">TXT files only</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex justify-end space-x-3 bg-secondary/30">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-lg font-medium border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleStartWorkflow}
                disabled={isStarting || !selectedFile}
                className="flex items-center justify-center space-x-2 px-6 py-2 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm min-w-[140px]"
              >
                {isStarting ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                <span>{isStarting ? "Executing..." : "Start Pipeline"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
