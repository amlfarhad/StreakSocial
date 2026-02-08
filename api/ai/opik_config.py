"""
Opik Configuration for LLM Observability
Tracks all AI interactions for evaluation and monitoring
"""
import os
import time
from functools import wraps
import threading

# Thread-local storage for trace IDs
_trace_storage = threading.local()

# Check if Opik API key is configured
OPIK_API_KEY = os.getenv("OPIK_API_KEY")

# Project name for Opik dashboard
OPIK_PROJECT_NAME = "Encode Hack"

# Initialize Opik only if API key is provided
if OPIK_API_KEY and OPIK_API_KEY != "your-opik-api-key-here":
    try:
        import opik
        from opik import opik_context
        from opik import track as opik_track

        # Set environment variables for Opik (non-interactive configuration)
        os.environ.setdefault("OPIK_URL_OVERRIDE", "https://www.comet.com/opik/api")
        os.environ.setdefault("OPIK_PROJECT_NAME", OPIK_PROJECT_NAME)

        # Custom track decorator that captures trace ID after execution
        def track(*args, **kwargs):
            kwargs.setdefault("project_name", OPIK_PROJECT_NAME)

            def decorator(func):
                # Apply Opik's real track decorator
                tracked_func = opik_track(*args, **kwargs)(func)

                @wraps(func)
                def wrapper(*a, **kw):
                    start_time = time.time()
                    result = tracked_func(*a, **kw)
                    latency_ms = round((time.time() - start_time) * 1000)

                    # Capture trace ID from opik_context while still in scope
                    try:
                        trace_data = opik_context.get_current_trace_data()
                        if trace_data:
                            _trace_storage.trace_id = trace_data.id
                    except Exception:
                        pass

                    return result
                return wrapper
            return decorator

        OPIK_ENABLED = True
        print(f"✅ Opik observability enabled (project: {OPIK_PROJECT_NAME})")
    except ImportError as e:
        OPIK_ENABLED = False
        print(f"⚠️ Opik not installed: {e}")
        opik_context = None

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
    """Get the current trace ID from thread-local storage"""
    if not OPIK_ENABLED:
        return None
    try:
        # Try thread-local storage first (set by our custom decorator)
        trace_id = getattr(_trace_storage, 'trace_id', None)
        if trace_id:
            # Clear after reading to avoid stale IDs
            _trace_storage.trace_id = None
            return trace_id
        # Fallback to opik_context
        if opik_context:
            trace_data = opik_context.get_current_trace_data()
            if trace_data:
                return trace_data.id
        return None
    except:
        return None
