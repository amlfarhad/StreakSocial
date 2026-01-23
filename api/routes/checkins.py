"""
Check-ins API Routes
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter()

# In-memory storage for demo
checkins_db = {}


class CheckIn(BaseModel):
    id: str
    user_id: str
    goal_id: str
    caption: Optional[str]
    media_url: Optional[str]
    is_late: bool = False
    ai_analysis: Optional[dict] = None
    created_at: datetime


@router.post("/", response_model=CheckIn)
async def create_checkin(
    goal_id: str = Form(...),
    caption: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_id: str = "demo-user"
):
    """Submit a check-in for a goal"""
    checkin_id = str(uuid.uuid4())
    
    # If image provided, analyze with AI
    ai_analysis = None
    if image:
        from ai import analyze_checkin_photo
        from routes.goals import goals_db
        
        goal = goals_db.get(goal_id)
        if goal:
            image_bytes = await image.read()
            ai_analysis = analyze_checkin_photo(image_bytes, goal.title)
    
    new_checkin = CheckIn(
        id=checkin_id,
        user_id=user_id,
        goal_id=goal_id,
        caption=caption or (ai_analysis.get("caption_suggestion") if ai_analysis else None),
        media_url=None,  # Would be S3/Supabase URL in production
        is_late=False,
        ai_analysis=ai_analysis,
        created_at=datetime.now()
    )
    
    checkins_db[checkin_id] = new_checkin
    
    # Update streak (simplified)
    from routes.goals import goals_db
    if goal_id in goals_db:
        goals_db[goal_id].current_streak += 1
        if goals_db[goal_id].current_streak > goals_db[goal_id].longest_streak:
            goals_db[goal_id].longest_streak = goals_db[goal_id].current_streak
    
    return new_checkin


@router.get("/", response_model=List[CheckIn])
async def get_checkins(goal_id: Optional[str] = None, user_id: str = "demo-user"):
    """Get check-ins, optionally filtered by goal"""
    checkins = list(checkins_db.values())
    
    if goal_id:
        checkins = [c for c in checkins if c.goal_id == goal_id]
    
    return sorted(checkins, key=lambda x: x.created_at, reverse=True)


@router.get("/feed")
async def get_feed(user_id: str = "demo-user"):
    """Get social feed of recent check-ins"""
    # In production, this would filter by similar goals and followed users
    all_checkins = list(checkins_db.values())
    return sorted(all_checkins, key=lambda x: x.created_at, reverse=True)[:20]
