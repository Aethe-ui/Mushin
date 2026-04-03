# 🧠 Mushin – Full System Context (AI Agent Build Document)

> **Version:** 1.0 | **Type:** Hackathon MVP | **Duration:** 24 Hours
> **Stack:** Next.js · Supabase · OpenAI · Tailwind CSS · Vercel

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | Mushin |
| **Tagline** | The Focus Operating System for the AI Era |
| **Type** | Productivity Platform (MVP) |
| **Build Context** | 24-hour hackathon |
| **Origin** | "Mushin" (無心) — Zen concept meaning "no mind"; total awareness without distraction |

---

## 2. Core Philosophy

> **Focus is the most valuable resource. Protect it at all costs.**

Mushin is NOT a task manager. It is NOT a chat app. It is a **Focus Operating System** — a unified environment whose primary job is to protect and enhance cognitive flow.

### Design Principles (Non-Negotiable)
- **Minimal by default** — Every UI element must justify its existence
- **Silent AI** — AI assists without interrupting
- **Passive collaboration** — Teammates are visible, not intrusive
- **Zero cognitive overhead** — Reduce decisions, reduce fatigue
- **Flow protection** — Nothing should break the user's concentration

---

## 3. Problem Statement

Modern knowledge workers face a broken environment:

- **Constant interruptions** — Slack pings, email alerts, WhatsApp notifications
- **Context switching** — Jumping between tools breaks deep thinking
- **Overloaded UIs** — Too many buttons, panels, and widgets compete for attention
- **Intrusive collaboration** — Real-time presence turns teammates into distractions

**Result:** Users do *shallow work* instead of *deep work* — leading to reduced output, mental fatigue, and diminished creative capacity.

---

## 4. Solution Overview

Mushin provides a **single, distraction-free environment** with three integrated layers:

| Layer | Role |
|---|---|
| 🎯 Deep Work Mode | Timed, immersive focus sessions with UI simplification |
| 🤖 Silent AI Assistant | Background context-aware help — no popups, no chatbot |
| 👥 Passive Collaboration | Presence + shared workspaces without alerts |

---

## 5. Feature Specifications

### 5.1 Deep Work Mode (Priority: P0 — Build First)

The core feature. Everything else supports this.

**Behavior:**
- User initiates a timed focus session (25 min / 50 min / custom)
- Interface shifts to distraction-minimized state (hide sidebars, mute alerts)
- Visual countdown timer displayed
- Optional ambient/minimal animation to signal active focus
- On session end → auto-save + show summary

**UI States:**

| State | Description | UI Behavior |
|---|---|---|
| `idle` | No session active | Full UI visible |
| `active` | Focus session running | Minimal UI, timer prominent |
| `break` | Between sessions | Gentle UI, timer for break duration |
| `complete` | Session ended | Summary screen, prompt next action |

**Functional Requirements:**
- `POST /api/sessions/start` — start session, persist to DB
- `POST /api/sessions/end` — end session, save duration + status
- `PATCH /api/sessions/:id/pause` — pause session
- Session state: `{ id, user_id, start_time, end_time, duration, status, goal? }`
- Timer runs client-side (not server-dependent)
- Persist session even if user closes tab (use `beforeunload` + auto-save)

---

### 5.2 AI Assistant (Priority: P1)

**Role:** Background assistant. NOT a chatbot. NOT a popup wizard.

**Behavior Rules:**
- Suggestions appear in a passive side panel — never as modals or alerts
- Short outputs only (1–3 lines max per suggestion)
- Triggered by inactivity, content change, or explicit user request
- AI must analyze context from: current workspace content, session goal, recent activity

**Capabilities:**
- Summarize long content the user is working on
- Suggest next actions based on session goal
- Improve phrasing or structure of written content
- Flag when scope of work seems too large for remaining session time

**API Contract:**
```
POST /api/ai/assist
Body: { workspace_content, session_goal, user_signal }
Response: { suggestion_type, suggestion_text, confidence }
```

**OpenAI Integration:**
- Model: `gpt-4o` (preferred) or `gpt-3.5-turbo` (fallback for speed)
- System prompt must enforce: brevity, action-orientation, no verbosity
- Max tokens per response: 150
- Temperature: 0.4 (focused, consistent outputs)

