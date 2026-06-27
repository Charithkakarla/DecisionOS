# Contains: registry.py implementation.
from typing import Any
from app.agents.context.service import ContextService
from app.agents.knowledge.service import KnowledgeService
from app.agents.decision.service import DecisionService
from app.agents.strategy.service import StrategyService
from app.agents.reflection.service import ReflectionService
from app.agents.approval.service import ApprovalService

class AgentRegistry:
    def __init__(self) -> None:
        self._registry = {}

    def register(self, name: str, agent: Any) -> None:
        self._registry[name] = agent

    def get(self, name: str) -> Any:
        return self._registry.get(name)

# Initialize the central Agent Registry and register services
agent_registry = AgentRegistry()
agent_registry.register("context", ContextService())
agent_registry.register("knowledge", KnowledgeService())
agent_registry.register("decision", DecisionService())
agent_registry.register("strategy", StrategyService())
agent_registry.register("reflection", ReflectionService())
agent_registry.register("approval", ApprovalService())
