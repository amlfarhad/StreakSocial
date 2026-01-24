# AI module
from .gemini import chat_with_coach, refine_goal, analyze_checkin_photo
from .opik_config import OPIK_ENABLED, log_feedback, get_current_trace_id

__all__ = [
    "chat_with_coach", 
    "refine_goal", 
    "analyze_checkin_photo",
    "OPIK_ENABLED",
    "log_feedback",
    "get_current_trace_id"
]

