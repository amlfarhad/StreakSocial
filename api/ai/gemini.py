"""
Gemini AI Integration with Opik Tracing
"""
import os
from google import genai
from google.genai import types

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

Be the coach they actually want to talk to."""


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
        return f"I'm here to help you with \"{goal_title}\". What specific aspect would you like to work on?"


def refine_goal(user_input: str, conversation_history: list = None) -> dict:
    """Help user define their goal through conversation"""
    system_prompt = """You help users create clear, achievable goals. 
Ask 2-3 focused questions to understand what they want to achieve.
Once you have enough info, summarize their goal in a clear statement starting with "🎯 Your goal:".
Keep responses brief and friendly."""
    
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
