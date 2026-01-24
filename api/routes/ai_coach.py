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
    For now, this is a simplified verification. In production,
    this would use Gemini's vision capabilities to analyze the actual image.
    """
    import random
    
    # Simple heuristic verification based on category and description
    # In production, this would use Gemini Vision API with the actual photo
    
    goal_lower = request.goal_title.lower()
    description_lower = (request.image_description or "").lower()
    category = request.goal_category.lower()
    
    # Keywords that might indicate goal completion
    fitness_keywords = ["run", "gym", "workout", "exercise", "yoga", "sweat", "training", "fitness", "outdoor", "morning"]
    learning_keywords = ["book", "read", "study", "learn", "notes", "library", "desk"]
    wellness_keywords = ["meditate", "calm", "peaceful", "yoga", "relax", "morning", "nature"]
    
    # Check for keyword matches (simplified verification)
    verified = False
    confidence = 0.5
    
    if category == "fitness":
        if any(kw in goal_lower or kw in description_lower for kw in fitness_keywords):
            verified = True
            confidence = 0.85
    elif category == "learning":
        if any(kw in goal_lower or kw in description_lower for kw in learning_keywords):
            verified = True
            confidence = 0.85
    elif category == "wellness":
        if any(kw in goal_lower or kw in description_lower for kw in wellness_keywords):
            verified = True
            confidence = 0.85
    
    # For demo purposes, approve most check-ins to allow testing
    # In production, this would be stricter with actual image analysis
    if not verified and random.random() > 0.3:  # 70% approval rate for demo
        verified = True
        confidence = 0.7
    
    if verified:
        messages = [
            "Great job! Your check-in has been verified. 🎉",
            "Looking good! Keep up the amazing work! 💪",
            "Verified! You're building an incredible streak! 🔥",
            "Perfect! Another day, another step towards your goal! ⭐",
        ]
        message = random.choice(messages)
    else:
        messages = [
            f"This doesn't quite look like {request.goal_title}. Try taking a photo that shows your progress!",
            f"Hmm, we couldn't verify this as a {request.goal_title} check-in. Show us what you've accomplished!",
            "We want to make sure you're really crushing your goals! Take a photo of your progress.",
        ]
        message = random.choice(messages)
    
    return VerifyCheckInResponse(
        verified=verified,
        message=message,
        confidence=confidence
    )

