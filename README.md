# StreakSocial

A social goal accountability app with AI coaching. Combines Notion-style productivity with BeReal-style check-ins.

## Features

- 🎯 **AI Goal Creation** — Conversational AI helps you define clear, achievable goals
- 💬 **AI Coach** — Get personalized advice and motivation for each goal
- 📷 **Photo Check-ins** — Daily photo proof with countdown timer
- 🔥 **Streak Tracking** — Build momentum with visual streak counters
- 📊 **Weekly Progress** — Notion-style progress visualization

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Python + FastAPI
- **AI**: Google Gemini 2.5
- **Tracing**: Opik

## Quick Start

### Backend

```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
python main.py
```

### Frontend

```bash
cd app
npm install
npm start
```

Scan QR code with Expo Go on your phone.

## API Keys

- **Gemini**: [aistudio.google.com](https://aistudio.google.com)
- **Opik**: [comet.com/opik](https://comet.com/opik)
