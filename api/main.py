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
    title="GoalSync API",
    description="Backend for GoalSync - Goal accountability app",
    version="1.0.0"
)

# CORS - allow Expo app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
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
