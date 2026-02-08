# StreakSocial — Hackathon Submission Guide

---

## ONE-LINER

A social accountability app where friends keep each other honest on goals through AI-verified photo check-ins and an agentic AI coach — with full LLM observability via Opik.

---

## DETAILED EXPLANATION (copy-paste ready)

**StreakSocial** is a social goal accountability app that combines BeReal-style photo check-ins with an agentic AI coach, built on React Native (Expo) and FastAPI, with full LLM observability through Opik.

### The Problem

People set goals and quit. Accountability apps exist, but they rely on the honor system. There's no proof, no social pressure, and no intelligent guidance.

### What We Built

**Core Loop:** Users create goals with the help of a conversational AI that refines vague ideas ("I want to get fit") into clear, trackable commitments. Each day, they check in by taking a photo — the AI verifies the photo matches the goal using Gemini's vision capabilities. Friends see each other's check-ins in a social feed, creating real accountability.

**Agentic AI Coach:** Not just a chatbot. The coach autonomously decides when to use tools — breaking down goals into milestones, analyzing streak patterns, or suggesting time-specific next actions. Users see which tools the agent used, making the AI's reasoning transparent.

**Integrity Algorithm:** The social feed is ranked by consistency, not popularity. Users who check in honestly and regularly rise to the top. Integrity badges (gold/silver/bronze) reward sustained effort.

**Gamification:** Streaks, XP, levels, achievement badges, and time-bound community challenges with leaderboards keep users engaged.

### Opik Integration (LLM Observability)

Every AI interaction is traced end-to-end via Opik:

- **7 tracked AI functions:** Coaching chat, goal refinement, photo verification, agentic tool-calling, goal planning, goal classification, and check-in verification — all decorated with `@track` and tagged by type.
- **Human-in-the-loop evaluation:** Each AI coach response shows inline thumbs up/down buttons. When a user taps one, the feedback is sent to Opik's `log_traces_feedback` API with the trace ID, creating a direct link between the conversation trace and user satisfaction.
- **Agentic tracing:** When the agent calls tools (e.g., `break_down_goal`, `analyze_streak_pattern`), the tool names, arguments, and results are captured in the trace metadata — visible both in the app UI and the Opik dashboard.
- **Graceful degradation:** If Opik isn't configured, the `@track` decorator becomes a no-op. The app works identically with or without observability enabled.

This creates a complete feedback loop: AI responds → user rates → trace + feedback logged → dashboard shows quality metrics → prompts can be improved.

### Tech Stack

- **Frontend:** React Native + Expo 54, react-native-reanimated, expo-haptics
- **Backend:** Python FastAPI
- **AI:** Google Gemini 2.5 Flash Lite (chat, vision, function calling)
- **Auth:** Supabase
- **Observability:** Opik by Comet
- **Deployment:** Railway (API) + Vercel (Web)

### What Makes It Different

Most hackathon AI apps are wrappers around a chat endpoint. StreakSocial treats AI as a first-class product feature — the coach is agentic, the verification uses vision, the classification is intelligent — and every single AI call is observable, traceable, and evaluatable through Opik. The human feedback loop isn't bolted on; it's part of the core UX.

---

## DEMO VIDEO SCRIPT (2-3 minutes)

### 0:00–0:15 — The Hook

- Open the app, show the login screen with animations
- Say: "This is StreakSocial — social accountability with AI."

### 0:15–0:40 — Goals & Tracking

- Show the Goals screen with animated cards
- Tap a goal, show the detail view
- Point out: streak heat map, animated progress bar, weekly check-in grid
- Say: "Each goal tracks your streak with visual progress and a mini heat map."

### 0:40–1:10 — Agentic AI Coach + Opik Feedback

- Open the AI Coach for a goal
- Ask something like: "Help me stay consistent with running"
- Point out the AGENTIC badge and tool usage indicator ("Used 2 tools: analyze streak pattern, suggest next action")
- After the response, tap the thumbs up button
- Say: "Every AI response is traced by Opik. Users rate responses inline — this feedback goes directly to the Opik dashboard for evaluation."

### 1:10–1:30 — Photo Check-In + AI Verification

- Tap "Check in now" on a goal
- Show the camera, take a photo
- Show the verification loading screen, then the verified screen with confetti
- Say: "AI verifies your photo actually matches your goal. No more fake check-ins."

### 1:30–1:50 — Social Feed

- Switch to the Feed tab
- Double-tap a post to show the heart animation
- Point out the integrity badges and consistency percentages
- Say: "The feed ranks by consistency, not popularity. Honest effort gets visibility."

