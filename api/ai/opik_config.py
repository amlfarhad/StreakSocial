"""
Opik Configuration for LLM Observability
Tracks all AI interactions for evaluation and monitoring
"""
import os
from functools import wraps

# Check if Opik API key is configured
OPIK_API_KEY = os.getenv("OPIK_API_KEY")

# Initialize Opik only if API key is provided
if OPIK_API_KEY and OPIK_API_KEY != "your-opik-api-key-here":
    try:
        import opik
        from opik import track, opik_context
        
        # Set environment variables for Opik (non-interactive configuration)
        os.environ.setdefault("OPIK_URL_OVERRIDE", "https://www.comet.com/opik/api")
        
        OPIK_ENABLED = True
        print("✅ Opik observability enabled")
    except ImportError as e:
        OPIK_ENABLED = False
        print(f"⚠️ Opik not installed: {e}")
        opik_context = None
        
        # Create no-op decorator
        def track(*args, **kwargs):
            def decorator(func):
                @wraps(func)
                def wrapper(*a, **kw):
                    return func(*a, **kw)
                return wrapper
            return decorator
    except Exception as e:
        OPIK_ENABLED = False
        print(f"⚠️ Opik configuration failed: {e}")
        opik_context = None
        
        def track(*args, **kwargs):
            def decorator(func):
                @wraps(func)
                def wrapper(*a, **kw):
                    return func(*a, **kw)
                return wrapper
            return decorator
else:
    # No API key - create no-op implementations
    OPIK_ENABLED = False
    print("ℹ️ Opik disabled (no API key configured)")
    opik_context = None
    
    def track(*args, **kwargs):
        """No-op decorator when Opik is not configured"""
        def decorator(func):
            @wraps(func)
            def wrapper(*a, **kw):
                return func(*a, **kw)
            return wrapper
        return decorator


def log_feedback(trace_id: str, score: float, comment: str = None):
    """
    Log user feedback for a specific trace.
    This enables human-in-the-loop evaluation of AI responses.
    
    Args:
        trace_id: The Opik trace ID
        score: User rating (0.0 to 1.0)
        comment: Optional feedback comment
    """
    if not OPIK_ENABLED:
        return False
    
    try:
        client = opik.Opik()
        client.log_traces_feedback(
            scores=[{
                "trace_id": trace_id,
                "name": "user_satisfaction",
                "value": score,
                "reason": comment
            }]
        )
        return True
    except Exception as e:
        print(f"Failed to log feedback: {e}")
        return False


def get_current_trace_id():
    """Get the current trace ID if within a tracked context"""
    if not OPIK_ENABLED or opik_context is None:
        return None
    try:
        return opik_context.get_current_trace_data().id
    except:
        return None
