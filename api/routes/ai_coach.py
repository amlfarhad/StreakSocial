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

