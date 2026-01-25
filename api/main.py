"""
GoalSync API - FastAPI Backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="StreakSocial API",
    description="Backend for StreakSocial - Social goal accountability app",
    version="1.0.0"
)

# CORS - allow Expo app to connect
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],  # Wildcard + allow_credentials=True is invalid in browsers
    allow_origin_regex="https://.*\.vercel\.app|http://localhost:.*",  # Allow all Vercel apps & localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from routes import goals, checkins, ai_coach

app.include_router(goals.router, prefix="/goals", tags=["Goals"])
app.include_router(checkins.router, prefix="/checkins", tags=["Check-ins"])
app.include_router(ai_coach.router, prefix="/ai", tags=["AI Coach"])


@app.get("/")
async def root():
    return {"status": "ok", "message": "GoalSync API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
