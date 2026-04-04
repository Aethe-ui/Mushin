# Mushin

**Hacksagon 2026** · *The focus operating system for the AI era*

Mushin helps people protect deep work: timed focus sessions, quiet AI assistance, shared workspaces, and signals for burnout and performance—without the noise of traditional “always-on” productivity tools.

**Scope of this repo folder:** Everything you need to run Mushin lives under **`web/`**. There is **no Python service** and **no separate static frontend** in this submission—the app is a single **Next.js** project with UI and backend logic in one place.

---

## Why Mushin?

Modern work fragments attention: notifications, context switching, and collaboration that interrupts flow. Mushin treats **focus as the product**: a calmer surface during focus, passive AI suggestions instead of pop-up chat, and realtime sync that stays in the background.

**One line:** Enter focus; AI works quietly; your team stays aligned—without breaking your flow.

---

## What we built (this submission)

| Area | What you’ll find in the app |
|------|----------------------------|
| **Focus** | Timer-based deep work (`/focus`), session lifecycle (start / pause / complete), minimal UI while in focus mode |
| **Dashboard** | Workspaces, recent sessions, quick launch into focus (`/dashboard`) |
| **Workspace** | Collaborative editing surface per workspace (`/workspace/[id]`) |
| **Silent AI** | Server-side assist using workspace context + session goal (`/api/ai/assist`) |
| **Burnout insights** | Risk scoring, history, patterns, and suggestions (`/burnout`) |
| **Performance** | Training / rest logging and analytics (`/performance`) |
| **Employer** | Org overview, invitations, per-employee views (`/employer`, related APIs) |
| **Analytics** | Session-oriented views (`/analytics`) |

Authentication is handled with **Supabase** (email/password and OAuth callback support).

---

## Tech stack (this folder only)

| Layer | Technology |
|-------|------------|
| **App framework** | [Next.js 14](https://nextjs.org/) (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, `clsx` / `tailwind-merge` |
| **Data & auth** | [Supabase](https://supabase.com/) — PostgreSQL, Auth, Realtime (via `@supabase/ssr`, `@supabase/supabase-js`) |
| **Server APIs** | Next.js **Route Handlers** under `app/api/*` (no separate backend process) |
| **AI** | [OpenAI](https://platform.openai.com/) HTTP API (`openai` package), server-side only |
| **Email (optional)** | [Resend](https://resend.com/) for transactional mail |
| **Charts** | [Recharts](https://recharts.org/) |
| **Client state** | [Zustand](https://github.com/pmndrs/zustand) (e.g. focus session UI) |

**Not used here:** Python scripts, Prisma bridge, or a standalone `http.server` frontend elsewhere in the monorepo—those are out of scope for this deployment.

---

## Architecture

All runtime behavior for this submission is **Next.js in `web/`**: pages and layouts render the UI; **route handlers** implement REST-style JSON APIs, talk to Supabase with the server client (and service role where needed), and call OpenAI or Resend from the server.

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│              React (RSC + client components)                 │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js (this `web/` app)                  │
│  • App Router: `app/**` pages & layouts                      │
│  • Route handlers: `app/api/**/route.ts`                   │
│  • Middleware: auth/session (Supabase)                      │
└─────┬───────────────────┬───────────────────┬─────────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐
│   Supabase   │   │   OpenAI     │   │   Resend (optional)  │
│ Auth + DB +  │   │   API        │   │   transactional mail │
│ Realtime     │   │              │   │                      │
└──────────────┘   └──────────────┘   └──────────────────────┘
```

**Data flow (typical):** The browser calls `/api/...` on the same origin. Handlers validate the Supabase session, read or write Postgres through Supabase, and return JSON. Sensitive keys (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) never ship to the client.

---

## Quick start

### Prerequisites

- Node.js 18+  
- A Supabase project  
- OpenAI API key (for AI assist)  
- Optional: Resend API key (for email)

### Install and run

```bash
cd web
npm install
cp .env.example .env.local
# Edit .env.local — see table below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (root redirects to `/dashboard`).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

---

## Environment variables

Create **`web/.env.local`** (start from `.env.example`).

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Many server routes | Server-side Supabase access (secret) |
| `OPENAI_API_KEY` | For AI | OpenAI API |
| `NEXT_PUBLIC_SITE_URL` | Production recommended | Public origin for OAuth redirects |
| `RESEND_API_KEY` | Optional | Email sending |
| `RESEND_FROM` | Optional | From address (defaults in code) |

---

## Project layout (high level)

```text
web/
  app/
    (shell)/          # Authenticated shell: dashboard, workspace, burnout, employer, …
    auth/             # Login, signup, OAuth callback
    api/              # Route handlers only — sessions, workspaces, AI, burnout, employer, performance, …
    focus/            # Full-screen focus experience
  components/         # UI by feature
  lib/                # Supabase clients, OpenAI, email, auth helpers
  store/              # Client state (e.g. focus)
  middleware.ts       # Session / route protection
```

---

## Deploying (demo day)

1. Deploy the **`web`** directory as a Next.js app (e.g. [Vercel](https://vercel.com/)).  
2. Configure the same environment variables in the host.  
3. In Supabase → Authentication → URL Configuration, add your production URL and redirect URLs.  
4. Set `NEXT_PUBLIC_SITE_URL` to your production origin.

---

## Team — Hacksagon 2026

**Project:** Mushin  
**Event:** Hacksagon 2026  

_Add your team name, members, and roles here._

---

## License

_Add your license if applicable; otherwise remove this section._
