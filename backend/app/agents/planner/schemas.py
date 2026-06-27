# Contains: schemas.py implementation.
from pydantic import BaseModel


class PlannerConfig(BaseModel):
    max_steps: int = 10
