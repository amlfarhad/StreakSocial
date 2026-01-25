"""
Agentic AI Coach with Tool Calling
Enables multi-step reasoning and autonomous actions
"""
import os
import json
from google import genai
from google.genai import types
from .opik_config import track, OPIK_ENABLED

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Define tools the agent can use
AGENT_TOOLS = [
    {
        "name": "break_down_goal",
        "description": "Break a goal into actionable sub-tasks and milestones. Use this when the user sets a new goal or asks for a plan.",
        "parameters": {
            "type": "object",
            "properties": {
                "goal": {
                    "type": "string",
                    "description": "The main goal to break down"
                },
                "timeframe": {
                    "type": "string",
                    "description": "Target timeframe (e.g., '30 days', '3 months')"
                },
                "experience_level": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced"],
                    "description": "User's experience level with this type of goal"
                }
            },
            "required": ["goal"]
        }
    },
    {
        "name": "analyze_streak_pattern",
        "description": "Analyze the user's check-in patterns and provide insights. Use when discussing progress or motivation.",
        "parameters": {
            "type": "object",
            "properties": {
                "current_streak": {
                    "type": "integer",
                    "description": "Current streak count"
                },
                "goal_type": {
                    "type": "string",
                    "description": "Type of goal (fitness, learning, habit, etc.)"
                }
            },
            "required": ["current_streak"]
        }
    },
    {
        "name": "suggest_next_action",
        "description": "Suggest a specific, actionable next step for the user based on their goal and current progress.",
        "parameters": {
            "type": "object",
            "properties": {
                "goal": {
                    "type": "string",
                    "description": "The user's goal"
                },
                "current_streak": {
                    "type": "integer",
                    "description": "Current streak"
                },
                "time_of_day": {
                    "type": "string",
                    "enum": ["morning", "afternoon", "evening"],
                    "description": "Current time of day"
                }
            },
            "required": ["goal"]
        }
    }
]

# Tool implementations
def break_down_goal(goal: str, timeframe: str = "30 days", experience_level: str = "beginner") -> dict:
    """Generate a structured breakdown of a goal into milestones and daily tasks"""
    prompt = f"""Create a structured plan for this goal: "{goal}"
Timeframe: {timeframe}
Experience level: {experience_level}

Return a JSON object with:
{{
    "milestones": [
        {{"week": 1, "target": "...", "daily_actions": ["...", "..."]}}
    ],
    "daily_habit": "The core daily action to build",
    "success_metrics": ["How to measure progress"],
    "potential_obstacles": ["Common challenges"],
    "tips": ["Quick tips for success"]
}}

Be specific and realistic. Focus on sustainable progress."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            config=types.GenerateContentConfig(
                max_output_tokens=1000,
                temperature=0.7
            )
        )
        text = response.text
        # Extract JSON from response
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
    except Exception as e:
        print(f"Goal breakdown error: {e}")
    
    return {
        "milestones": [{"week": 1, "target": "Get started", "daily_actions": ["Take the first step"]}],
        "daily_habit": "Consistent daily action",
        "success_metrics": ["Track your progress"],
        "potential_obstacles": ["Time management"],
        "tips": ["Start small and build up"]
    }


def analyze_streak_pattern(current_streak: int, goal_type: str = "habit") -> dict:
    """Analyze streak and provide personalized insights"""
    insights = {
        "streak_status": "amazing" if current_streak >= 21 else "building" if current_streak >= 7 else "starting",
        "milestone_progress": f"{current_streak}/21 days to habit formation",
        "encouragement": "",
        "risk_level": "low"
    }
    
    if current_streak == 0:
        insights["encouragement"] = "Today is a perfect day to start fresh! Every streak begins with day 1."
        insights["risk_level"] = "restart"
    elif current_streak < 3:
        insights["encouragement"] = "Great start! The first few days are the hardest. Keep pushing!"
        insights["risk_level"] = "high"
    elif current_streak < 7:
        insights["encouragement"] = f"You're building momentum! {7 - current_streak} more days to your first weekly milestone."
        insights["risk_level"] = "medium"
    elif current_streak < 21:
        insights["encouragement"] = f"Incredible consistency! {21 - current_streak} days until this becomes a true habit."
        insights["risk_level"] = "low"
    else:
        insights["encouragement"] = f"🔥 {current_streak} days! You've made this a part of who you are!"
        insights["risk_level"] = "very_low"
    
    return insights


def suggest_next_action(goal: str, current_streak: int = 0, time_of_day: str = "morning") -> dict:
    """Suggest a specific actionable next step"""
    prompt = f"""Based on this goal: "{goal}"
Current streak: {current_streak} days
Time of day: {time_of_day}

