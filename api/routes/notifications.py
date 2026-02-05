"""
Notifications System
Streak alerts, achievement unlocks, friend activity, challenge updates
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

router = APIRouter()

# ============================================
# NOTIFICATION TYPES
# ============================================
NOTIFICATION_TYPES = {
    "streak_risk": {
        "icon": "⚠️",
        "color": "warning",
        "priority": "high"
    },
    "streak_milestone": {
        "icon": "🔥",
        "color": "success",
        "priority": "medium"
    },
    "achievement_unlocked": {
        "icon": "🏆",
        "color": "gold",
        "priority": "high"
    },
    "level_up": {
        "icon": "⬆️",
        "color": "accent",
        "priority": "high"
    },
    "friend_request": {
        "icon": "👤",
        "color": "info",
        "priority": "medium"
    },
    "friend_checkin": {
        "icon": "📸",
        "color": "info",
        "priority": "low"
    },
    "challenge_joined": {
        "icon": "🏁",
        "color": "accent",
        "priority": "medium"
    },
    "challenge_completed": {
        "icon": "🎉",
        "color": "success",
        "priority": "high"
    },
    "challenge_reminder": {
        "icon": "⏰",
        "color": "warning",
        "priority": "medium"
    },
    "daily_reminder": {
        "icon": "📢",
        "color": "info",
        "priority": "low"
    },
    "community_like": {
        "icon": "❤️",
        "color": "accent",
        "priority": "low"
    },
}

# In-memory storage
notifications_db = {}  # user_id -> [notifications]

# Pre-populate with demo notifications
demo_notifications = [
    {
        "id": "n1",
        "type": "streak_risk",
        "title": "Streak at Risk! 🔥",
        "message": "Don't forget to check in for 'Morning run' today. Your 12-day streak is on the line!",
        "created_at": datetime.now() - timedelta(hours=2),
        "read": False,
        "action_url": None
    },
    {
        "id": "n2",
        "type": "achievement_unlocked",
        "title": "Achievement Unlocked! 🏆",
        "message": "You earned 'Week Warrior' - 7 days of consistency!",
        "created_at": datetime.now() - timedelta(hours=5),
        "read": False,
        "action_url": "/achievements"
    },
    {
        "id": "n3",
        "type": "friend_checkin",
        "title": "Sarah K. checked in",
        "message": "Sarah completed day 45 of Morning yoga 🧘‍♀️",
        "created_at": datetime.now() - timedelta(hours=8),
        "read": True,
        "action_url": "/feed"
    },
    {
        "id": "n4",
        "type": "challenge_reminder",
        "title": "Challenge Update",
        "message": "You're 3 days into the 7-Day Fitness Blitz! Keep going! 💪",
        "created_at": datetime.now() - timedelta(days=1),
        "read": True,
        "action_url": "/challenges"
    },
    {
        "id": "n5",
        "type": "community_like",
        "title": "New likes on your check-in",
        "message": "Mike and 3 others liked your check-in",
        "created_at": datetime.now() - timedelta(days=1, hours=3),
        "read": True,
        "action_url": "/feed"
    },
]
notifications_db["demo-user"] = demo_notifications


# ============================================
# MODELS
# ============================================
class Notification(BaseModel):
    id: str
    type: str
    title: str
    message: str
    icon: str
    color: str
    priority: str
    created_at: datetime
    read: bool
    action_url: Optional[str] = None
    time_ago: str


class NotificationSummary(BaseModel):
    total: int
    unread: int
    has_high_priority: bool


class CreateNotification(BaseModel):
    type: str
    title: str
    message: str
    action_url: Optional[str] = None


# ============================================
# HELPER FUNCTIONS
# ============================================
def format_time_ago(dt: datetime) -> str:
    """Format datetime as human-readable time ago"""
    diff = datetime.now() - dt
    hours = diff.total_seconds() / 3600
    
    if hours < 1:
        mins = int(diff.total_seconds() / 60)
        return f"{mins}m ago" if mins > 0 else "Just now"
    elif hours < 24:
        return f"{int(hours)}h ago"
    elif hours < 48:
        return "Yesterday"
    else:
        return f"{int(hours / 24)}d ago"


# ============================================
# ROUTES
# ============================================
@router.get("/", response_model=List[Notification])
async def get_notifications(
    user_id: str = "demo-user",
    unread_only: bool = Query(False, description="Only show unread notifications"),
    limit: int = Query(20, description="Max notifications to return")
):
    """Get user notifications"""
    user_notifications = notifications_db.get(user_id, [])
    
    if unread_only:
        user_notifications = [n for n in user_notifications if not n["read"]]
    
    result = []
    for n in user_notifications[:limit]:
        notif_type = NOTIFICATION_TYPES.get(n["type"], {})
        result.append(Notification(
            id=n["id"],
            type=n["type"],
            title=n["title"],
            message=n["message"],
            icon=notif_type.get("icon", "📢"),
            color=notif_type.get("color", "info"),
            priority=notif_type.get("priority", "low"),
            created_at=n["created_at"],
            read=n["read"],
            action_url=n.get("action_url"),
            time_ago=format_time_ago(n["created_at"])
        ))
    
    return result


@router.get("/summary", response_model=NotificationSummary)
async def get_notification_summary(user_id: str = "demo-user"):
    """Get notification count summary"""
    user_notifications = notifications_db.get(user_id, [])
    
    unread = [n for n in user_notifications if not n["read"]]
    high_priority = [n for n in unread if NOTIFICATION_TYPES.get(n["type"], {}).get("priority") == "high"]
    
    return NotificationSummary(
        total=len(user_notifications),
        unread=len(unread),
        has_high_priority=len(high_priority) > 0
    )


@router.post("/", response_model=Notification)
async def create_notification(notification: CreateNotification, user_id: str = "demo-user"):
    """Create a new notification for a user"""
    if notification.type not in NOTIFICATION_TYPES:
        notification.type = "daily_reminder"  # Default type
    
    if user_id not in notifications_db:
        notifications_db[user_id] = []
    
    notif_type = NOTIFICATION_TYPES[notification.type]
    
    new_notification = {
        "id": str(uuid.uuid4()),
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "created_at": datetime.now(),
        "read": False,
        "action_url": notification.action_url
    }
    
    # Add to beginning of list
    notifications_db[user_id].insert(0, new_notification)
    
    return Notification(
        id=new_notification["id"],
        type=new_notification["type"],
        title=new_notification["title"],
        message=new_notification["message"],
        icon=notif_type["icon"],
        color=notif_type["color"],
        priority=notif_type["priority"],
        created_at=new_notification["created_at"],
        read=False,
        action_url=new_notification["action_url"],
        time_ago="Just now"
    )


@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_id: str = "demo-user"):
    """Mark a notification as read"""
    user_notifications = notifications_db.get(user_id, [])
    
    for n in user_notifications:
        if n["id"] == notification_id:
            n["read"] = True
            return {"success": True, "message": "Marked as read"}
    
    raise HTTPException(status_code=404, detail="Notification not found")


@router.post("/read-all")
async def mark_all_read(user_id: str = "demo-user"):
    """Mark all notifications as read"""
    user_notifications = notifications_db.get(user_id, [])
    
    for n in user_notifications:
        n["read"] = True
    
    return {"success": True, "message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user_id: str = "demo-user"):
    """Delete a notification"""
    user_notifications = notifications_db.get(user_id, [])
    
    for i, n in enumerate(user_notifications):
        if n["id"] == notification_id:
            del user_notifications[i]
            return {"success": True, "message": "Notification deleted"}
    
    raise HTTPException(status_code=404, detail="Notification not found")


@router.delete("/")
async def clear_all_notifications(user_id: str = "demo-user"):
    """Clear all notifications for a user"""
    notifications_db[user_id] = []
    return {"success": True, "message": "All notifications cleared"}


# ============================================
# HELPER ENDPOINTS FOR CREATING SPECIFIC NOTIFICATIONS
# ============================================
@router.post("/streak-risk")
async def create_streak_risk_notification(
    goal_title: str,
    current_streak: int,
    user_id: str = "demo-user"
):
    """Create a streak risk notification"""
    return await create_notification(
        CreateNotification(
            type="streak_risk",
            title="Streak at Risk! 🔥",
            message=f"Don't forget to check in for '{goal_title}' today. Your {current_streak}-day streak is on the line!",
            action_url="/home"
        ),
        user_id
    )


@router.post("/achievement")
async def create_achievement_notification(
    achievement_name: str,
    achievement_emoji: str,
    user_id: str = "demo-user"
):
    """Create an achievement unlocked notification"""
    return await create_notification(
        CreateNotification(
            type="achievement_unlocked",
            title=f"Achievement Unlocked! {achievement_emoji}",
            message=f"You earned '{achievement_name}'!",
            action_url="/achievements"
        ),
        user_id
    )


@router.post("/level-up")
async def create_level_up_notification(
    new_level: int,
    level_name: str,
    level_emoji: str,
    user_id: str = "demo-user"
):
    """Create a level up notification"""
    return await create_notification(
        CreateNotification(
            type="level_up",
            title=f"Level Up! {level_emoji}",
            message=f"You've reached Level {new_level}: {level_name}!",
            action_url="/settings"
        ),
        user_id
    )
