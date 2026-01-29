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
    import os
    from google import genai
    from google.genai import types
    
    goal = request.goal_title.lower()
    
    # Default classification based on keywords (fast fallback)
    if any(kw in goal for kw in ["exercise", "gym", "run", "workout", "fitness", "weight", "muscle", "cardio", "yoga", "sport"]):
        category = "fitness"
    elif any(kw in goal for kw in ["read", "learn", "study", "book", "course", "language", "skill", "practice"]):
        category = "learning"
    elif any(kw in goal for kw in ["meditate", "sleep", "mental", "mindful", "wellness", "health", "water", "diet"]):
        category = "wellness"
    elif any(kw in goal for kw in ["art", "music", "write", "draw", "paint", "create", "guitar", "piano", "photo"]):
        category = "creativity"
    else:
        category = "productivity"
    
    # Try AI classification for better accuracy
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        prompt = f"""Classify this goal into exactly ONE category and provide suggestions.

Goal: "{request.goal_title}"

Categories (pick ONE): fitness, learning, wellness, creativity, productivity

Respond in this exact JSON format:
{{
    "category": "category_name",
    "suggested_routine": "A specific 2-3 sentence routine recommendation",
    "suggested_frequency": "daily/3x per week/weekdays/weekly",
    "tips": ["tip 1", "tip 2", "tip 3"]
}}"""

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            config=types.GenerateContentConfig(
                max_output_tokens=300,
                temperature=0.3
            )
        )
        
        import json
        text = response.text
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            ai_result = json.loads(text[start:end])
            category = ai_result.get("category", category)
            suggested_routine = ai_result.get("suggested_routine", "Start with 15 minutes daily and gradually increase.")
            suggested_frequency = ai_result.get("suggested_frequency", "daily")
            tips = ai_result.get("tips", ["Start small", "Be consistent", "Track progress"])
        else:
            suggested_routine = "Start with 15 minutes daily and build from there."
            suggested_frequency = "daily"
            tips = ["Start small and build up", "Set a specific time each day", "Track your streaks"]
    except Exception as e:
        print(f"AI classification error: {e}")
        suggested_routine = "Start with 15 minutes daily and build from there."
        suggested_frequency = "daily"
        tips = ["Start small and build up", "Set a specific time each day", "Track your streaks"]
    
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
        suggested_routine=suggested_routine,
        suggested_frequency=suggested_frequency,
        tips=tips
    )
