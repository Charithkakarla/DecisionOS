# Contains: config.py implementation.
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentConfig(BaseModel):
    model: str
    temperature: float = 0.0
    max_tokens: int = 2000


class SystemAgentConfigs(BaseModel):
    context: AgentConfig = AgentConfig(model="gemini-1.5-flash", temperature=0.1, max_tokens=1500)
    knowledge: AgentConfig = AgentConfig(model="text-embedding-004", temperature=0.0, max_tokens=500)
    decision: AgentConfig = AgentConfig(model="gemini-1.5-flash", temperature=0.2, max_tokens=2500)
    strategy: AgentConfig = AgentConfig(model="gemini-1.5-flash", temperature=0.2, max_tokens=3000)


class Settings(BaseSettings):
    app_name: str = Field(default="Decision OS API")
    environment: str = Field(default="dev")
    database_url: str = Field(default="sqlite+aiosqlite:///./decision_os.db")
    context_provider: str = Field(default="mock")
    gemini_api_key: str | None = Field(default=None)
    gemini_model: str = Field(default="gemini-1.5-flash")
    grok_api_key: str | None = Field(default=None)
    grok_model: str = Field(default="grok-beta")
    grok_base_url: str = Field(default="https://api.x.ai/v1")
    
    # Redis caching config
    redis_url: str = Field(default="redis://127.0.0.1:6379/0")
    
    # Chunking configuration
    knowledge_chunk_size: int = Field(default=500)
    knowledge_chunk_overlap: int = Field(default=100)

    # Central Agent configurations
    agent_configs: SystemAgentConfigs = SystemAgentConfigs()

    model_config = SettingsConfigDict(env_prefix="DECISION_OS_", env_file=".env", extra="ignore")


settings = Settings()
