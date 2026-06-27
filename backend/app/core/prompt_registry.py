# Contains: prompt_registry.py implementation.
from typing import Dict

class PromptRegistry:
    def __init__(self) -> None:
        self._prompts: Dict[str, Dict[str, Dict[str, str]]] = {
            "context": {
                "v1": {
                    "system": "You are the Context Intelligence Agent of DecisionOS. Extract structured business context from the conversation transcript.",
                    "user": "Transcript:\n{transcript}"
                }
            },
            "decision": {
                "v1": {
                    "system": "You are the Decision Intelligence Agent. Analyze context and evidence to make optimal choices.",
                    "user": "Context:\n{context_json}\nEvidence:\n{evidence_json}"
                }
            },
            "strategy": {
                "v1": {
                    "system": "You are the Strategy Intelligence Agent. Build strategic plans, scenarios, and roadmap milestones.",
                    "user": "Decision:\n{decision_package_json}\nContext:\n{context_json}\nOptimization:\n{optimization_result_json}"
                }
            }
        }

    def get_prompt(self, agent_name: str, version: str, prompt_type: str) -> str:
        """Retrieve a registered prompt by agent, version, and type (system/user)."""
        agent = self._prompts.get(agent_name.lower())
        if not agent:
            # Return a stub or raise
            return f"Stub system prompt for {agent_name}."
        
        ver = agent.get(version.lower())
        if not ver:
            available_versions = list(agent.keys())
            if not available_versions:
                return f"Stub system prompt for {agent_name}."
            ver = agent[available_versions[0]]
            
        prompt = ver.get(prompt_type.lower())
        if not prompt:
            return f"Stub prompt for {agent_name} {prompt_type}."
            
        return prompt

prompt_registry = PromptRegistry()
