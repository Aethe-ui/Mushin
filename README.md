# Mushin

**Hacksagon 2026 Submission**

> The Focus Operating System for the AI Era.

Mushin (from the Zen concept *mushin*, "no mind") is a productivity platform designed for one core purpose: **protect deep work**.

Instead of adding more notifications, tabs, and collaboration noise, Mushin gives users a calm workspace with:

- timed deep-work sessions,
- a silent AI assistant,
- passive collaboration,
- burnout and performance intelligence,
- and an employer visibility layer for team wellbeing.

---

## 1) Hackathon Context

- **Event:** Hacksagon 2026
- **Build type:** MVP prototype
- **Theme fit:** AI + productivity + wellbeing
- **Vision:** Focus is the most valuable resource. Protect it at all costs.

---

## 2) Problem We Are Solving

Modern knowledge work is broken by interruption loops:

- constant notifications,
- context switching across fragmented tools,
- overloaded interfaces,
- and collaboration patterns that hijack attention.

The result is shallow, reactive work instead of high-quality deep work.

Mushin is our answer: one focused operating surface where AI and collaboration support the user **without breaking flow**.

---

## 3) Product Philosophy (Non-Negotiables)

- **Minimal by default:** every UI element must justify itself.
- **Silent AI:** no chatbot spam, no modal interruptions.
- **Passive collaboration:** teammates are visible, not noisy.
- **Low cognitive overhead:** fewer decisions while in flow.
- **Flow protection first:** nothing should yank the user out of concentration.

---

## 4) Product Architecture (Concept)

Mushin is built as a three-layer experience:

1. **Deep Work Mode (P0)**
2. **Silent AI Assistant (P1)**
3. **Passive Collaboration (P1)**

Then extended with:

- **Burnout Risk Intelligence**
- **Performance Analytics**
- **Employer Team Dashboard**

---

## 5) Feature Breakdown

### 5.1 Deep Work Mode (Core)

Users launch timed focus sessions (25/50/custom), and the UI simplifies during active focus.

Session states:

| State | Meaning | UI behavior |
|---|---|---|
| `idle` | No active session | Full UI visible |
| `active` | Focus running | Minimal interface, timer emphasized |
| `break` | Between sessions | Soft transition UI |
| `complete` | Session finished | Summary and next action |

### 5.2 Silent AI Assistant

AI is contextual and non-intrusive:

- generates concise, actionable suggestions,
- uses workspace context and session goal,
- appears in passive side panels,
- never blocks workflow.

### 5.3 Passive Collaboration

Realtime collaboration without notification stress:

- shared workspaces,
- presence indicators,
- live content sync,
- no popups/sounds for teammate edits.

### 5.4 Distraction Control

During active sessions, non-essential UI is suppressed and the app emphasizes the primary workspace.

### 5.5 Burnout + Performance + Employer Layer

Mushin also tracks recovery and output quality:

- burnout scoring and trend/history,
- performance snapshots and analytics,
- organization/team views and alerts.

---

## 6) Actual Codebase Architecture (This Repo)

This repository currently runs as a **Next.js App Router application inside `web/`**.

### 6.1 High-level runtime

```text
Browser (React UI)
	-> Next.js App Router (pages + route handlers)
		-> Supabase (Auth + Postgres + Realtime)
		-> OpenAI API (AI assist)
		-> Resend (email invitations, optional)
```

### 6.2 Responsibility split

- **Client UI:** route segments in `web/app/*` and feature components in `web/components/*`
- **Server APIs:** `web/app/api/**/route.ts`
- **Domain logic/helpers:** `web/lib/*`
- **Client state:** Zustand stores in `web/store/*`
- **Database schema:** `web/supabase/schema.sql`

### 6.3 Pages and route groups

- `web/app/(shell)/dashboard`
- `web/app/(shell)/workspace`
- `web/app/(shell)/analytics`
- `web/app/(shell)/burnout`
- `web/app/(shell)/performance`
- `web/app/(shell)/employer`
- `web/app/focus`
- `web/app/auth/*`

---

## 7) Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | React 18 + TypeScript |
| Styling | Tailwind CSS | utility-first design system |
| State management | Zustand | lightweight global state |
| Auth + database | Supabase | Auth, Postgres, RLS, Realtime |
| AI layer | OpenAI API | `gpt-4o`, short suggestion responses |
| Email | Resend | invitation workflow |
| Visualization | Recharts | analytics and trend charts |
| Deployment target | Vercel-compatible | standard Next.js pipeline |

---

## 8) API Surface (Implemented Route Handlers)

### Sessions

