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

# Sample community check-ins for demo (diverse, realistic data for hackathon)
sample_checkins = [
    # High performers (for leaderboard top)
    {
        "id": "c1", "user_id": "user-sarah", "goal_id": "g1", "goal_title": "Morning yoga",
        "caption": "Day 45! 🧘‍♀️ Finally mastered the crow pose!", "streak": 45, "total_days": 48,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=1),
        "likes": 24, "photo_url": None
    },
    {
        "id": "c2", "user_id": "user-lisa", "goal_id": "g6", "goal_title": "Daily journaling",
        "caption": "Reflecting on gratitude today 📝 Feeling blessed", "streak": 90, "total_days": 95,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=2),
        "likes": 42, "photo_url": None
    },
    {
        "id": "c3", "user_id": "user-jordan", "goal_id": "g5", "goal_title": "Meditate 15 min",
        "caption": "60 days of calm 🧘 Mindfulness changed my life", "streak": 60, "total_days": 65,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=3),
        "likes": 38, "photo_url": None
    },
    {
        "id": "c4", "user_id": "user-david", "goal_id": "g7", "goal_title": "100 pushups daily",
        "caption": "Week 8 complete! Arms of steel 💪", "streak": 56, "total_days": 60,
        "category": "fitness", "created_at": datetime.now() - timedelta(hours=4),
        "likes": 31, "photo_url": None
    },
    # Mid-tier performers
    {
        "id": "c5", "user_id": "user-mike", "goal_id": "g2", "goal_title": "Read 30 min",
        "caption": "Just finished Atomic Habits 📚 Life-changing!", "streak": 23, "total_days": 28,
        "category": "learning", "created_at": datetime.now() - timedelta(hours=5),
        "likes": 18, "photo_url": None
    },
    {
        "id": "c6", "user_id": "user-alex", "goal_id": "g4", "goal_title": "Practice guitar",
        "caption": "Finally nailed that chord progression! 🎸", "streak": 30, "total_days": 35,
        "category": "creativity", "created_at": datetime.now() - timedelta(hours=6),
        "likes": 22, "photo_url": None
    },
    {
        "id": "c7", "user_id": "user-emma", "goal_id": "g3", "goal_title": "Run 5K",
        "caption": "Rainy run but made it happen! 🌧️", "streak": 14, "total_days": 20,
        "category": "fitness", "created_at": datetime.now() - timedelta(hours=7),
        "likes": 15, "photo_url": None
    },
    # New users
    {
        "id": "c8", "user_id": "user-olivia", "goal_id": "g8", "goal_title": "Learn Spanish",
        "caption": "¡Hola! 🇪🇸 Day 21 of Duolingo streak", "streak": 21, "total_days": 25,
        "category": "learning", "created_at": datetime.now() - timedelta(hours=8),
        "likes": 12, "photo_url": None
    },
    {
        "id": "c9", "user_id": "user-noah", "goal_id": "g9", "goal_title": "No sugar",
        "caption": "2 weeks sugar-free! 🍬❌ Feeling amazing", "streak": 14, "total_days": 14,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=9),
        "likes": 28, "photo_url": None
    },
    {
        "id": "c10", "user_id": "user-ava", "goal_id": "g10", "goal_title": "Daily painting",
        "caption": "Watercolor sunset 🎨 Art is therapy", "streak": 18, "total_days": 20,
        "category": "creativity", "created_at": datetime.now() - timedelta(hours=10),
        "likes": 35, "photo_url": None
    },
    {
        "id": "c11", "user_id": "user-liam", "goal_id": "g11", "goal_title": "Cold shower",
        "caption": "100 days of ice! 🥶 Discipline is freedom", "streak": 100, "total_days": 105,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=11),
        "likes": 67, "photo_url": None
    },
    {
        "id": "c12", "user_id": "user-sophia", "goal_id": "g12", "goal_title": "Practice piano",
        "caption": "Learned Moonlight Sonata! 🎹✨", "streak": 42, "total_days": 50,
        "category": "creativity", "created_at": datetime.now() - timedelta(hours=12),
        "likes": 29, "photo_url": None
    },
    {
        "id": "c13", "user_id": "user-mason", "goal_id": "g13", "goal_title": "Gym workout",
        "caption": "Leg day complete 🦵 No excuses", "streak": 28, "total_days": 32,
        "category": "fitness", "created_at": datetime.now() - timedelta(hours=14),
        "likes": 19, "photo_url": None
    },
    {
        "id": "c14", "user_id": "user-isabella", "goal_id": "g14", "goal_title": "Drink 8 glasses",
        "caption": "Hydration check! 💧 Glowing skin incoming", "streak": 35, "total_days": 40,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=16),
        "likes": 14, "photo_url": None
    },
    {
        "id": "c15", "user_id": "user-ethan", "goal_id": "g15", "goal_title": "Code for 2 hours",
        "caption": "Built a new feature today! 💻🚀", "streak": 45, "total_days": 50,
        "category": "learning", "created_at": datetime.now() - timedelta(hours=18),
        "likes": 33, "photo_url": None
    },
    {
        "id": "c16", "user_id": "user-mia", "goal_id": "g16", "goal_title": "Morning stretch",
        "caption": "10 min stretch = zero back pain 🙆‍♀️", "streak": 52, "total_days": 55,
        "category": "wellness", "created_at": datetime.now() - timedelta(hours=20),
        "likes": 21, "photo_url": None
    },
    {
        "id": "c17", "user_id": "user-james", "goal_id": "g17", "goal_title": "Wake up at 6AM",
        "caption": "Early bird catches the worm! 🌅", "streak": 12, "total_days": 15,
        "category": "productivity", "created_at": datetime.now() - timedelta(hours=22),
        "likes": 16, "photo_url": None
    },
    {
        "id": "c18", "user_id": "user-charlotte", "goal_id": "g18", "goal_title": "Write 500 words",
        "caption": "Novel progress: Chapter 12 done! ✍️", "streak": 33, "total_days": 38,
        "category": "creativity", "created_at": datetime.now() - timedelta(hours=24),
        "likes": 27, "photo_url": None
    },
    {
        "id": "c19", "user_id": "user-ben", "goal_id": "g19", "goal_title": "No social media",
        "caption": "Week 3 of digital detox 📵 Mental clarity!", "streak": 21, "total_days": 21,
        "category": "wellness", "created_at": datetime.now() - timedelta(days=1, hours=2),
        "likes": 45, "photo_url": None
    },
    {
        "id": "c20", "user_id": "user-amelia", "goal_id": "g20", "goal_title": "Walk 10k steps",
        "caption": "Hit 15k today! 👟 Exceeded my goal", "streak": 40, "total_days": 42,
        "category": "fitness", "created_at": datetime.now() - timedelta(days=1, hours=5),
        "likes": 23, "photo_url": None
    },
]

