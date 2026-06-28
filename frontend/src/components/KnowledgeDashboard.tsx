// Contains: KnowledgeDashboard.tsx implementation.
import { useState, useEffect } from "react";
import { EvidencePackage } from "../types/agent";
import { api } from "../lib/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface DocumentInfo {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  department: string | null;
  owner: string | null;
  version: string | null;
  tags: string[];
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Metrics {
  documents_indexed: number;
  chunks_generated: number;
  average_embedding_time_ms: number;
  average_retrieval_time_ms: number;
  average_similarity: number;
}

export default function KnowledgeDashboard() {
  // Document states
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);


  // Upload states
  const [file, setFile] = useState<File | null>(null);
  const [department, setDepartment] = useState("");
  const [owner, setOwner] = useState("");
  const [version, setVersion] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Search sandbox states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDept, setSearchDept] = useState("");
  const [searchOwner, setSearchOwner] = useState("");
  const [searchVersion, setSearchVersion] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [searchLimit] = useState(5);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EvidencePackage | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load docs and metrics once on mount
  useEffect(() => {
    fetchDocsAndMetrics();
  }, []);

  // Poll only while at least one document is still processing
  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocsAndMetrics();
    }, 3000);
    return () => clearInterval(interval);
  }, [documents]);

  const fetchDocsAndMetrics = async () => {
    try {
      const [docsData, metricsData] = await Promise.all([
        api.knowledge.getDocuments(),
        api.knowledge.getMetrics(),
      ]);
      setDocuments(docsData);
      setMetrics(metricsData);
    } catch (e) {
      console.error("Failed to load documents or metrics", e);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    if (department) formData.append("department", department);
    if (owner) formData.append("owner", owner);
    if (version) formData.append("version", version);
    if (tags) formData.append("tags", tags);

    try {
      const response = await fetch(`${API_BASE_URL}/knowledge/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Upload failed");
      }

      setUploadSuccess(true);
      setFile(null);
      setDepartment("");
      setOwner("");
      setVersion("");
      setTags("");
      // Reset file input element
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      await fetchDocsAndMetrics();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unexpected error during upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/knowledge/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchDocsAndMetrics();
      } else {
        alert("Failed to delete document.");
      }
    } catch (e) {
      console.error("Error deleting document", e);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setSearchResults(null);

    const payload = {
      query: searchQuery,
      department: searchDept || null,
      owner: searchOwner || null,
      version: searchVersion || null,
      tags: searchTags ? searchTags.split(",").map((t) => t.trim()) : null,
      limit: searchLimit,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/knowledge/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Search query failed");
      }

      const result: EvidencePackage = await response.json();
      setSearchResults(result);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Unexpected error during search");
    } finally {
      setSearching(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Docs Indexed</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{metrics.documents_indexed}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chunks Created</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{metrics.chunks_generated}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Embedding Time</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{metrics.average_embedding_time_ms.toFixed(1)} ms</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Retrieval Time</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{metrics.average_retrieval_time_ms.toFixed(1)} ms</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Similarity</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{(metrics.average_similarity * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 2. Upload Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-4">Ingest Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select File (.pdf, .docx, .txt)</label>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
              <input
                type="text"
                placeholder="e.g. Sales, Legal, Operations"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input
                type="text"
                placeholder="e.g. John Doe, Compliance Team"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
                <input
                  type="text"
                  placeholder="e.g. 1.2"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. playbook, sop"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
            >
              {uploading ? "Ingesting in background..." : "Ingest Document"}
            </button>
            {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
            {uploadSuccess && <p className="text-xs text-emerald-600">✓ Ingestion started. File is processing in background.</p>}
          </form>
        </div>

        {/* 3. Documents List Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-4">Enterprise Knowledge Assets</h2>
          <div className="flex-1 overflow-auto max-h-[360px]">
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No documents uploaded yet.</p>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                  <tr>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Metadata</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 text-xs">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">{formatSize(doc.size_bytes)} • {doc.mime_type.split("/")[1]}</p>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.department && <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-600">Dept: {doc.department}</span>}
                          {doc.owner && <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-600">Owner: {doc.owner}</span>}
                          {doc.version && <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-600">V: {doc.version}</span>}
                          {doc.tags.map((tag) => (
                            <span key={tag} className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-semibold text-emerald-700">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          doc.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                          doc.status === "failed" ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-800 animate-pulse"
                        }`}>
                          {doc.status}
                        </span>
                        {doc.error_message && <p className="text-[9px] text-rose-500 mt-1 max-w-[150px] truncate" title={doc.error_message}>{doc.error_message}</p>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 4. Search Sandbox Tester */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-4">Hybrid Search Sandbox</h2>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter search query term (hybrid keyword + semantic vector)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <details className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <summary className="font-semibold cursor-pointer select-none">Advanced Filters</summary>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block mb-1">Filter Department</label>
                <input
                  type="text"
                  placeholder="Sales"
                  value={searchDept}
                  onChange={(e) => setSearchDept(e.target.value)}
                  className="w-full rounded border border-slate-300 p-1 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block mb-1">Filter Owner</label>
                <input
                  type="text"
                  value={searchOwner}
                  onChange={(e) => setSearchOwner(e.target.value)}
                  className="w-full rounded border border-slate-300 p-1 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block mb-1">Filter Version</label>
                <input
                  type="text"
                  value={searchVersion}
                  onChange={(e) => setSearchVersion(e.target.value)}
                  className="w-full rounded border border-slate-300 p-1 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block mb-1">Filter Tags (comma-separated)</label>
                <input
                  type="text"
                  value={searchTags}
                  onChange={(e) => setSearchTags(e.target.value)}
                  className="w-full rounded border border-slate-300 p-1 text-xs outline-none"
                />
              </div>
            </div>
          </details>
        </form>

        {/* 5. Search Results display */}
        {searchError && <p className="text-sm text-rose-600 mt-4">{searchError}</p>}
        
        {searchResults && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">
              <span className="text-xs font-semibold text-emerald-800">Citations Assembled: {searchResults.citations.length}</span>
              <span className="text-xs font-semibold text-emerald-800">Overall Relevance Confidence: {(searchResults.confidence_score * 100).toFixed(1)}%</span>
            </div>
            
            <div className="space-y-3">
              {searchResults.knowledge_results.map((res) => (
                <div key={res.id} className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">{res.citation}</span>
                    <span className="text-xs font-semibold text-emerald-600">Relevance: {(res.similarity_score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-mono bg-slate-50/50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap">{res.content}</p>
                </div>
              ))}
              {searchResults.knowledge_results.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">No matching knowledge assets found for query.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
