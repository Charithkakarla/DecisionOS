import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";

import { Dashboard } from "./pages/Dashboard";
import { Workflows } from "./pages/Workflows";
import { WorkflowDetails } from "./pages/WorkflowDetails";
import { WorkflowHistory } from "./pages/WorkflowHistory";
import { KnowledgeBase as Knowledge } from "./pages/KnowledgeBase";
import { Analytics } from "./pages/Analytics";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { Pipeline } from "./pages/Pipeline";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/workflows/:id" element={<WorkflowDetails />} />
        <Route path="/history" element={<WorkflowHistory />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Layout>
  );
}
