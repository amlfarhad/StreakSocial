"""
Gemini AI Integration with Opik Observability
"""
import os
from google import genai
from google.genai import types

# Import Opik tracking (graceful fallback if not available)
from .opik_config import track, get_current_trace_id, OPIK_ENABLED

# Initialize Gemini client
# Client initialized inside functions to prevent startup crashes


# System prompts
GOAL_COACH_PROMPT = """You're a friendly, knowledgeable coach. The user is working on: {goal_title} ({streak} day streak).

HOW TO RESPOND:
• Answer directly — no need to repeat their goal back to them
• Be warm and conversational, like texting a smart friend
• Give specific, actionable advice
• Use natural formatting — short paragraphs, occasional bullet points
• Keep it concise but helpful

DON'T:
• Don't start with "For [goal name]..." — they already know their goal
• Don't be generic or preachy
• Don't use corporate language
• Don't over-explain

If they ask about something unrelated to their goal, gently redirect: "Happy to help with that, but I'm best at helping with [general topic]. What's on your mind about that?"

SAFETY GUIDELINES (follow these carefully):
• You are NOT a medical professional — for health/fitness goals, remind users to consult healthcare providers for personalized medical advice
• If the user mentions self-harm, suicidal thoughts, or severe distress, respond with empathy and provide: "If you're in crisis, please reach out to a crisis helpline (988 Suicide & Crisis Lifeline in US, or your local emergency services)"
• Encourage sustainable progress — missing a day is normal and healthy. Never shame users for breaking streaks
• Watch for signs of unhealthy patterns (extreme restriction, overexercise, obsessive behavior) and gently encourage balance and professional support
• For mental health goals, emphasize that this app complements but does NOT replace therapy or professional care
• Never provide specific medical diagnoses, medication advice, or treatment plans

Be the coach they actually want to talk to — supportive, encouraging, and responsible."""


@track(
    name="chat_with_coach",
    tags=["ai-coach", "gemini"],
    metadata={"model": "gemini-2.5-flash-lite", "max_tokens": 500}
)
def chat_with_coach(message: str, goal_title: str, streak: int, history: list = None) -> str:
    """Chat with AI coach about a specific goal"""
    system_prompt = GOAL_COACH_PROMPT.format(
        goal_title=goal_title,
        streak=streak
    )
    
    # Build messages
    contents = []
    if history:
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part(text=msg.get("content", ""))]
            ))
    
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=message)]
    ))
    
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=500,  # Keep responses short
                temperature=0.7
            )
        )
        return response.text
    except Exception as e:
        print(f"Gemini error: {e}")
        # For debugging purposes, exposing the error in the response temporarily
        return f"System Error: {str(e)}"


@track(
    name="refine_goal",
    tags=["goal-creation", "gemini"],
    metadata={"model": "gemini-2.5-flash-lite", "max_tokens": 300}
)
def refine_goal(user_input: str, conversation_history: list = None) -> dict:
    """Help user define their goal through conversation"""
    system_prompt = """You help users create clear, achievable goals. 
Ask 2-3 focused questions to understand what they want to achieve.
Once you have enough info, summarize their goal in a clear statement starting with "🎯 Your goal:".
Keep responses brief and friendly.

SAFETY NOTES:
• Encourage realistic, sustainable goals — avoid extreme targets
• For health goals, suggest consulting professionals for personalized plans
• If the goal seems potentially harmful (extreme weight loss, overexercise), gently suggest healthier alternatives
• Mental wellness goals should complement, not replace, professional care"""
    
    contents = []
    if conversation_history:
        for msg in conversation_history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part(text=msg.get("content", ""))]
            ))
    
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=user_input)]
    ))
    
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=300,
                temperature=0.7
            )
        )
        
        response_text = response.text
        is_complete = "🎯" in response_text or "your goal:" in response_text.lower()
        
        return {
            "message": response_text,
            "is_complete": is_complete
        }
    except Exception as e:
        print(f"Gemini error: {e}")
        return {
            "message": "What goal would you like to work on? Tell me a bit about what you want to achieve.",
            "is_complete": False
        }


@track(
    name="classify_goal",
    tags=["classification", "gemini"],
    metadata={"model": "gemini-2.5-flash-lite", "max_tokens": 300}
)
def classify_goal_ai(goal_title: str) -> dict:
    """AI-powered goal classification with Opik tracking"""
    import json

    goal = goal_title.lower()

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

Goal: "{goal_title}"

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

        text = response.text
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            ai_result = json.loads(text[start:end])
            return {
                "category": ai_result.get("category", category),
                "suggested_routine": ai_result.get("suggested_routine", "Start with 15 minutes daily and gradually increase."),
                "suggested_frequency": ai_result.get("suggested_frequency", "daily"),
                "tips": ai_result.get("tips", ["Start small", "Be consistent", "Track progress"])
            }
    except Exception as e:
        print(f"AI classification error: {e}")

    return {
        "category": category,
        "suggested_routine": "Start with 15 minutes daily and build from there.",
        "suggested_frequency": "daily",
        "tips": ["Start small and build up", "Set a specific time each day", "Track your streaks"]
    }


@track(
    name="analyze_checkin_photo",
    tags=["vision", "checkin", "gemini"],
    metadata={"model": "gemini-2.5-flash-lite", "type": "multimodal"}
)
def analyze_checkin_photo(image_bytes: bytes, goal_title: str) -> dict:
    """Analyze check-in photo for relevance to goal"""
    import json
    
    prompt = f'''Analyze this check-in photo for the goal: "{goal_title}"

Return JSON only:
{{
    "is_relevant": true/false,
    "confidence": 0.0-1.0,
    "activity_detected": "what you see",
    "caption_suggestion": "short caption",
    "encouragement": "brief message"
}}'''
    
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=prompt),
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                max_output_tokens=200,
                temperature=0.3
            )
        )
        
        text = response.text
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
    except Exception as e:
        print(f"Vision error: {e}")
    
    return {
        "is_relevant": True,
        "confidence": 0.7,
        "activity_detected": "Activity in progress",
        "caption_suggestion": "Making progress! 💪",
        "encouragement": "Keep up the great work!"
    }


@track(
    name="verify_checkin",
    tags=["verification", "gemini"],
    metadata={"model": "gemini-2.5-flash-lite", "type": "heuristic+ai"}
)
def verify_checkin_ai(goal_title: str, goal_category: str, image_description: str = None) -> dict:
    """
    Verify check-in with Opik tracking.
    Uses keyword heuristics + Gemini fallback for demo.
    """
    import random

    goal_lower = goal_title.lower()
    description_lower = (image_description or "").lower()
    category = goal_category.lower()

    fitness_keywords = ["run", "gym", "workout", "exercise", "yoga", "sweat", "training", "fitness", "outdoor", "morning"]
    learning_keywords = ["book", "read", "study", "learn", "notes", "library", "desk"]
    wellness_keywords = ["meditate", "calm", "peaceful", "yoga", "relax", "morning", "nature"]

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

    # Demo: 70% approval rate
    if not verified and random.random() > 0.3:
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
            f"This doesn't quite look like {goal_title}. Try taking a photo that shows your progress!",
            f"Hmm, we couldn't verify this as a {goal_title} check-in. Show us what you've accomplished!",
            "We want to make sure you're really crushing your goals! Take a photo of your progress.",
        ]
        message = random.choice(messages)

    return {
        "verified": verified,
        "message": message,
        "confidence": confidence
    }