# User data for display - 20+ diverse avatars
users_data = {
    "demo-user": {"display_name": "You", "avatar": "😊", "username": "you"},
    "user-sarah": {"display_name": "Sarah K.", "avatar": "👩‍🦰", "username": "sarah_k"},
    "user-mike": {"display_name": "Mike R.", "avatar": "👨‍🦱", "username": "mike_r"},
    "user-emma": {"display_name": "Emma L.", "avatar": "👩", "username": "emma_l"},
    "user-alex": {"display_name": "Alex T.", "avatar": "🧑", "username": "alex_t"},
    "user-jordan": {"display_name": "Jordan P.", "avatar": "🧔", "username": "jordan_p"},
    "user-lisa": {"display_name": "Lisa M.", "avatar": "👩‍🦳", "username": "lisa_m"},
    "user-david": {"display_name": "David C.", "avatar": "👨", "username": "david_c"},
    "user-olivia": {"display_name": "Olivia W.", "avatar": "👧", "username": "olivia_w"},
    "user-noah": {"display_name": "Noah B.", "avatar": "👦", "username": "noah_b"},
    "user-ava": {"display_name": "Ava H.", "avatar": "👩‍🎨", "username": "ava_h"},
    "user-liam": {"display_name": "Liam S.", "avatar": "🧑‍💼", "username": "liam_s"},
    "user-sophia": {"display_name": "Sophia R.", "avatar": "👩‍🎤", "username": "sophia_r"},
    "user-mason": {"display_name": "Mason J.", "avatar": "💪", "username": "mason_j"},
    "user-isabella": {"display_name": "Isabella G.", "avatar": "💃", "username": "isabella_g"},
    "user-ethan": {"display_name": "Ethan K.", "avatar": "👨‍💻", "username": "ethan_k"},
    "user-mia": {"display_name": "Mia T.", "avatar": "🧘‍♀️", "username": "mia_t"},
    "user-james": {"display_name": "James W.", "avatar": "🏃", "username": "james_w"},
    "user-charlotte": {"display_name": "Charlotte D.", "avatar": "✍️", "username": "charlotte_d"},
    "user-ben": {"display_name": "Ben F.", "avatar": "🧘", "username": "ben_f"},
    "user-amelia": {"display_name": "Amelia P.", "avatar": "🚶‍♀️", "username": "amelia_p"},
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


# ============================================
# GLOBAL LEADERBOARD
# ============================================
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    user_name: str
    avatar: str
    total_score: float
    highest_streak: int
    total_checkins: int
    badges: List[str]  # gold, silver, bronze


class LeaderboardResponse(BaseModel):
    timeframe: str
    entries: List[LeaderboardEntry]
    user_rank: Optional[int] = None
    total_users: int


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    user_id: str = "demo-user",
    timeframe: str = Query("weekly", description="weekly, monthly, or all-time"),
    limit: int = Query(20, description="Number of entries to return")
):
    """
    Get global leaderboard ranked by Integrity Score.
    Shows top streakers and most consistent users.
    """
    # Aggregate scores by user
    user_scores = {}
    
    for checkin in sample_checkins:
        uid = checkin["user_id"]
        hours_since = (datetime.now() - checkin["created_at"]).total_seconds() / 3600
        score, badge, consistency = calculate_integrity_score(
            checkin["streak"],
            checkin["total_days"],
            hours_since
        )
        
        if uid not in user_scores:
            user_scores[uid] = {
                "total_score": 0,
                "highest_streak": 0,
                "total_checkins": 0,
                "badges": set()
            }
        
        user_scores[uid]["total_score"] += score
        user_scores[uid]["highest_streak"] = max(user_scores[uid]["highest_streak"], checkin["streak"])
        user_scores[uid]["total_checkins"] += 1
        if badge != "none":
            user_scores[uid]["badges"].add(badge)
    
    # Convert to sorted list
    sorted_users = sorted(user_scores.items(), key=lambda x: -x[1]["total_score"])
    
    entries = []
    user_rank = None
    
    for i, (uid, data) in enumerate(sorted_users[:limit]):
        user = users_data.get(uid, {"display_name": "Unknown", "avatar": "👤"})
        
        if uid == user_id:
            user_rank = i + 1
        
        entries.append(LeaderboardEntry(
            rank=i + 1,
            user_id=uid,
            user_name=user["display_name"],
            avatar=user["avatar"],
            total_score=round(data["total_score"], 1),
            highest_streak=data["highest_streak"],
            total_checkins=data["total_checkins"],
            badges=list(data["badges"])
        ))
    
    # Find user rank if not in top N
    if user_rank is None:
        for i, (uid, _) in enumerate(sorted_users):
            if uid == user_id:
                user_rank = i + 1
                break
    
    return LeaderboardResponse(
        timeframe=timeframe,
        entries=entries,
        user_rank=user_rank,
        total_users=len(sorted_users)
    )

