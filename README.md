# DecisionOS

DecisionOS is an Enterprise Agentic Workflow & Autonomous Decision Orchestrator. This project is divided into a FastAPI backend and a React/Vite frontend.

## Getting Started (Docker)

The easiest way to run the entire application stack is using Docker Compose.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Docker Compose

### 1. Setup Environment Variables
Before running, you need to configure your API keys. 
1. Navigate to the `backend/` directory.
2. Copy `.env.example` to `.env`.
3. Add your Gemini or Grok API keys to the `.env` file.

### 2. Run the Application
From the root directory of this project (where `docker-compose.yml` is located), run:

```bash
docker-compose up --build
```

### 3. Access the Application
- **Frontend Dashboard:** http://localhost:3000
- **Backend API Docs:** http://localhost:8000/docs
