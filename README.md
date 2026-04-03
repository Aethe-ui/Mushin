# Mushin

The Focus Operating System for the AI Era.

Mushin is a focus-first productivity platform built to protect deep work by combining:

- Deep Work Mode
- Silent AI assistance
- Passive real-time collaboration

Unlike traditional productivity tools, Mushin is designed as a **Focus Operating System** where the primary goal is simple: protect cognitive flow.

## Core Principle

> Focus is the most valuable resource. Protect it at all costs.

## Problem

Modern work is fragmented by constant notifications, context switching, overloaded interfaces, and intrusive collaboration.

This leads to shallow work, lower output, and mental fatigue.

## Solution

Mushin provides one unified environment where users can:

1. Enter Deep Work Mode
2. Minimize distractions automatically
3. Receive quiet, contextual AI help
4. Collaborate in real-time without interruptions

## MVP Features

### 1) Deep Work Mode (P0)

- Timer-based focus sessions (25 min, 50 min, custom)
- UI states: `idle`, `active`, `break`, `complete`
- Start, pause, and end session flows
- Session persistence and summary

### 2) Silent AI Assistant (P1)

- Passive suggestions panel (no popups)
- Short, actionable guidance
- Uses workspace content + session goal as context

### 3) Passive Collaboration (P1)

- Shared workspace editing
- Presence indicators
- Real-time sync via Supabase Realtime
- No disruptive alerts

### 4) Distraction Control (P1)

- Hides non-essential UI during focus
- Suppresses interruption-heavy elements
- Keeps attention on primary work surface

### 5) Progress Tracking (P2)

- Session history
- Focus duration and trends
- Basic productivity insights

## Architecture

```text
[ Static Frontend (HTML/CSS/JS) ]
          ↓
[ Python API (backend/api_server.py) ]
          ↓
[ Prisma Bridge + Supabase PostgreSQL (optional) ]
```

## Tech Stack

- Frontend: Static HTML/CSS/JavaScript (`mushin-frontend/`)
- Backend API: Python (`backend/api_server.py`)
- Storage: Supabase PostgreSQL via Prisma bridge (`backend/prisma_bridge.js`) when configured
- Runtime: Node.js + Python 3

## Suggested Project Structure

```text
/app
  /dashboard
  /focus
  /workspace/[id]
  /analytics

/components
  /focus
  /workspace
  /ui
```

## API Endpoints (Planned)

- `POST /api/sessions/start`
- `POST /api/sessions/end`
- `PATCH /api/sessions/:id/pause`
- `GET /api/sessions/history`
- `POST /api/ai/assist`
- `GET /api/workspaces`
- `POST /api/workspaces`
- `PATCH /api/workspaces/:id`
- `POST /api/workspaces/:id/invite`

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

## 24-Hour Execution Plan

1. Foundation: setup, auth, base UI
2. Core: focus timer, focus mode UI, session persistence, editor
3. Intelligence + Collab: AI route, suggestion panel, realtime sync, presence
4. Polish: analytics, UX refinement, deployment

## Scope Guard (Do Not Build for MVP)

- Complex task manager
- Social feed features
- Chat-heavy UI
- Overloaded dashboards
- Custom auth outside Supabase

## Success Criteria

MVP is successful when:

- Users can log in and start focus sessions
- UI simplifies during focus
- Sessions are saved correctly
- Workspaces are editable
- AI provides passive suggestions
- Collaboration works with live sync + presence

## Vision

Mushin aims to become the operating system for deep work in the AI era.

**One-line summary:**

> Enter focus. AI works quietly in the background. Team stays in sync. Nothing breaks your flow.

## Local Demo (Current Workspace)

This repository currently contains:

- a Python backend API in `backend/api_server.py`
- a static frontend in `mushin-frontend/`

### Run Backend

From the project root:

```bash
cd backend
python3 api_server.py
```

The backend will run at `http://127.0.0.1:8000`.

If your frontend runs on another local/private IP (for example `http://10.x.x.x:3000`), CORS is allowed by default for private/loopback IP hosts on ports `3000` and `5500`.
You can override this with:

```bash
DEV_ALLOWED_ORIGIN_PORTS=3000,5500 python3 api_server.py
```

For explicit allow-list entries, set `ALLOWED_ORIGINS` (comma-separated full origins).

### Run Frontend

In a new terminal from the project root:

```bash
cd mushin-frontend
python3 -m http.server 5500
```

Then open: `http://127.0.0.1:5500`

The frontend now calls the backend endpoint `POST /api/analyze` directly and no longer uses preset/mock calculations in the browser.

### Supabase Storage Layer (Optional)

The backend now stores day analysis history in Supabase through Prisma ORM and reads the last 3 days automatically.

1. Create the table using [backend/supabase_schema.sql](backend/supabase_schema.sql).
2. Install Prisma dependencies and generate client:

```bash
npm install
cd backend
npx prisma generate
```

3. Set environment variables in [backend/.env](backend/.env):

```bash
DATABASE_URL="postgresql://..."  # Supabase pooled connection string
DIRECT_URL="postgresql://..."    # Supabase direct connection string (for migrations)
```

When enabled:

- `POST /api/analyze` fetches `previous_days` via Prisma from Supabase if request does not include it.
- The analyzed day is written back to Supabase for future state calculations.