**System Prompt Template:**
```
You are a silent productivity assistant. The user is in a deep focus session.
Your job: provide ONE short, actionable suggestion (max 2 sentences).
Do not greet. Do not explain yourself. Do not ask questions.
Context: {workspace_content}
Goal: {session_goal}
```

---

### 5.3 Real-Time Collaboration (Priority: P1)

**Goal:** Enable passive teamwork without interrupting focus.

**Features:**
- Shared workspace (Supabase Realtime)
- Presence indicators — show who is active (avatar/dot, no alert)
- Content syncs live — no manual save needed
- No push notifications, no sound alerts, no modals on teammate activity

**Presence Logic:**
- On join: `INSERT INTO presence (workspace_id, user_id, last_seen)`
- Heartbeat every 30s: `UPDATE presence SET last_seen = now()`
- Show users active within last 60s as "present"
- Supabase Realtime channel: `workspace:{workspace_id}`

**Sync Logic:**
- Use Supabase Realtime `on('postgres_changes')` for content updates
- Debounce writes: only push to DB after 500ms of inactivity
- Display "last updated by [name] X mins ago" — passive, not intrusive

---

### 5.4 Distraction Control System (Priority: P1)

**Behaviors during active focus session:**
- Hide: sidebars, navigation, collaboration panel, non-essential buttons
- Suppress: browser notification requests, in-app banners
- Dim: anything outside the primary work area
- Lock: prevent accidental session exit (confirm dialog if user tries to leave)

**Implementation Notes:**
- Use CSS class toggling on `<body>` — e.g., `body.focus-mode .sidebar { display: none }`
- Store focus state in React context / Zustand store
- Restore full UI instantly when session ends

---

### 5.5 Progress Tracking & Analytics (Priority: P2 — Build if time allows)

**Data to collect per session:**
- Duration (actual vs planned)
- Session goal (if set)
- Completion status (`completed` | `abandoned` | `paused`)
- Workspace used

**Dashboard:**
- Today's total focus time
- Weekly focus trend (bar chart)
- Average session length
- Focus streak (days in a row with ≥1 session)

---

## 6. Database Schema (Supabase / PostgreSQL)

### `users` (managed by Supabase Auth)
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
email       text UNIQUE NOT NULL
created_at  timestamptz DEFAULT now()
full_name   text
avatar_url  text
```

### `sessions`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id      uuid REFERENCES users(id) ON DELETE CASCADE
workspace_id uuid REFERENCES workspaces(id)
start_time   timestamptz NOT NULL DEFAULT now()
end_time     timestamptz
duration     integer  -- seconds
status       text CHECK (status IN ('active', 'paused', 'completed', 'abandoned'))
goal         text     -- optional session goal set by user
planned_duration integer  -- seconds (e.g., 1500 = 25 min)
created_at   timestamptz DEFAULT now()
```

### `workspaces`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
owner_id    uuid REFERENCES users(id) ON DELETE CASCADE
title       text NOT NULL DEFAULT 'Untitled'
content     text  -- raw text or JSON (editor content)
updated_at  timestamptz DEFAULT now()
created_at  timestamptz DEFAULT now()
```

### `collaborators`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE
user_id      uuid REFERENCES users(id) ON DELETE CASCADE
role         text DEFAULT 'editor'
joined_at    timestamptz DEFAULT now()
UNIQUE(workspace_id, user_id)
```

### `presence`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE
user_id      uuid REFERENCES users(id) ON DELETE CASCADE
last_seen    timestamptz DEFAULT now()
UNIQUE(workspace_id, user_id)
```

### Row Level Security (RLS)
- Enable RLS on all tables
- `sessions`: users can only read/write their own rows
- `workspaces`: owner + collaborators can read; only owner can delete
- `collaborators`: workspace owner manages; collaborator can read their own row
- `presence`: any collaborator can read/write presence for shared workspaces

---

## 7. System Architecture

```
┌─────────────────────────────────────────┐
│           Client (Next.js / Vercel)      │
│  ┌──────────────┐  ┌───────────────┐    │
│  │  Focus Timer │  │ Workspace     │    │
│  │  Component   │  │ Editor        │    │
│  └──────────────┘  └───────────────┘    │
│  ┌──────────────┐  ┌───────────────┐    │
│  │  AI Panel    │  │ Collab Layer  │    │
│  └──────────────┘  └───────────────┘    │
└────────────────┬────────────────────────┘
                 │ REST + Realtime WS
