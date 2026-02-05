"""
Achievements & Gamification System
Tracks user achievements, XP, levels, and streak milestones
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter()

# ============================================
# ACHIEVEMENT DEFINITIONS
# ============================================
ACHIEVEMENTS = {
    # Streak Milestones
    "first_checkin": {
        "id": "first_checkin",
        "name": "First Step",
        "description": "Complete your first check-in",
        "emoji": "👟",
        "points": 10,
        "category": "milestone"
    },
    "week_warrior": {
        "id": "week_warrior",
        "name": "Week Warrior",
        "description": "Maintain a 7-day streak",
        "emoji": "🔥",
        "points": 50,
        "category": "streak"
    },
    "habit_former": {
        "id": "habit_former",
        "name": "Habit Former",
        "description": "Reach a 21-day streak",
        "emoji": "💎",
        "points": 150,
        "category": "streak"
    },
    "monthly_master": {
        "id": "monthly_master",
        "name": "Monthly Master",
        "description": "Achieve a 30-day streak",
        "emoji": "👑",
        "points": 200,
        "category": "streak"
    },
    "century_club": {
        "id": "century_club",
        "name": "Century Club",
        "description": "100 days of consistency",
        "emoji": "💯",
        "points": 500,
        "category": "streak"
    },
    
    # Time-based
    "early_bird": {
        "id": "early_bird",
        "name": "Early Bird",
        "description": "Check in before 7 AM",
        "emoji": "🌅",
        "points": 25,
        "category": "time"
    },
    "night_owl": {
        "id": "night_owl",
        "name": "Night Owl",
        "description": "Check in after 10 PM",
        "emoji": "🦉",
        "points": 25,
        "category": "time"
    },
    "weekend_warrior": {
        "id": "weekend_warrior",
        "name": "Weekend Warrior",
        "description": "Complete 5 weekend check-ins",
        "emoji": "🏆",
        "points": 40,
        "category": "time"
    },
    
    # Social
    "social_butterfly": {
        "id": "social_butterfly",
        "name": "Social Butterfly",
        "description": "Add 5 friends",
        "emoji": "🦋",
        "points": 30,
        "category": "social"
    },
    "cheerleader": {
        "id": "cheerleader",
        "name": "Cheerleader",
        "description": "Like 10 friend check-ins",
        "emoji": "📣",
        "points": 20,
        "category": "social"
    },
    "community_star": {
        "id": "community_star",
        "name": "Community Star",
        "description": "Receive 50 likes on your check-ins",
        "emoji": "⭐",
        "points": 100,
        "category": "social"
    },
    
    # Goal mastery
    "multi_tasker": {
        "id": "multi_tasker",
        "name": "Multi-Tasker",
        "description": "Have 3 active goals",
        "emoji": "🎯",
        "points": 35,
        "category": "goals"
    },
    "goal_crusher": {
        "id": "goal_crusher",
        "name": "Goal Crusher",
        "description": "Complete 50 total check-ins",
        "emoji": "💪",
        "points": 75,
        "category": "goals"
    },
    "perfectionist": {
        "id": "perfectionist",
        "name": "Perfectionist",
        "description": "100% consistency for a month",
        "emoji": "🥇",
        "points": 250,
        "category": "goals"
    },
    
    # Challenge achievements
    "challenger": {
        "id": "challenger",
        "name": "Challenger",
        "description": "Join your first challenge",
        "emoji": "🏁",
        "points": 20,
        "category": "challenges"
    },
    "challenge_champion": {
        "id": "challenge_champion",
        "name": "Challenge Champion",
        "description": "Win a challenge",
        "emoji": "🏅",
        "points": 150,
        "category": "challenges"
    },
}

# XP Level thresholds
LEVELS = [
    {"level": 1, "name": "Beginner", "min_xp": 0, "emoji": "🌱"},
    {"level": 2, "name": "Explorer", "min_xp": 50, "emoji": "🌿"},
    {"level": 3, "name": "Achiever", "min_xp": 150, "emoji": "🌳"},
    {"level": 4, "name": "Dedicated", "min_xp": 300, "emoji": "🔥"},
    {"level": 5, "name": "Champion", "min_xp": 500, "emoji": "⭐"},
    {"level": 6, "name": "Master", "min_xp": 800, "emoji": "💎"},
    {"level": 7, "name": "Legend", "min_xp": 1200, "emoji": "👑"},
    {"level": 8, "name": "Immortal", "min_xp": 2000, "emoji": "🏆"},
]

# In-memory storage (replace with Supabase)
user_achievements_db = {}  # user_id -> {achievements: [], total_xp: int}

# Pre-populate demo user
user_achievements_db["demo-user"] = {
    "achievements": ["first_checkin", "week_warrior"],
    "total_xp": 60,
    "unlocked_at": {
        "first_checkin": datetime.now(),
        "week_warrior": datetime.now()
    }
}


# ============================================
# MODELS
# ============================================
class Achievement(BaseModel):
    id: str
    name: str
    description: str
    emoji: str
    points: int
    category: str
    unlocked: bool = False
    unlocked_at: Optional[datetime] = None


class UserStats(BaseModel):
    total_xp: int
    level: int
    level_name: str
    level_emoji: str
    xp_to_next_level: int
    progress_percent: float
    achievements_unlocked: int
    total_achievements: int


class AchievementUnlocked(BaseModel):
    achievement: Achievement
    is_new: bool
    xp_gained: int
    new_total_xp: int
    leveled_up: bool
    new_level: Optional[int] = None


# ============================================
# HELPER FUNCTIONS
# ============================================
def get_level_for_xp(xp: int) -> dict:
    """Get level info for given XP"""
    current_level = LEVELS[0]
    next_level = LEVELS[1] if len(LEVELS) > 1 else None
    
    for i, level in enumerate(LEVELS):
        if xp >= level["min_xp"]:
            current_level = level
            next_level = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
    
    return {
        "current": current_level,
        "next": next_level
    }


def check_streak_achievements(streak: int, user_id: str) -> List[str]:
    """Check which streak achievements should be unlocked"""
    to_unlock = []
    
    if streak >= 1:
        to_unlock.append("first_checkin")
    if streak >= 7:
        to_unlock.append("week_warrior")
    if streak >= 21:
        to_unlock.append("habit_former")
    if streak >= 30:
        to_unlock.append("monthly_master")
    if streak >= 100:
        to_unlock.append("century_club")
    
    return to_unlock


# ============================================
# ROUTES
# ============================================
@router.get("/", response_model=List[Achievement])
async def get_achievements(user_id: str = "demo-user"):
    """Get all achievements with unlock status for user"""
    user_data = user_achievements_db.get(user_id, {"achievements": [], "unlocked_at": {}})
    user_unlocked = user_data.get("achievements", [])
    unlocked_at = user_data.get("unlocked_at", {})
    
    result = []
    for ach_id, ach in ACHIEVEMENTS.items():
        is_unlocked = ach_id in user_unlocked
        result.append(Achievement(
            id=ach["id"],
            name=ach["name"],
            description=ach["description"],
            emoji=ach["emoji"],
            points=ach["points"],
            category=ach["category"],
            unlocked=is_unlocked,
            unlocked_at=unlocked_at.get(ach_id)
        ))
    
    # Sort: unlocked first, then by points
    result.sort(key=lambda x: (-int(x.unlocked), -x.points))
    return result


@router.get("/stats", response_model=UserStats)
async def get_user_stats(user_id: str = "demo-user"):
    """Get user's gamification stats (XP, level, progress)"""
    user_data = user_achievements_db.get(user_id, {"achievements": [], "total_xp": 0})
    total_xp = user_data.get("total_xp", 0)
    
    level_info = get_level_for_xp(total_xp)
    current = level_info["current"]
    next_level = level_info["next"]
    
    if next_level:
        xp_in_level = total_xp - current["min_xp"]
        xp_needed = next_level["min_xp"] - current["min_xp"]
        progress = (xp_in_level / xp_needed) * 100 if xp_needed > 0 else 100
        xp_to_next = next_level["min_xp"] - total_xp
    else:
        progress = 100
        xp_to_next = 0
    
    return UserStats(
        total_xp=total_xp,
        level=current["level"],
        level_name=current["name"],
        level_emoji=current["emoji"],
        xp_to_next_level=xp_to_next,
        progress_percent=round(progress, 1),
        achievements_unlocked=len(user_data.get("achievements", [])),
        total_achievements=len(ACHIEVEMENTS)
    )


