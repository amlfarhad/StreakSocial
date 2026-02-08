"""
AI Coach API Routes with Opik Observability
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    goal_id: str
    goal_title: Optional[str] = None  # Allow passing title directly
    streak: Optional[int] = 0
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    message: str
    trace_id: Optional[str] = None  # For feedback tracking


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai_coach(request: ChatRequest):
    """Chat with AI coach about a specific goal"""
    from ai.gemini import chat_with_coach
    from ai.opik_config import get_current_trace_id
    from routes.goals import goals_db
    
    # Try to get goal from DB, or use provided info
    goal_title = request.goal_title or "your goal"
    streak = request.streak or 0
    
    goal = goals_db.get(request.goal_id)
    if goal:
        goal_title = goal.title
        streak = goal.current_streak
    
    # Convert history
    history = []
    if request.history:
        for msg in request.history:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
    
    response = chat_with_coach(
        message=request.message,
        goal_title=goal_title,
        streak=streak,
        history=history
    )
    
    # Get trace ID for feedback tracking
    trace_id = get_current_trace_id()
    
    return ChatResponse(message=response, trace_id=trace_id)


class RefineRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


class RefineResponse(BaseModel):
    message: str
    is_complete: bool
    trace_id: Optional[str] = None


@router.post("/refine", response_model=RefineResponse)
async def refine_goal(request: RefineRequest):
    """Help user define their goal through conversation"""
    from ai.gemini import refine_goal as ai_refine
    from ai.opik_config import get_current_trace_id
    
    # Convert history
    history = []
    if request.history:
        for msg in request.history:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
    
    result = ai_refine(
        user_input=request.message,
        conversation_history=history
    )
    
    trace_id = get_current_trace_id()
    
    return RefineResponse(
        message=result["message"],
        is_complete=result["is_complete"],
        trace_id=trace_id
    )


# ============================================
# FEEDBACK ENDPOINT - Human-in-the-loop evaluation
# ============================================

class FeedbackRequest(BaseModel):
    trace_id: str
    score: float  # 0.0 to 1.0 (thumbs down to thumbs up)
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    success: bool
    message: str


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Submit feedback for an AI response.
    This enables human-in-the-loop evaluation of the AI coach.
    
    Score should be between 0.0 (unhelpful) and 1.0 (very helpful).
    """
    from ai.opik_config import log_feedback, OPIK_ENABLED
    
    if not OPIK_ENABLED:
        return FeedbackResponse(
            success=False,
            message="Feedback logging is not enabled (Opik not configured)"
        )
    
    # Validate score
    if request.score < 0.0 or request.score > 1.0:
        return FeedbackResponse(
            success=False,
            message="Score must be between 0.0 and 1.0"
        )
    
    success = log_feedback(
        trace_id=request.trace_id,
        score=request.score,
        comment=request.comment
    )
    
    if success:
        return FeedbackResponse(
            success=True,
            message="Feedback logged successfully"
        )
    else:
        return FeedbackResponse(
            success=False,
            message="Failed to log feedback"
        )


# ============================================
# AGENTIC ENDPOINTS
# ============================================

class AgenticChatResponse(BaseModel):
    message: str
    tool_calls: list = []
    is_agentic: bool = False
    trace_id: Optional[str] = None


@router.post("/agentic-chat", response_model=AgenticChatResponse)
async def agentic_chat_endpoint(request: ChatRequest):
    """
    Agentic AI coach with tool-calling capabilities.
    Can break down goals, analyze patterns, and suggest actions.
    """
    from ai.agent import agentic_chat
    from ai.opik_config import get_current_trace_id
    from routes.goals import goals_db
    
    goal_title = request.goal_title or "your goal"
    streak = request.streak or 0
    
    goal = goals_db.get(request.goal_id)
    if goal:
        goal_title = goal.title
        streak = goal.current_streak
    
    history = []
    if request.history:
        for msg in request.history:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
    
    result = agentic_chat(
        message=request.message,
        goal_title=goal_title,
        streak=streak,
        history=history
    )
    
    trace_id = get_current_trace_id()
    
    return AgenticChatResponse(
        message=result["message"],
        tool_calls=result.get("tool_calls", []),
        is_agentic=result.get("is_agentic", False),
        trace_id=trace_id
    )


class GoalPlanRequest(BaseModel):
    goal_description: str
    timeframe: Optional[str] = "30 days"


