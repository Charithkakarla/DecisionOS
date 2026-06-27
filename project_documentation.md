# DecisionOS Project Documentation

## Project Overview
**DecisionOS** is an Enterprise Agentic Workflow & Autonomous Decision Orchestrator. The project is designed to handle complex decision-making workflows by employing multiple intelligent agents. It is divided into a robust FastAPI backend and a modern React/Vite frontend.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (with pgvector support as initialized on startup), accessed via SQLAlchemy.
- **Key Features**:
  - Modular agent-based architecture.
  - State management for workflows.
  - RESTful APIs for interacting with different agent modules.
  - CORS configuration to allow local frontend requests.
  
### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Language**: TypeScript

### Infrastructure
- **Containerization**: Docker & Docker Compose (`docker-compose.yml` for unified setup).

## Project Structure & Architecture

The project is structured into two main directories: `backend` and `frontend`.

### 1. Backend (`/backend`)
The backend is responsible for orchestrating the autonomous agents and managing data. The main application entry point is `app/main.py`.

**Agent Modules Built**:
- **Knowledge Agent** (`app/agents/knowledge`): Handles knowledge repository and database initialization.
- **Decision Agent** (`app/agents/decision`): Responsible for making autonomous decisions within workflows.
- **Strategy Agent** (`app/agents/strategy`): Formulates strategies and execution plans.
- **Reflection Agent** (`app/agents/reflection`): Evaluates past actions and decisions.
- **Approval Agent** (`app/agents/approval`): Manages approval workflows and user interventions.
- **Learning Agent** (`app/agents/learning`): Adapts and learns from previous workflows.
- **Workflows Agent/Manager** (`app/agents/workflows`): Orchestrates state transitions.
- **Dashboard API** (`app/agents/dashboard`): Provides data for the frontend UI.
- **Planner** (`app/agents/planner`): Contains the core workflow execution logic (`run_workflow`).

**Core Components**:
- **Database (`app/core/database.py`)**: Manages the connection to the database (likely SQLite `decision_os.db` for local dev or a full postgres instance in docker).
- **Schemas (`app/schemas`)**: Defines data models and state representations (e.g., `WorkflowState`).
- **Contracts (`app/contracts`)**: Defines interfaces between agents.

### 2. Frontend (`/frontend`)
The frontend is a React Single Page Application (SPA) providing a dashboard to visualize and interact with the decision workflows.

**Structure**:
- **`src/components`**: Reusable UI components.
- **`src/pages`**: Main application views/routes.
- **`src/modules`**: Domain-specific logic or UI modules.
- **`src/lib`**: Utility functions and API clients.
- **`src/types`**: TypeScript type definitions.
- **`src/App.tsx` & `src/main.tsx`**: Application root and routing configuration.
- **`src/index.css`**: Global styles including Tailwind directives.

## Getting Started

### Prerequisites
- Docker Desktop or Docker Engine + Docker Compose

### Setup & Run
1. Configure Environment Variables:
   - Navigate to `backend/`.
   - Copy `.env.example` to `.env`.
   - Add required API keys (e.g., Gemini or Grok).
2. Run the full stack from the project root:
   ```bash
   docker-compose up --build
   ```
3. Access the application:
   - **Frontend Dashboard**: `http://localhost:3000`
   - **Backend API Docs**: `http://localhost:8000/docs`

## Current Status
The fundamental architecture and module scaffolding for all agents (Knowledge, Decision, Strategy, Reflection, Approval, Learning, Workflows, Planner) have been built and integrated into the main FastAPI application. The frontend is set up with a modern React + Vite + Tailwind stack, ready to consume the backend APIs and present the Enterprise Agentic Workflows.
