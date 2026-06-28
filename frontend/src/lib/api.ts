const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const api = {
  knowledge: {
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`${API_BASE_URL}/knowledge/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    
    search: async (query: string) => {
      const response = await fetch(`${API_BASE_URL}/knowledge/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5 }),
      });
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },

    getMetrics: async () => {
      const response = await fetch(`${API_BASE_URL}/knowledge/metrics`);
      if (!response.ok) throw new Error("Failed to get metrics");
      return response.json();
    },

    getDocuments: async () => {
      const response = await fetch(`${API_BASE_URL}/knowledge/documents`);
      if (!response.ok) throw new Error("Failed to get documents");
      return response.json();
    }
  },
  
  workflows: {
    run: async (transcript: string) => {
      const initialState = {
        transcript,
      };
      
      const response = await fetch(`${API_BASE_URL}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialState),
      });
      if (!response.ok) throw new Error("Workflow run failed");
      return response.json();
    },

    list: async () => {
      const response = await fetch(`${API_BASE_URL}/workflows/`);
      if (!response.ok) throw new Error("Failed to list workflows");
      return response.json();
    },

    getState: async (runId: string) => {
      const response = await fetch(`${API_BASE_URL}/workflows/${runId}/state`);
      if (!response.ok) throw new Error("Failed to load workflow state");
      return response.json();
    }
  },

  dashboard: {
    getMetrics: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/metrics`);
      if (!response.ok) throw new Error("Failed to get dashboard metrics");
      return response.json();
    }
  },

  approval: {
    submit: async (data: { workflow_id: string, execution_id: string, reviewer: string, approval_comments?: string, approval_reason?: string, approval_confidence?: number, business_owner?: string, department?: string, review_duration_seconds?: number, feedback_items?: string[], state_snapshot: any }) => {
      const response = await fetch(`${API_BASE_URL}/approval/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Approval submission failed");
      return response.json();
    },
    reject: async (data: { workflow_id: string, execution_id: string, reviewer: string, approval_comments?: string, approval_reason?: string, business_owner?: string, department?: string, feedback_items?: string[], state_snapshot: any }) => {
      const response = await fetch(`${API_BASE_URL}/approval/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Approval rejection failed");
      return response.json();
    },
    modify: async (data: { workflow_id: string, execution_id: string, reviewer: string, approval_comments?: string, modified_sections: any, approval_confidence?: number, business_owner?: string, department?: string, review_duration_seconds?: number, feedback_items?: string[], state_snapshot: any }) => {
      const response = await fetch(`${API_BASE_URL}/approval/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Approval modification failed");
      return response.json();
    }
  }
};
