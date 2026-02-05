"""
Challenges & Competitions System
Time-bound challenges users can join and compete in
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

router = APIRouter()

# ============================================
# CHALLENGE DEFINITIONS
# ============================================
CHALLENGES = {
    "7day-fitness": {
        "id": "7day-fitness",
        "name": "7-Day Fitness Blitz",
        "description": "Complete 7 days of fitness activities",
        "emoji": "💪",
        "category": "fitness",
        "duration_days": 7,
        "goal_checkins": 7,
        "prize_emoji": "🏆",
        "prize_name": "Fitness Champion Badge",
        "xp_reward": 100,
        "participants": 847
    },
    "21day-reading": {
        "id": "21day-reading",
        "name": "21-Day Reading Sprint",
        "description": "Read every day for 21 days",
        "emoji": "📚",
        "category": "learning",
        "duration_days": 21,
        "goal_checkins": 21,
        "prize_emoji": "📖",
        "prize_name": "Bookworm Elite",
        "xp_reward": 200,
        "participants": 523
    },
    "30day-mindfulness": {
        "id": "30day-mindfulness",
        "name": "30-Day Mindfulness Journey",
        "description": "Meditate or journal for 30 days straight",
        "emoji": "🧘",
        "category": "wellness",
        "duration_days": 30,
        "goal_checkins": 30,
        "prize_emoji": "🕊️",
        "prize_name": "Zen Master",
        "xp_reward": 300,
        "participants": 412
    },
    "weekly-warrior": {
        "id": "weekly-warrior",
        "name": "Weekly Warrior",
        "description": "Complete all your goals every day this week",
        "emoji": "⚔️",
        "category": "productivity",
        "duration_days": 7,
        "goal_checkins": 7,
        "prize_emoji": "🔥",
        "prize_name": "Warrior Badge",
        "xp_reward": 75,
        "participants": 1234
    },
    "sunrise-club": {
        "id": "sunrise-club",
        "name": "Sunrise Club",
        "description": "Check in before 7 AM for 5 days",
        "emoji": "🌅",
        "category": "lifestyle",
        "duration_days": 7,
        "goal_checkins": 5,
        "prize_emoji": "☀️",
        "prize_name": "Early Riser",
        "xp_reward": 60,
        "participants": 678
    },
}

# In-memory storage
challenge_participants_db = {}  # challenge_id -> {user_id: {joined_at, checkins, completed}}

# Pre-populate with demo data
challenge_participants_db["7day-fitness"] = {
    "demo-user": {"joined_at": datetime.now() - timedelta(days=3), "checkins": 3, "completed": False},
    "user-sarah": {"joined_at": datetime.now() - timedelta(days=5), "checkins": 5, "completed": False},
    "user-mike": {"joined_at": datetime.now() - timedelta(days=7), "checkins": 7, "completed": True},
    "user-jordan": {"joined_at": datetime.now() - timedelta(days=4), "checkins": 4, "completed": False},
}
challenge_participants_db["21day-reading"] = {
    "user-emma": {"joined_at": datetime.now() - timedelta(days=15), "checkins": 15, "completed": False},
    "user-alex": {"joined_at": datetime.now() - timedelta(days=21), "checkins": 21, "completed": True},
}


# ============================================
# MODELS
# ============================================
class Challenge(BaseModel):
    id: str
    name: str
    description: str
    emoji: str
    category: str
    duration_days: int
    goal_checkins: int
    prize_emoji: str
    prize_name: str
    xp_reward: int
    participants: int
    user_joined: bool = False
    user_progress: int = 0
    user_completed: bool = False
    ends_in: Optional[str] = None


class ChallengeLeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    user_name: str
    avatar: str
    checkins: int
    progress_percent: float
    completed: bool
    is_current_user: bool = False


class ChallengeProgress(BaseModel):
    challenge_id: str
    checkins: int
    goal: int
    progress_percent: float
    days_remaining: int
    completed: bool


# ============================================
# HELPER FUNCTIONS
# ============================================
def get_user_display(user_id: str) -> dict:
    """Get user display info"""
    from routes.friends import users_db
    user = users_db.get(user_id, {"display_name": "Unknown", "avatar": "👤"})
    return {"name": user.get("display_name", "Unknown"), "avatar": user.get("avatar", "👤")}


# ============================================
# ROUTES
# ============================================
@router.get("/active", response_model=List[Challenge])
async def get_active_challenges(user_id: str = "demo-user"):
    """Get all active challenges with user participation status"""
    result = []
    
    for cid, challenge in CHALLENGES.items():
        participants = challenge_participants_db.get(cid, {})
        user_data = participants.get(user_id, {})
        
        # Calculate ends_in
        if user_data.get("joined_at"):
            end_date = user_data["joined_at"] + timedelta(days=challenge["duration_days"])
            days_left = (end_date - datetime.now()).days
            ends_in = f"{days_left} days" if days_left > 0 else "Ended"
        else:
            ends_in = None
        
        result.append(Challenge(
            id=challenge["id"],
            name=challenge["name"],
            description=challenge["description"],
            emoji=challenge["emoji"],
            category=challenge["category"],
            duration_days=challenge["duration_days"],
            goal_checkins=challenge["goal_checkins"],
            prize_emoji=challenge["prize_emoji"],
            prize_name=challenge["prize_name"],
            xp_reward=challenge["xp_reward"],
            participants=challenge["participants"] + len(participants),
            user_joined=user_id in participants,
            user_progress=user_data.get("checkins", 0),
            user_completed=user_data.get("completed", False),
            ends_in=ends_in
        ))
    
    return result


@router.post("/join/{challenge_id}")
async def join_challenge(challenge_id: str, user_id: str = "demo-user"):
    """Join a challenge"""
    if challenge_id not in CHALLENGES:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if challenge_id not in challenge_participants_db:
        challenge_participants_db[challenge_id] = {}
    
    if user_id in challenge_participants_db[challenge_id]:
        raise HTTPException(status_code=400, detail="Already joined this challenge")
    
    challenge_participants_db[challenge_id][user_id] = {
        "joined_at": datetime.now(),
        "checkins": 0,
        "completed": False
    }
    
    challenge = CHALLENGES[challenge_id]
    return {
        "success": True,
        "message": f"You joined {challenge['name']}! 🎉",
        "challenge": challenge["name"],
        "goal": challenge["goal_checkins"],
        "duration": challenge["duration_days"]
    }


@router.post("/leave/{challenge_id}")
async def leave_challenge(challenge_id: str, user_id: str = "demo-user"):
    """Leave a challenge"""
    if challenge_id not in challenge_participants_db:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if user_id not in challenge_participants_db[challenge_id]:
        raise HTTPException(status_code=400, detail="Not in this challenge")
    
    del challenge_participants_db[challenge_id][user_id]
    return {"success": True, "message": "Left the challenge"}


@router.post("/checkin/{challenge_id}")
async def record_challenge_checkin(challenge_id: str, user_id: str = "demo-user"):
    """Record a check-in for a challenge"""
    if challenge_id not in challenge_participants_db:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if user_id not in challenge_participants_db[challenge_id]:
        raise HTTPException(status_code=400, detail="Not in this challenge")
    
    challenge = CHALLENGES[challenge_id]
    user_data = challenge_participants_db[challenge_id][user_id]
    
    user_data["checkins"] += 1
    
    # Check if completed
    newly_completed = False
    if user_data["checkins"] >= challenge["goal_checkins"] and not user_data["completed"]:
        user_data["completed"] = True
        newly_completed = True
    
    return {
        "success": True,
        "checkins": user_data["checkins"],
        "goal": challenge["goal_checkins"],
        "completed": user_data["completed"],
        "newly_completed": newly_completed,
        "xp_reward": challenge["xp_reward"] if newly_completed else 0
    }


@router.get("/{challenge_id}/leaderboard", response_model=List[ChallengeLeaderboardEntry])
async def get_challenge_leaderboard(challenge_id: str, user_id: str = "demo-user"):
    """Get leaderboard for a specific challenge"""
    if challenge_id not in CHALLENGES:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    challenge = CHALLENGES[challenge_id]
    participants = challenge_participants_db.get(challenge_id, {})
    
    entries = []
    for uid, data in participants.items():
        user_info = get_user_display(uid)
        entries.append({
            "user_id": uid,
            "user_name": user_info["name"],
            "avatar": user_info["avatar"],
            "checkins": data["checkins"],
            "progress_percent": round((data["checkins"] / challenge["goal_checkins"]) * 100, 1),
            "completed": data["completed"],
            "is_current_user": uid == user_id
        })
    
    # Sort by checkins (descending)
    entries.sort(key=lambda x: (-x["checkins"], -int(x["completed"])))
    
    # Add ranks
    result = []
    for i, entry in enumerate(entries):
        result.append(ChallengeLeaderboardEntry(
            rank=i + 1,
            **entry
        ))
    
    return result


@router.get("/{challenge_id}/progress", response_model=ChallengeProgress)
async def get_user_challenge_progress(challenge_id: str, user_id: str = "demo-user"):
    """Get user's progress in a challenge"""
    if challenge_id not in CHALLENGES:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    challenge = CHALLENGES[challenge_id]
    
    if challenge_id not in challenge_participants_db or user_id not in challenge_participants_db[challenge_id]:
        raise HTTPException(status_code=404, detail="Not participating in this challenge")
    
    user_data = challenge_participants_db[challenge_id][user_id]
    
    end_date = user_data["joined_at"] + timedelta(days=challenge["duration_days"])
    days_left = max(0, (end_date - datetime.now()).days)
    
    return ChallengeProgress(
        challenge_id=challenge_id,
        checkins=user_data["checkins"],
        goal=challenge["goal_checkins"],
        progress_percent=round((user_data["checkins"] / challenge["goal_checkins"]) * 100, 1),
        days_remaining=days_left,
        completed=user_data["completed"]
    )
