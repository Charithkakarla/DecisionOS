import { useState, useRef, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { QuickAction } from "../components/ui/QuickAction";
import { KPICard } from "../components/ui/KPICard";
import { Upload, Link as LinkIcon, FileText, Database, Search, FileCode2, Loader2, ChevronRight } from "lucide-react";
import { api } from "../lib/api";

export function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [metrics, setMetrics] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [m, d] = await Promise.all([
        api.knowledge.getMetrics(),
        api.knowledge.getDocuments()
      ]);
      setMetrics(m);
      setDocuments(d);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setIsSearching(true);
      try {
        const results = await api.knowledge.search(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
        alert("Search failed. Check console for details.");
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await api.knowledge.upload(file);
      alert("File uploaded successfully and sent for background processing!");
      // Refresh data
      fetchData();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload document.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Knowledge Base" 
        description="Manage organizational context, upload transcripts, and inspect semantic embeddings."
      />

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Ingestion Pipelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload} 
          />
          <div onClick={() => fileInputRef.current?.click()}>
            <QuickAction 
              primary
              title={isUploading ? "Uploading..." : "Upload Documents"}
              description="Ingest PDFs, Transcripts, and DOCX files into pgvector"
              icon={isUploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
            />
          </div>
          <QuickAction 
            title="Connect Integrations"
            description="Sync with SharePoint, Google Drive, or Notion"
            icon={<LinkIcon size={24} />}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Repository Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard 
            title="Total Documents" 
            value={metrics?.documents_indexed ?? "0"} 
            icon={<FileText size={20} />} 
          />
          <KPICard 
            title="Vector Embeddings" 
            value={metrics?.chunks_generated ?? "0"} 
            icon={<Database size={20} />} 
          />
          <KPICard 
            title="Search Operations" 
            value={metrics?.search_operations ?? "—"}
            icon={<Search size={20} />} 
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Semantic Search Explorer</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]">
            <div className="p-4 border-b border-border bg-secondary">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="Search the knowledge base..." 
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p>Querying vector embeddings...</p>
                </div>
              ) : searchResults ? (
                <div className="space-y-4">
                  {searchResults.knowledge_results?.map((item: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-secondary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary">{item.document_name || "Unknown Document"}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">Score: {item.similarity_score.toFixed(3)}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{item.content}</p>
                    </div>
                  ))}
                  {(!searchResults.knowledge_results || searchResults.knowledge_results.length === 0) && (
                    <p className="text-center text-muted-foreground mt-8">No semantic matches found for this query.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Search className="mb-4 opacity-20" size={48} />
                  <p>Enter a query to view chunk similarities, L2 distances, and source citations.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Uploads</h2>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm h-[500px] overflow-y-auto">
            <div className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No documents uploaded.</p>
              ) : (
                documents.map((doc, i) => (
                  <div key={i} className="flex items-center p-3 bg-background rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors cursor-pointer">
                    <FileCode2 className="text-primary mr-3 flex-shrink-0" size={18} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(doc.size_bytes / 1024)} KB • {doc.status === "completed" ? "Indexed" : doc.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
