from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from app.agents.knowledge.repository import Base

class OrganizationalMemory(Base):
    __tablename__ = "organizational_memory"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String, index=True)
    artifact_id = Column(String, index=True)
    project_id = Column(String, index=True, nullable=True)
    department = Column(String, index=True, nullable=True)
    
    decision_history = Column(JSON, default=list)
    approval_history = Column(JSON, default=list)
    reflection_history = Column(JSON, default=list)
    reviewer_comments = Column(JSON, default=list)
    workflow_outcomes = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LearningHistory(Base):
    __tablename__ = "learning_history"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String, index=True)
    artifact_id = Column(String, index=True)
    execution_id = Column(String, index=True)
    
    learning_summary = Column(String)
    accepted_patterns = Column(JSON, default=list)
    rejected_patterns = Column(JSON, default=list)
    strategy_success_patterns = Column(JSON, default=list)
    common_risks = Column(JSON, default=list)
    common_failures = Column(JSON, default=list)
    reviewer_preferences = Column(JSON, default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningInsights(Base):
    __tablename__ = "learning_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String, index=True)
    insight_type = Column(String, index=True) # e.g., 'strategic', 'operational', 'risk'
    description = Column(String)
    confidence = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TrendMetrics(Base):
    __tablename__ = "trend_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String, index=True)
    metric_name = Column(String, index=True)
    metric_value = Column(Float, default=0.0)
    dimensions = Column(JSON, default=dict) # e.g., department, strategy_type
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PerformanceMetrics(Base):
    __tablename__ = "performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String, index=True)  # not unique — multiple executions per workflow
    execution_id = Column(String, index=True, unique=True)  # unique per execution run
    
    approval_rate = Column(Float, default=0.0)
    strategy_success_rate = Column(Float, default=0.0)
    trust_score = Column(Float, default=0.0)
    estimated_roi = Column(Float, default=0.0)
    review_duration_seconds = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KnowledgeRecommendations(Base):
    __tablename__ = "knowledge_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String, index=True)
    recommendation_type = Column(String, index=True) # e.g., 'prompt_update', 'playbook_update'
    target = Column(String) # e.g., 'planner_prompt', 'sales_playbook.md'
    suggestion = Column(String)
    reasoning = Column(String)
    status = Column(String, default="pending") # pending, applied, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