@router.post("/unlock/{achievement_id}", response_model=AchievementUnlocked)
async def unlock_achievement(achievement_id: str, user_id: str = "demo-user"):
    """Unlock an achievement for a user"""
    if achievement_id not in ACHIEVEMENTS:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    ach = ACHIEVEMENTS[achievement_id]
    
    # Initialize user if needed
    if user_id not in user_achievements_db:
        user_achievements_db[user_id] = {"achievements": [], "total_xp": 0, "unlocked_at": {}}
    
    user_data = user_achievements_db[user_id]
    is_new = achievement_id not in user_data["achievements"]
    
    old_level = get_level_for_xp(user_data["total_xp"])["current"]["level"]
    
    if is_new:
        user_data["achievements"].append(achievement_id)
        user_data["total_xp"] += ach["points"]
        user_data["unlocked_at"][achievement_id] = datetime.now()
    
    new_level_info = get_level_for_xp(user_data["total_xp"])
    new_level = new_level_info["current"]["level"]
    leveled_up = new_level > old_level
    
    return AchievementUnlocked(
        achievement=Achievement(
            id=ach["id"],
            name=ach["name"],
            description=ach["description"],
            emoji=ach["emoji"],
            points=ach["points"],
            category=ach["category"],
            unlocked=True,
            unlocked_at=user_data["unlocked_at"].get(achievement_id)
        ),
        is_new=is_new,
        xp_gained=ach["points"] if is_new else 0,
        new_total_xp=user_data["total_xp"],
        leveled_up=leveled_up,
        new_level=new_level if leveled_up else None
    )


