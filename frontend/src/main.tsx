import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { WorkflowTabProvider } from "./lib/workflowTabContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WorkflowTabProvider>
        <App />
      </WorkflowTabProvider>
    </BrowserRouter>
  </React.StrictMode>
);