Suggest ONE specific, actionable thing the user can do RIGHT NOW.
Keep it short (2-3 sentences max) and motivating.
If streak is 0, focus on starting fresh. If high streak, focus on maintenance."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            config=types.GenerateContentConfig(
                max_output_tokens=150,
                temperature=0.8
            )
        )
        return {
            "action": response.text.strip(),
            "urgency": "high" if current_streak == 0 else "normal",
            "estimated_time": "5-15 minutes"
        }
    except Exception as e:
        print(f"Suggestion error: {e}")
        return {
            "action": f"Take 5 minutes to work on your {goal.lower()} goal right now!",
            "urgency": "normal",
            "estimated_time": "5 minutes"
        }


# Tool dispatcher
TOOL_FUNCTIONS = {
    "break_down_goal": break_down_goal,
    "analyze_streak_pattern": analyze_streak_pattern,
    "suggest_next_action": suggest_next_action
}


@track(
    name="agentic_coach",
    tags=["agent", "gemini", "tool-calling"],
    metadata={"model": "gemini-2.5-flash-lite", "type": "agentic"}
)
def agentic_chat(message: str, goal_title: str, streak: int, history: list = None) -> dict:
    """
    Agentic AI coach that can use tools to provide better assistance.
    Returns both the response and any tool calls made.
    """
    system_prompt = f"""You are an intelligent AI coach helping with: {goal_title} (current streak: {streak} days).

You have access to these tools:
1. break_down_goal - Use when user wants to plan or structure their goal
2. analyze_streak_pattern - Use when discussing progress or motivation
3. suggest_next_action - Use when user needs direction on what to do next

GUIDELINES:
- Use tools proactively when they would help the user
- After using a tool, explain the results in a friendly way
- Be encouraging and action-oriented
- Keep responses concise but helpful

SAFETY:
- You're not a medical professional - recommend consulting experts for health advice
- Encourage sustainable, healthy habits
- If user shows signs of distress, provide crisis resources

Respond naturally and use tools when they add value."""

    # Build conversation
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
    
    # Convert tools to Gemini format
    gemini_tools = []
    for tool in AGENT_TOOLS:
        gemini_tools.append(types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=tool["name"],
                    description=tool["description"],
                    parameters=tool["parameters"]
                )
            ]
        ))
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=800,
                temperature=0.7,
                tools=gemini_tools
            )
        )
        
        # Check for function calls
        tool_calls = []
        tool_results = []
        final_text = ""
        
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    fc = part.function_call
                    tool_name = fc.name
                    tool_args = dict(fc.args) if fc.args else {}
                    
                    # Execute the tool
                    if tool_name in TOOL_FUNCTIONS:
                        result = TOOL_FUNCTIONS[tool_name](**tool_args)
                        tool_calls.append({
                            "tool": tool_name,
                            "args": tool_args,
                            "result": result
                        })
                        tool_results.append(result)
                
                if hasattr(part, 'text') and part.text:
                    final_text += part.text
        
        # If tools were called, generate a follow-up response explaining results
        if tool_calls and not final_text:
            follow_up_prompt = f"Based on these tool results, provide a helpful response:\n{json.dumps(tool_results, indent=2)}"
            
            follow_up = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=[types.Content(role="user", parts=[types.Part(text=follow_up_prompt)])],
                config=types.GenerateContentConfig(
                    system_instruction="Summarize these results in a friendly, actionable way. Be concise.",
                    max_output_tokens=400,
                    temperature=0.7
                )
            )
            final_text = follow_up.text
        
        return {
            "message": final_text or "I'm here to help! What would you like to work on today?",
            "tool_calls": tool_calls,
            "is_agentic": len(tool_calls) > 0
        }
        
    except Exception as e:
        print(f"Agentic chat error: {e}")
        return {
            "message": f"Agentic System Error: {str(e)}",
            "tool_calls": [],
            "is_agentic": False
        }


@track(
    name="create_goal_plan",
    tags=["agent", "planning", "gemini"],
    metadata={"model": "gemini-2.5-flash-lite", "type": "goal-breakdown"}
)
def create_goal_plan(goal_description: str, timeframe: str = "30 days") -> dict:
    """
    Agentic goal creation - automatically breaks down a goal into a structured plan.
    This is called during the goal creation flow after refinement.
    """
    plan = break_down_goal(goal_description, timeframe)
    
    # Generate a friendly summary
    summary_prompt = f"""Summarize this goal plan in 2-3 encouraging sentences:
Goal: {goal_description}
Milestones: {len(plan.get('milestones', []))} weeks
Daily habit: {plan.get('daily_habit', 'Daily practice')}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[types.Content(role="user", parts=[types.Part(text=summary_prompt)])],
            config=types.GenerateContentConfig(
                max_output_tokens=150,
                temperature=0.7
            )
        )
        plan["summary"] = response.text.strip()
    except:
        plan["summary"] = f"You're on your way to {goal_description}! Let's make it happen."
    
    return plan