class GoalPlanResponse(BaseModel):
    summary: str
    milestones: list
    daily_habit: str
    success_metrics: list
    tips: list
    trace_id: Optional[str] = None


@router.post("/plan-goal", response_model=GoalPlanResponse)
async def plan_goal_endpoint(request: GoalPlanRequest):
    """
    Generate an agentic goal breakdown with milestones and daily actions.
    """
    from ai.agent import create_goal_plan
    from ai.opik_config import get_current_trace_id
    
    plan = create_goal_plan(
        goal_description=request.goal_description,
        timeframe=request.timeframe
    )
    
    trace_id = get_current_trace_id()
    
    return GoalPlanResponse(
        summary=plan.get("summary", ""),
        milestones=plan.get("milestones", []),
        daily_habit=plan.get("daily_habit", ""),
        success_metrics=plan.get("success_metrics", []),
        tips=plan.get("tips", []),
        trace_id=trace_id
    )


# ==================================================
# VERIFY CHECK-IN ENDPOINT
# ==================================================
class VerifyCheckInRequest(BaseModel):
    goal_title: str
    goal_category: str
    image_description: Optional[str] = None  # For now we use text; in production would use actual image


class VerifyCheckInResponse(BaseModel):
    verified: bool
    message: str
    confidence: Optional[float] = None


@router.post("/verify-checkin", response_model=VerifyCheckInResponse)
async def verify_checkin(request: VerifyCheckInRequest):
    """
    Verify that a check-in photo matches the goal.
    Uses tracked AI verification via Opik for observability.
    """
    from ai.gemini import verify_checkin_ai
    from ai.opik_config import get_current_trace_id

    result = verify_checkin_ai(
        goal_title=request.goal_title,
        goal_category=request.goal_category,
        image_description=request.image_description
    )

    return VerifyCheckInResponse(
        verified=result["verified"],
        message=result["message"],
        confidence=result["confidence"]
    )


# ==================================================
# AI GOAL CLASSIFICATION ENDPOINT
# ==================================================

COMMUNITIES = {
    "fitness": {
        "id": "fitness-community",
        "name": "Fitness Enthusiasts",
        "emoji": "💪",
        "description": "Join others crushing their fitness goals",
        "member_count": 12847
    },
    "learning": {
        "id": "learning-community",
        "name": "Lifelong Learners",
        "emoji": "📚",
        "description": "A community of curious minds",
        "member_count": 9523
    },
    "wellness": {
        "id": "wellness-community",
        "name": "Wellness Warriors",
        "emoji": "🧘",
        "description": "Mind, body, and soul care",
        "member_count": 8234
    },
    "creativity": {
        "id": "creativity-community",
        "name": "Creative Souls",
        "emoji": "🎨",
        "description": "Express yourself daily",
        "member_count": 6891
    },
    "productivity": {
        "id": "productivity-community",
        "name": "Productivity Masters",
        "emoji": "⚡",
        "description": "Get more done, together",
        "member_count": 11456
    }
}


class ClassifyGoalRequest(BaseModel):
    goal_title: str


class ClassifyGoalResponse(BaseModel):
    category: str
    category_emoji: str
    community_id: str
    community_name: str
    community_emoji: str
    community_description: str
    member_count: int
    suggested_routine: str
    suggested_frequency: str
    tips: list


@router.post("/classify-goal", response_model=ClassifyGoalResponse)
async def classify_goal(request: ClassifyGoalRequest):
    """
    AI-powered goal classification.
    Classifies the goal, matches to a community, and suggests routines.
    """
    from ai.gemini import classify_goal_ai
    from ai.opik_config import get_current_trace_id

    result = classify_goal_ai(request.goal_title)
    category = result["category"]

    # Get community info
    community = COMMUNITIES.get(category, COMMUNITIES["productivity"])

    category_emojis = {
        "fitness": "🏃",
        "learning": "📖",
        "wellness": "🧘",
        "creativity": "🎨",
        "productivity": "⚡"
    }

    return ClassifyGoalResponse(
        category=category,
        category_emoji=category_emojis.get(category, "🎯"),
        community_id=community["id"],
        community_name=community["name"],
        community_emoji=community["emoji"],
        community_description=community["description"],
        member_count=community["member_count"],
        suggested_routine=result["suggested_routine"],
        suggested_frequency=result["suggested_frequency"],
        tips=result["tips"]
    )