┌────────────────▼────────────────────────┐
│           Supabase Backend               │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │   Auth   │ │Postgres  │ │Realtime │ │
│  │ (JWT)    │ │   DB     │ │ (WS)    │ │
│  └──────────┘ └──────────┘ └─────────┘ │
└────────────────┬────────────────────────┘
                 │ Server-side API Route
┌────────────────▼────────────────────────┐
│           AI Layer (OpenAI API)          │
│   Input: workspace content + goal        │
│   Output: suggestions, summaries         │
└─────────────────────────────────────────┘
```

---

## 8. Frontend Component Map

```
/app
  /dashboard          → Home screen, session launcher, recent workspaces
  /focus              → Deep Work Mode (full-screen focus session)
  /workspace/[id]     → Editor + collab + AI panel
  /analytics          → (P2) Focus stats and trends

/components
  /focus
    FocusTimer.tsx    → Countdown, start/pause/end controls
    FocusBar.tsx      → Minimal top bar shown during focus
    SessionGoal.tsx   → Optional goal input before starting
  /workspace
    Editor.tsx        → Text/rich editor (use Tiptap or plain textarea MVP)
    CollabPresence.tsx → Avatar dots for active collaborators
    AISuggestion.tsx  → Passive suggestion panel (slides in from right)
  /ui
    Button.tsx
    Modal.tsx         → Used sparingly (only for destructive actions)
    Timer.tsx         → Reusable countdown display
```

---

## 9. API Routes (Next.js)

```
POST   /api/sessions/start         → Create session record, return session_id
POST   /api/sessions/end           → Update end_time, duration, status
PATCH  /api/sessions/:id/pause     → Set status = 'paused'
GET    /api/sessions/history       → List user's past sessions