- `POST /api/sessions/start`
- `POST /api/sessions/end`
- `PATCH /api/sessions/[id]/pause`
- `GET /api/sessions/history`

### AI

- `POST /api/ai/assist`

### Workspaces

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/[id]`
- `PATCH /api/workspaces/[id]`
- `POST /api/workspaces/[id]/invite`

### Burnout

- `GET /api/burnout/today`
- `GET /api/burnout/history`
- `POST /api/burnout/compute`

### Performance

- `GET /api/performance`
- `GET /api/performance/analytics`
- `POST /api/performance/snapshot`
- `POST /api/performance/log/workout`
- `POST /api/performance/log/rest`

### Employer

- `GET /api/employer/check-role`
- `GET /api/employer/organizations`
- `POST /api/employer/organizations`
- `GET /api/employer/overview`
- `GET /api/employer/alerts`
- `PATCH /api/employer/alerts`
- `GET /api/employer/accountability`
- `GET /api/employer/employee/[userId]`
- `GET /api/employer/invitations`
- `POST /api/employer/invitations`
- `GET /api/employer/invitations/[token]`
- `PATCH /api/employer/invitations/[token]`
- `POST /api/employer/invitations/[token]/resend`

### Health

- `GET /api/health`

---

## 9) AI Design Contract

Mushin AI behavior is intentionally constrained for focus safety:

- one concise actionable output,
- no greetings,
- no explanation fluff,
- no interruptive behavior.

Current server prompt style:

```text
You are a silent productivity assistant. The user is in a deep focus session.
Your job: provide ONE short, actionable suggestion (max 2 sentences).
Do not greet. Do not explain yourself. Do not ask questions.
Be direct, specific, and immediately useful.
```

Model + parameters:

- `model: gpt-4o`
- `max_tokens: 150`
- `temperature: 0.4`

---

## 10) Data Model (Supabase/PostgreSQL)

Core collaboration/focus tables:

- `workspaces`
- `sessions`
- `collaborators`
- `presence`

Wellbeing/performance tables:

- `workout_logs`
- `rest_logs`
- `performance_snapshots`
- `user_xp`
- `burnout_risk_scores`
- `burnout_risk_events`

Employer/org tables:

- `organizations`
- `org_members`
- `employer_alerts`
- `accountability_logs`

Security posture:

- RLS enabled across core tables.
- Membership checks implemented with security-definer helper functions.
- Policies enforce owner/member boundaries for workspace and org operations.

---

## 11) Local Development

### Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm
- Supabase project
- OpenAI API key

### Run locally

```bash
cd web
npm install
cp env.example .env.local
# set env values in .env.local
npm run dev
```

Open: `http://localhost:3000`

### Build + start

```bash
cd web
npm run build
npm run start
```

---

## 12) Environment Variables

Required in `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

Optional/recommended:

```env
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
RESEND_API_KEY=re_...
RESEND_FROM=Mushin <onboarding@resend.dev>
```

---

## 13) Database Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `web/supabase/schema.sql`.
4. Verify RLS policies are active.
5. Enable replication/realtime for relevant tables if needed for collaboration features.

---

## 14) Deployment

Recommended path:

1. Deploy `web/` as a Next.js app on Vercel.
2. Add all environment variables in project settings.
3. Configure Supabase auth redirect URLs to include your deployed domain.
4. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin.

---

## 15) 24-Hour MVP Build Plan (from concept)

### Phase 1 (0-6h): Foundation

- Auth
- DB + RLS
- app shell

### Phase 2 (6-14h): Core Focus Experience

- focus timer
- session persistence
- distraction control
- workspace editing

### Phase 3 (14-20h): Intelligence + Collaboration

- realtime sync + presence
- AI route integration
- passive suggestion UI

### Phase 4 (20-24h): Polish

- analytics
- loading/error UX
- final deploy + smoke test

---

## 16) Success Criteria

Mushin MVP is considered successful when users can:

- authenticate,
- start and complete timed focus sessions,
- work in distraction-minimized mode,
- save sessions and workspace content,
- receive silent AI assistance,
- collaborate passively in shared workspaces,
- and access a live deployed build.

---

## 17) Out of Scope (Intentional)

To protect hackathon velocity, we intentionally avoided:

- overbuilt rich-text systems,
- complex task/kanban modules,
- intrusive notification centers,
- social-feed style features,
- non-essential enterprise overhead.

---

## 18) Post-Hackathon Roadmap

- OS-level distraction blocking
- biometric focus detection
- autonomous AI background tasking
- richer focus analytics and team culture metrics
- stronger organizational wellbeing insights

---

## 19) Team and Credits

**Submission:** Mushin for Hacksagon 2026

Add team member names, roles, and demo video link here.
