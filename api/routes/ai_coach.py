"""
AI Coach API Routes
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


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai_coach(request: ChatRequest):
    """Chat with AI coach about a specific goal"""
    from ai.gemini import chat_with_coach
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
    
    return ChatResponse(message=response)


class RefineRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


class RefineResponse(BaseModel):
    message: str
    is_complete: bool


@router.post("/refine", response_model=RefineResponse)
async def refine_goal(request: RefineRequest):
    """Help user define their goal through conversation"""
    from ai.gemini import refine_goal as ai_refine
    
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
    
    return RefineResponse(
        message=result["message"],
        is_complete=result["is_complete"]
    )