POST   /api/ai/assist              → Call OpenAI, return suggestion
GET    /api/workspaces             → List user's workspaces
POST   /api/workspaces             → Create workspace
PATCH  /api/workspaces/:id         → Update content (debounced)
POST   /api/workspaces/:id/invite  → Add collaborator by email
```

---

## 10. Key Implementation Details

### Timer (Client-Side)
```typescript
// Use setInterval + localStorage for persistence
const startTimer = (durationSeconds: number) => {
  const endTime = Date.now() + durationSeconds * 1000
  localStorage.setItem('mushin_session_end', String(endTime))
  // interval updates remaining time every second
}
// On mount: check localStorage to restore interrupted session
```

### Supabase Realtime (Workspace Sync)
```typescript
const channel = supabase.channel(`workspace:${workspaceId}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workspaces' },
    (payload) => setContent(payload.new.content))
  .subscribe()
```

### AI Call (Server Route)
```typescript
// /api/ai/assist
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  max_tokens: 150,
  temperature: 0.4,
  messages: [
    { role: 'system', content: MUSHIN_SYSTEM_PROMPT },
    { role: 'user', content: `Content: ${workspace_content}\nGoal: ${goal}` }
  ]
})
```

### Focus Mode (CSS)
```css
/* Applied to body during active session */
body.focus-mode .sidebar,
body.focus-mode .nav-secondary,
body.focus-mode .ai-panel,
body.focus-mode .collab-panel {
  display: none;
}
body.focus-mode .focus-bar {
  display: flex;
}
```

---

## 11. User Flows

### Flow A — Start a Focus Session
```
Login → Dashboard → Set goal (optional) → Choose duration → Start
→ UI simplifies (focus mode on) → Timer counts down
→ AI monitors passively → Session ends → Summary shown → Data saved
```

### Flow B — Collaborate Without Disruption
```
Create workspace → Share invite link → Collaborator joins
→ Both see presence dots → Content syncs live in background
→ No alerts, no pop-ups → Focus maintained
```

### Flow C — AI Assistance
```
User writing in workspace → Pauses for 10s (inactivity trigger)
→ AI analyzes content + goal → Suggestion appears in side panel
→ User reads (or ignores) → Panel fades after 30s if not interacted with
```

---

## 12. Tech Stack (Pinned)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Use server components where possible |
| Styling | Tailwind CSS | Utility-first, minimal custom CSS |
| State | Zustand | Lightweight, no Redux complexity |
| Auth | Supabase Auth | Email/password + Google OAuth |
| Database | Supabase (PostgreSQL) | With RLS enabled |
| Realtime | Supabase Realtime | WebSocket channels |
| AI | OpenAI API (`gpt-4o`) | Via Next.js API routes (never expose key client-side) |
| Editor | Tiptap (MVP: `<textarea>`) | Start with textarea, upgrade if time allows |
| Deployment | Vercel | Connect GitHub, auto-deploy |

---

## 13. Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # Server-side only
OPENAI_API_KEY=your_openai_key                    # Server-side only, NEVER expose to client
```

---

## 14. Build Phases (24-Hour Execution Plan)

### Phase 1 — Foundation (0–6 hrs) 🟥 CRITICAL
- [ ] Init Next.js project + Tailwind
- [ ] Connect Supabase (auth, DB tables, RLS policies)
- [ ] Auth flow: sign up, login, protected routes
- [ ] Basic layout: dashboard shell

### Phase 2 — Core Feature (6–14 hrs) 🟥 CRITICAL
- [ ] Deep Work Mode timer (start, pause, end)
- [ ] Session persistence to Supabase
- [ ] Focus mode UI toggle (CSS focus-mode class)
- [ ] Workspace editor (basic textarea MVP)
- [ ] Auto-save workspace content to DB

### Phase 3 — Intelligence + Collab (14–20 hrs) 🟨 HIGH
- [ ] Supabase Realtime for workspace sync
- [ ] Presence tracking (who's active)
- [ ] OpenAI integration (server-side route)
- [ ] AI suggestion panel (passive, slide-in)

### Phase 4 — Polish (20–24 hrs) 🟩 NICE TO HAVE
- [ ] Analytics dashboard (session history, total focus time)
- [ ] UI refinement (animations, micro-interactions)
- [ ] Error handling + loading states
- [ ] Deploy to Vercel + smoke test

---

## 15. What NOT to Build

Avoid these. They are out of scope and will waste time:

| ❌ Don't Build | ✅ Instead |
|---|---|
| Full-featured rich text editor | Simple textarea or basic Tiptap |
| Complex task/kanban system | Session goal (single text input) |
| Notification/inbox system | Passive presence dots only |
| Social features (likes, comments) | Not applicable |
| Mobile app | Responsive web only |
| Custom auth system | Use Supabase Auth entirely |
| Admin dashboard | Not needed for MVP |

---

## 16. AI Agent Instructions

If you are an AI generating code for Mushin:

### Priorities (in order):
1. **Working MVP over perfect code** — ship it
2. **Simplicity over abstraction** — no over-engineering
3. **Core features first** — Deep Work Mode, then AI, then collab
4. **Clean architecture** — modular components, clear separation

### Code Guidelines:
- Use TypeScript throughout
- Use Supabase client library (not raw SQL from frontend)
- All OpenAI calls go through Next.js API routes — never client-side
- Use Zustand for global state (focus mode, session status)
- Keep components small and single-purpose
- Use `async/await`, not `.then()` chains
- Handle errors gracefully — show user-friendly messages
- Don't add dependencies not in the stack above without flagging it

### File Naming:
- Components: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Utils: `camelCase.ts`
- API routes: `route.ts` (Next.js App Router convention)

### When in Doubt:
- Choose the simpler implementation
- Prefer readability over cleverness
- A working feature beats an elegant unfinished one

---

## 17. Success Criteria

Mushin is MVP-complete when:

- [ ] User can sign up and log in
- [ ] User can start a timed focus session
- [ ] UI simplifies during focus (distractions hidden)
- [ ] Session is saved to database
- [ ] User can write in a workspace
- [ ] AI provides at least one passive suggestion
- [ ] Two users can share a workspace and see each other's presence
- [ ] App is deployed and accessible via URL

---

## 18. Vision (Post-Hackathon)

> Mushin aims to become the operating system for deep work in the AI era.

Future directions:
- OS-level distraction blocking (browser extension / desktop app)
- Biometric focus detection (camera-based attention tracking)
- Autonomous AI workflows that complete subtasks during breaks
- Smart environment control (lights, sounds, notifications — OS integrations)
- Advanced cognitive analytics (personal focus fingerprint)
- Team focus culture metrics for organizations

---

## 19. One-Line Summary

> **Mushin = Enter focus. AI works in the background. Team stays in sync. Nothing breaks your flow.**