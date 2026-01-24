# StreakSocial

A social goal accountability app with AI coaching. Combines Notion-style productivity with BeReal-style check-ins.

## Features

- 🔐 **User Authentication** — Email/password login via Supabase
- 🎯 **AI Goal Creation** — Conversational AI helps you define clear, achievable goals
- 💬 **AI Coach** — Get personalized advice and motivation for each goal
- 📷 **Photo Check-ins** — Daily photo proof with in-app camera
- 🔥 **Streak Tracking** — Build momentum with visual streak counters
- 📸 **Social Feed** — See community check-ins and stay motivated
- 🌓 **Dark/Light Mode** — Beautiful warm theme with toggle
- 📊 **LLM Observability** — Full tracing and evaluation via Opik

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Python + FastAPI
- **Auth**: Supabase
- **AI**: Google Gemini 2.5
- **Observability**: Opik by Comet

## Quick Start

### 1. Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API and copy:
   - Project URL
   - `anon` public key
4. Update `app/lib/supabase.ts` with your credentials:

```typescript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 2. Backend Setup

```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
python main.py
```

### 3. Frontend Setup

```bash
cd app
npm install
npm start
```

Scan QR code with Expo Go on your phone.

## API Keys

- **Gemini**: [aistudio.google.com](https://aistudio.google.com)
- **Supabase**: [supabase.com](https://supabase.com)
- **Opik** (optional): [comet.com/opik](https://www.comet.com/signup?from=llm)

## LLM Observability with Opik

All AI interactions are tracked via [Opik](https://www.comet.com/docs/opik/) for evaluation and monitoring:

### What's Tracked
- 📝 **AI Coach conversations** — Full message history, goal context, response latency
- 🎯 **Goal refinement** — Multi-turn refinement flow, completion detection
- 📷 **Photo analysis** — Vision model confidence scores, relevance detection

### Human-in-the-Loop Feedback
Users can rate AI responses via the `/ai/feedback` endpoint:
```bash
curl -X POST http://localhost:8000/ai/feedback \
  -H "Content-Type: application/json" \
  -d '{"trace_id": "...", "score": 0.9, "comment": "Very helpful!"}'
```

### Dashboard
View all traces at [comet.com/opik](https://www.comet.com/opik) to:
- Review conversation quality
- Identify areas for prompt improvement
- Track user satisfaction scores

