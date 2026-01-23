# GoalSync

A goal accountability app that combines Notion-style productivity with BeReal-style check-ins.

## Project Structure

```
├── app/                # React Native (Expo) frontend
│   └── App.tsx        # Main app component
├── api/               # Python (FastAPI) backend
│   ├── main.py       # API entry point
│   ├── ai/           # Gemini AI integration
│   └── routes/       # API endpoints
└── README.md
```

## Quick Start

### 1. Backend Setup

```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your API keys

# Run the server
python main.py
```

### 2. Frontend Setup

```bash
cd app
npm start
```

Then scan the QR code with Expo Go on your iPhone.

## API Keys Needed

1. **Gemini API Key**: Get it free at [aistudio.google.com](https://aistudio.google.com)
2. **Opik API Key**: Get it free at [comet.com/opik](https://comet.com/opik)

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Python + FastAPI
- **AI**: Google Gemini 2.5
- **Tracing**: Opik
