"""
Goals API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter()

# In-memory storage for demo (replace with Supabase in production)
goals_db = {}


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "general"
    frequency: str = "daily"  # daily or weekly


class Goal(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    category: str
    frequency: str
    current_streak: int = 0
    longest_streak: int = 0
    created_at: datetime


@router.post("/", response_model=Goal)
async def create_goal(goal: GoalCreate, user_id: str = "demo-user"):
    """Create a new goal"""
    goal_id = str(uuid.uuid4())
    
    new_goal = Goal(
        id=goal_id,
        user_id=user_id,
        title=goal.title,
        description=goal.description,
        category=goal.category,
        frequency=goal.frequency,
        current_streak=0,
        longest_streak=0,
        created_at=datetime.now()
    )
    
    goals_db[goal_id] = new_goal
    return new_goal


@router.get("/", response_model=List[Goal])
async def get_goals(user_id: str = "demo-user"):
    """Get all goals for a user"""
    return [g for g in goals_db.values() if g.user_id == user_id]


@router.get("/{goal_id}", response_model=Goal)
async def get_goal(goal_id: str):
    """Get a specific goal"""
    if goal_id not in goals_db:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goals_db[goal_id]


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str):
    """Delete a goal"""
    if goal_id not in goals_db:
        raise HTTPException(status_code=404, detail="Goal not found")
    del goals_db[goal_id]
    return {"message": "Goal deleted"}
