"""
Check-ins API Routes with Integrity Algorithm
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

router = APIRouter()

# In-memory storage for demo
checkins_db = {}

# Sample community check-ins for demo (these would come from real users)
sample_checkins = [
    {
        "id": "c1", "user_id": "user-sarah", "goal_id": "g1", "goal_title": "Morning yoga",
        "caption": "Day 45! 🧘‍♀️ Feeling stronger every day", "streak": 45, "total_days": 50,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=2)
    },
    {
        "id": "c2", "user_id": "user-mike", "goal_id": "g2", "goal_title": "Read daily",
        "caption": "Just finished Atomic Habits 📚", "streak": 23, "total_days": 30,
        "category": "learning", "created_at": datetime.now() - timedelta(hours=4)
    },
    {
        "id": "c3", "user_id": "user-emma", "goal_id": "g3", "goal_title": "Run 5K",
        "caption": "Rainy run but made it happen! 🌧️", "streak": 14, "total_days": 20,
        "category": "fitness", "created_at": datetime.now() - timedelta(hours=5)
    },
    {
        "id": "c4", "user_id": "user-alex", "goal_id": "g4", "goal_title": "Learn guitar",
        "caption": "Finally nailed that chord progression! 🎸", "streak": 30, "total_days": 35,
        "category": "creativity", "created_at": datetime.now() - timedelta(hours=8)
    },
    {
        "id": "c5", "user_id": "user-jordan", "goal_id": "g5", "goal_title": "Meditate",
        "caption": "60 days of calm 🧘 Mindfulness is life-changing", "streak": 60, "total_days": 65,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=10)
    },
    {
        "id": "c6", "user_id": "user-lisa", "goal_id": "g6", "goal_title": "Daily journaling",
        "caption": "Reflecting on gratitude today 📝", "streak": 90, "total_days": 95,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=12)
    },
    {
        "id": "c7", "user_id": "user-david", "goal_id": "g7", "goal_title": "100 pushups",
        "caption": "Week 8 complete! Getting stronger 💪", "streak": 56, "total_days": 60,
        "category": "fitness", "created_at": datetime.now() - timedelta(hours=14)
    },
]

# User data for display
users_data = {
    "user-sarah": {"display_name": "Sarah K.", "avatar": "👩‍🦰"},
    "user-mike": {"display_name": "Mike R.", "avatar": "👨‍🦱"},
    "user-emma": {"display_name": "Emma L.", "avatar": "👩"},
    "user-alex": {"display_name": "Alex T.", "avatar": "🧑"},
    "user-jordan": {"display_name": "Jordan P.", "avatar": "🧔"},
    "user-lisa": {"display_name": "Lisa M.", "avatar": "👩‍🦳"},
    "user-david": {"display_name": "David C.", "avatar": "👨"},
    "demo-user": {"display_name": "You", "avatar": "😊"},
}


class CheckIn(BaseModel):
    id: str
    user_id: str
    goal_id: str
    caption: Optional[str]
    media_url: Optional[str]
    is_late: bool = False
    ai_analysis: Optional[dict] = None
    created_at: datetime


class FeedItem(BaseModel):
    id: str
    user_id: str
    user_name: str
    avatar: str
    goal_title: str
    streak: int
    caption: str
    category: str
    integrity_score: float
    integrity_badge: str  # gold, silver, bronze, none
    consistency_rate: float
    time_ago: str
    created_at: datetime


def calculate_integrity_score(streak: int, total_days: int, hours_since: float) -> tuple:
    """
    The Integrity Algorithm™
    Returns (score, badge, consistency_rate)
    
    Formula:
    - streak_points = streak × 10
    - consistency_rate = streak / total_days (capped at 1)
    - consistency_bonus = consistency_rate × 50
    - recency_bonus = max(0, 100 - (hours_since × 2))
    
    Final score = streak_points + consistency_bonus + recency_bonus
    """
    if total_days == 0:
        total_days = 1
    
    consistency_rate = min(1.0, streak / total_days)
    
    streak_points = streak * 10
    consistency_bonus = consistency_rate * 50
    recency_bonus = max(0, 100 - (hours_since * 2))
    
    score = streak_points + consistency_bonus + recency_bonus
    
    # Determine badge based on consistency
    if consistency_rate >= 0.9:
        badge = "gold"
    elif consistency_rate >= 0.7:
        badge = "silver"
    elif consistency_rate >= 0.5:
        badge = "bronze"
    else:
        badge = "none"
    
    return score, badge, consistency_rate


def format_time_ago(dt: datetime) -> str:
    """Format datetime as human-readable time ago"""
    diff = datetime.now() - dt
    hours = diff.total_seconds() / 3600
    
    if hours < 1:
        return "Just now"
    elif hours < 24:
        return f"{int(hours)}h ago"
    elif hours < 48:
        return "Yesterday"
    else:
        return f"{int(hours / 24)}d ago"


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


@router.get("/feed", response_model=List[FeedItem])
async def get_feed(
    user_id: str = "demo-user",
    category: Optional[str] = Query(None, description="Filter by category"),
    friends_only: bool = Query(False, description="Show only friends' check-ins")
):
    """
    Get social feed of check-ins sorted by INTEGRITY SCORE.
    High streak consistency = High visibility (top of feed).
    
    The Integrity Algorithm™:
    - Rewards consistent check-in behavior
    - Gives bonus for recency
    - Ranks users with high consistency at the top
    """
    from routes.friends import friendships_db
    
    feed_items = []
    
    # Get friend IDs if filtering
    friend_ids = set()
    if friends_only:
        for fid, friendship in friendships_db.items():
            if friendship["status"] != "accepted":
                continue
            if friendship["requester_id"] == user_id:
                friend_ids.add(friendship["addressee_id"])
            elif friendship["addressee_id"] == user_id:
                friend_ids.add(friendship["requester_id"])
    
    # Process sample check-ins
    for checkin in sample_checkins:
        # Filter by category if specified
        if category and checkin["category"] != category:
            continue
        
        # Filter by friends if specified
        if friends_only and checkin["user_id"] not in friend_ids:
            continue
        
        # Calculate integrity score
        hours_since = (datetime.now() - checkin["created_at"]).total_seconds() / 3600
        score, badge, consistency = calculate_integrity_score(
            checkin["streak"],
            checkin["total_days"],
            hours_since
        )
        
        user = users_data.get(checkin["user_id"], {"display_name": "Unknown", "avatar": "👤"})
        
        feed_items.append(FeedItem(
            id=checkin["id"],
            user_id=checkin["user_id"],
            user_name=user["display_name"],
            avatar=user["avatar"],
            goal_title=checkin["goal_title"],
            streak=checkin["streak"],
            caption=checkin["caption"],
            category=checkin["category"],
            integrity_score=round(score, 1),
            integrity_badge=badge,
            consistency_rate=round(consistency * 100, 1),
            time_ago=format_time_ago(checkin["created_at"]),
            created_at=checkin["created_at"]
        ))
    
    # Sort by integrity score (descending) - THE INTEGRITY ALGORITHM
    feed_items.sort(key=lambda x: x.integrity_score, reverse=True)
    
    return feed_items