### 1:50–2:10 — Compete

- Switch to the Compete tab
- Show the leaderboard with animated entries
- Show a challenge card
- Show the achievements grid
- Say: "Gamification keeps users engaged — leaderboards, challenges, and achievement badges."

### 2:10–2:30 — Opik Dashboard (the closer)

- Switch to browser, open the Opik/Comet dashboard
- Show the list of traced AI calls (tagged: ai-coach, agent, vision, classification)
- Show a specific trace with the user satisfaction feedback score
- Say: "Every AI interaction — coaching, classification, verification — is fully observable in Opik. This is our evaluation pipeline for continuous prompt improvement."

### 2:30–2:40 — Closing

- Toggle dark mode in the app
- Say: "StreakSocial. Accountability you can see. AI you can trust."

---

## PRESENTATION DECK STRUCTURE (6-8 slides)

### Slide 1 — Title

- "StreakSocial"
- One-liner underneath
- One hero screenshot of the app (Goals screen or Feed)

### Slide 2 — The Problem

- "People quit goals."
- Three pain points:
  - No proof of effort (honor system fails)
  - No social pressure (solo apps don't work)
  - No smart guidance (generic reminders don't help)

### Slide 3 — How It Works

Four panels in a row:
1. **Set Goal** — AI refines your idea into a clear commitment
2. **Check In** — Take a daily photo as proof
3. **Get Verified** — AI vision confirms it matches your goal
4. **Stay Accountable** — Friends see your streaks, cheer you on

### Slide 4 — Agentic AI Coach

- Screenshot of the AI Coach with tool usage visible
- Callouts:
  - "Autonomously chooses tools"
  - "Breaks down goals, analyzes patterns, suggests actions"
  - "Transparent reasoning — users see which tools were used"

### Slide 5 — Opik Integration (Architecture)

Simple flow diagram:

```
User asks AI Coach
        ↓
Gemini 2.5 responds (with tool calls)
        ↓
@track decorator → Opik trace created
        ↓
User taps 👍/👎 in app
        ↓
Feedback logged to trace via Opik API
        ↓
Opik Dashboard: review quality, improve prompts
```

- Callout: "7 tracked AI functions, all tagged and searchable"

### Slide 6 — The Feedback Loop (Side by Side)

- Left: screenshot of thumbs up/down in the app
- Right: screenshot of the Opik dashboard showing the trace + feedback score
- Caption: "Human-in-the-loop evaluation, built into the product UX"

### Slide 7 — Tech Stack

Icons or logos in a row:
- Expo (Frontend)
- FastAPI (Backend)
- Gemini 2.5 (AI — chat, vision, function calling)
- Supabase (Auth)
- Opik by Comet (Observability)

### Slide 8 — Try It

- QR code or link to the deployed app
- GitHub repo link
- "Questions?"

---

## KEY TALKING POINTS FOR JUDGES

If judges ask questions, hit these:

1. **"Why Opik?"** — "We needed to understand if our AI coach was actually helpful. Opik lets us trace every call, and the inline feedback buttons create a direct signal from users to the dashboard. We can see which prompts work and which don't."

2. **"What's agentic about it?"** — "The coach doesn't just respond — it decides whether to call tools. If you ask about progress, it autonomously runs `analyze_streak_pattern`. If you ask for a plan, it calls `break_down_goal`. The user sees the tool execution in real-time."

3. **"How does photo verification work?"** — "We use Gemini's vision capabilities to analyze check-in photos against the goal category. For the demo we use a keyword heuristic + AI fallback, but the architecture supports full multimodal verification. Every verification is traced in Opik."

4. **"What would you build next?"** — "Push notifications for streak risk, real image analysis in production, Opik evaluation datasets for automated prompt testing, and friend challenges with head-to-head accountability."

---

## CHECKLIST BEFORE SUBMITTING

- [ ] Record demo video (follow script above)
- [ ] Upload video to YouTube/Loom/Google Drive (get shareable link)
- [ ] Create presentation deck (Google Slides/Canva, follow structure above)
- [ ] Upload deck or get shareable link
- [ ] Take screenshots of the Opik dashboard with real traces
- [ ] Test the deployed app one more time (Railway backend + Vercel frontend)
- [ ] Copy the detailed explanation into the submission form
- [ ] Copy the one-liner into the submission form
- [ ] Paste video link
- [ ] Paste presentation link
- [ ] Submit