@router.post("/check-streak")
async def check_streak_milestones(streak: int, user_id: str = "demo-user"):
    """Check and unlock any streak-based achievements"""
    to_unlock = check_streak_achievements(streak, user_id)
    
    newly_unlocked = []
    for ach_id in to_unlock:
        result = await unlock_achievement(ach_id, user_id)
        if result.is_new:
            newly_unlocked.append(result)
    
    return {
        "checked_streak": streak,
        "newly_unlocked": newly_unlocked,
        "total_new": len(newly_unlocked)
    }


@router.get("/milestones")
async def get_streak_milestones(current_streak: int = 0):
    """Get streak milestone info and progress"""
    milestones = [
        {"streak": 7, "name": "Week Warrior", "emoji": "🔥", "achievement_id": "week_warrior"},
        {"streak": 21, "name": "Habit Former", "emoji": "💎", "achievement_id": "habit_former"},
        {"streak": 30, "name": "Monthly Master", "emoji": "👑", "achievement_id": "monthly_master"},
        {"streak": 100, "name": "Century Club", "emoji": "💯", "achievement_id": "century_club"},
    ]
    
    next_milestone = None
    for m in milestones:
        if current_streak < m["streak"]:
            next_milestone = m
            break
    
    return {
        "current_streak": current_streak,
        "milestones": milestones,
        "next_milestone": next_milestone,
        "days_to_next": next_milestone["streak"] - current_streak if next_milestone else 0,
        "progress_percent": round((current_streak / next_milestone["streak"]) * 100, 1) if next_milestone else 100
    }
