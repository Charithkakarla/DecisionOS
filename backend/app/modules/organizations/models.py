import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from app.agents.knowledge.repository import Base

class User(Base):
    __tablename__ = "core_users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="viewer", nullable=False) # admin, executive, reviewer, analyst, viewer
    organization_id = Column(String, ForeignKey("core_organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Organization(Base):
    __tablename__ = "core_organizations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)
    tier = Column(String, default="enterprise")
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "core_projects"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, ForeignKey("core_organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
