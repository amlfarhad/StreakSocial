"""
Friends API Routes - Real Friend Management System
Enables adding friends, accepting requests, and social connections
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter()

# In-memory storage for demo (replace with Supabase in production)
# Structure: { user_id: { "username": str, "display_name": str, "avatar": str } }
users_db = {
    "demo-user": {"username": "you", "display_name": "You", "avatar": "😊"},
    "user-sarah": {"username": "sarah_k", "display_name": "Sarah K.", "avatar": "👩‍🦰"},
    "user-mike": {"username": "mike_r", "display_name": "Mike R.", "avatar": "👨‍🦱"},
    "user-emma": {"username": "emma_l", "display_name": "Emma L.", "avatar": "👩"},
    "user-alex": {"username": "alex_t", "display_name": "Alex T.", "avatar": "🧑"},
    "user-jordan": {"username": "jordan_p", "display_name": "Jordan P.", "avatar": "🧔"},
    "user-lisa": {"username": "lisa_m", "display_name": "Lisa M.", "avatar": "👩‍🦳"},
    "user-david": {"username": "david_c", "display_name": "David C.", "avatar": "👨"},
    "user-olivia": {"username": "olivia_w", "display_name": "Olivia W.", "avatar": "👧"},
    "user-noah": {"username": "noah_b", "display_name": "Noah B.", "avatar": "👦"},
    "user-ava": {"username": "ava_h", "display_name": "Ava H.", "avatar": "👩‍🎨"},
    "user-liam": {"username": "liam_s", "display_name": "Liam S.", "avatar": "🧑‍💼"},
    "user-sophia": {"username": "sophia_r", "display_name": "Sophia R.", "avatar": "👩‍🎤"},
    "user-mason": {"username": "mason_j", "display_name": "Mason J.", "avatar": "💪"},
    "user-isabella": {"username": "isabella_g", "display_name": "Isabella G.", "avatar": "💃"},
    "user-ethan": {"username": "ethan_k", "display_name": "Ethan K.", "avatar": "👨‍💻"},
    "user-mia": {"username": "mia_t", "display_name": "Mia T.", "avatar": "🧘‍♀️"},
    "user-james": {"username": "james_w", "display_name": "James W.", "avatar": "🏃"},
    "user-charlotte": {"username": "charlotte_d", "display_name": "Charlotte D.", "avatar": "✍️"},
    "user-ben": {"username": "ben_f", "display_name": "Ben F.", "avatar": "🧘"},
    "user-amelia": {"username": "amelia_p", "display_name": "Amelia P.", "avatar": "🚶‍♀️"},
}

# Friendships: { friendship_id: { requester_id, addressee_id, status, created_at } }
friendships_db = {}

# Pre-populate friendships for demo - demo user has 5 friends
friendships_db["f1"] = {
    "requester_id": "user-sarah",
    "addressee_id": "demo-user",
    "status": "accepted",
    "created_at": datetime.now()
}
friendships_db["f2"] = {
    "requester_id": "user-mike",
    "addressee_id": "demo-user",
    "status": "accepted",
    "created_at": datetime.now()
}
friendships_db["f3"] = {
    "requester_id": "demo-user",
    "addressee_id": "user-lisa",
    "status": "accepted",
    "created_at": datetime.now()
}
friendships_db["f4"] = {
    "requester_id": "demo-user",
    "addressee_id": "user-jordan",
    "status": "accepted",
    "created_at": datetime.now()
}
friendships_db["f5"] = {
    "requester_id": "user-david",
    "addressee_id": "demo-user",
    "status": "accepted",
    "created_at": datetime.now()
}
# Pending requests for demo
friendships_db["f6"] = {
    "requester_id": "user-emma",
    "addressee_id": "demo-user",
    "status": "pending",
    "created_at": datetime.now()
}
friendships_db["f7"] = {
    "requester_id": "user-olivia",
    "addressee_id": "demo-user",
    "status": "pending",
    "created_at": datetime.now()
}
friendships_db["f8"] = {
    "requester_id": "user-liam",
    "addressee_id": "demo-user",
    "status": "pending",
    "created_at": datetime.now()
}


# ============================================
# MODELS
# ============================================
class FriendRequest(BaseModel):
    username: str


class FriendshipResponse(BaseModel):
    id: str
    user_id: str
    username: str
    display_name: str
    avatar: str
    status: str
    is_requester: bool
    created_at: datetime


class UserSearchResult(BaseModel):
    id: str
    username: str
    display_name: str
    avatar: str
    friendship_status: Optional[str] = None  # None, pending, accepted


# ============================================
# ROUTES
# ============================================

@router.get("/search", response_model=List[UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=1, description="Search query"),
    user_id: str = "demo-user"
):
    """Search for users by username or display name"""
    query = q.lower()
    results = []
    
    for uid, user in users_db.items():
        if uid == user_id:
            continue  # Don't show self
        
        # Check if query matches username or display name
        if query in user["username"].lower() or query in user["display_name"].lower():
            # Check friendship status
            friendship_status = None
            for fid, friendship in friendships_db.items():
                if (friendship["requester_id"] == user_id and friendship["addressee_id"] == uid) or \
                   (friendship["addressee_id"] == user_id and friendship["requester_id"] == uid):
                    friendship_status = friendship["status"]
                    break
            
            results.append(UserSearchResult(
                id=uid,
                username=user["username"],
                display_name=user["display_name"],
                avatar=user["avatar"],
                friendship_status=friendship_status
            ))
    
    return results[:10]  # Limit to 10 results


@router.post("/request")
async def send_friend_request(request: FriendRequest, user_id: str = "demo-user"):
    """Send a friend request to a user by username"""
    # Find user by username
    target_user_id = None
    for uid, user in users_db.items():
        if user["username"].lower() == request.username.lower():
            target_user_id = uid
            break
    
    if not target_user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    
    # Check if friendship already exists
    for fid, friendship in friendships_db.items():
        if (friendship["requester_id"] == user_id and friendship["addressee_id"] == target_user_id) or \
           (friendship["addressee_id"] == user_id and friendship["requester_id"] == target_user_id):
            if friendship["status"] == "accepted":
                raise HTTPException(status_code=400, detail="Already friends")
            elif friendship["status"] == "pending":
                raise HTTPException(status_code=400, detail="Request already pending")
    
    # Create friendship request
    friendship_id = str(uuid.uuid4())
    friendships_db[friendship_id] = {
        "requester_id": user_id,
        "addressee_id": target_user_id,
        "status": "pending",
        "created_at": datetime.now()
    }
    
    target_user = users_db[target_user_id]
    return {
        "success": True,
        "message": f"Friend request sent to {target_user['display_name']}",
        "friendship_id": friendship_id
    }


@router.post("/accept/{friendship_id}")
async def accept_friend_request(friendship_id: str, user_id: str = "demo-user"):
    """Accept a pending friend request"""
    if friendship_id not in friendships_db:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    friendship = friendships_db[friendship_id]
    
    # Must be the addressee to accept
    if friendship["addressee_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")
    
    if friendship["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    
    friendship["status"] = "accepted"
    
    requester = users_db.get(friendship["requester_id"], {})
    return {
        "success": True,
        "message": f"You are now friends with {requester.get('display_name', 'Unknown')}"
    }


@router.post("/reject/{friendship_id}")
async def reject_friend_request(friendship_id: str, user_id: str = "demo-user"):
    """Reject a pending friend request"""
    if friendship_id not in friendships_db:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    friendship = friendships_db[friendship_id]
    
    if friendship["addressee_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this request")
    
    if friendship["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    
    friendship["status"] = "rejected"
    
    return {"success": True, "message": "Friend request rejected"}


@router.get("/requests", response_model=List[FriendshipResponse])
async def get_pending_requests(user_id: str = "demo-user"):
    """Get all pending friend requests for the user"""
    requests = []
    
    for fid, friendship in friendships_db.items():
        if friendship["addressee_id"] == user_id and friendship["status"] == "pending":
            requester = users_db.get(friendship["requester_id"], {})
            requests.append(FriendshipResponse(
                id=fid,
                user_id=friendship["requester_id"],
                username=requester.get("username", "unknown"),
                display_name=requester.get("display_name", "Unknown"),
                avatar=requester.get("avatar", "👤"),
                status=friendship["status"],
                is_requester=False,
                created_at=friendship["created_at"]
            ))
    
    return requests


@router.get("/", response_model=List[FriendshipResponse])
async def get_friends(user_id: str = "demo-user"):
    """Get all accepted friends"""
    friends = []
    
    for fid, friendship in friendships_db.items():
        if friendship["status"] != "accepted":
            continue
        
        # Determine which user is the friend
        if friendship["requester_id"] == user_id:
            friend_id = friendship["addressee_id"]
            is_requester = True
        elif friendship["addressee_id"] == user_id:
            friend_id = friendship["requester_id"]
            is_requester = False
        else:
            continue
        
        friend = users_db.get(friend_id, {})
        friends.append(FriendshipResponse(
            id=fid,
            user_id=friend_id,
            username=friend.get("username", "unknown"),
            display_name=friend.get("display_name", "Unknown"),
            avatar=friend.get("avatar", "👤"),
            status=friendship["status"],
            is_requester=is_requester,
            created_at=friendship["created_at"]
        ))
    
    return friends


@router.delete("/{friendship_id}")
async def remove_friend(friendship_id: str, user_id: str = "demo-user"):
    """Remove a friend (unfriend)"""
    if friendship_id not in friendships_db:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    friendship = friendships_db[friendship_id]
    
    # Must be part of the friendship
    if friendship["requester_id"] != user_id and friendship["addressee_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    del friendships_db[friendship_id]
    
    return {"success": True, "message": "Friend removed"}
