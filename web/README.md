# Mushin

**Hacksagon 2026** · *The focus operating system for the AI era*

Mushin helps people protect deep work: timed focus sessions, quiet AI assistance, shared workspaces, and signals for burnout and performance—without the noise of traditional “always-on” productivity tools.

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
| **Silent AI** | Server-side assist endpoint that uses workspace context + session goal (`/api/ai/assist`) |
| **Burnout insights** | Risk scoring, history, patterns, and suggestions (`/burnout`) |
| **Performance** | Training / rest logging and analytics (`/performance`) |
| **Employer view** | Overview and per-employee views for org roles (`/employer`) |
| **Analytics** | Session and productivity-oriented views (`/analytics`) |

Authentication is handled with **Supabase** (email/password and OAuth callback support).

---

## Tech stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router), React 18, TypeScript  
- **UI:** Tailwind CSS, Radix primitives, Framer Motion, Recharts  
- **Data & auth:** [Supabase](https://supabase.com/) (`@supabase/ssr`, `@supabase/supabase-js`)  
- **AI:** [OpenAI](https://platform.openai.com/) API (e.g. `gpt-4o` for assist)  
- **State:** Zustand (focus session UI state)

---

## Quick start

### Prerequisites

- Node.js 18+  
- A [Supabase](https://supabase.com/) project (URL + anon key; service role where server routes require it)  
- An OpenAI API key (for AI assist and related server features)

### Install and run

```bash
cd web
npm install
cp .env.example .env.local
# Edit .env.local with your keys (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app redirects to `/dashboard` after load.

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

---

## Environment variables

Create **`web/.env.local`** (see `.env.example` for a template).

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | For some APIs | Server-side Supabase access (keep secret; never expose to the client) |
| `OPENAI_API_KEY` | For AI features | OpenAI API key for `/api/ai/assist` and related logic |
| `NEXT_PUBLIC_SITE_URL` | Production recommended | Public site URL for OAuth redirects (e.g. `https://your-app.vercel.app`) |

Supabase dashboard: [Project Settings → API](https://supabase.com/dashboard/project/_/settings/api).

---

## Project layout (high level)

```text
web/
  app/
    (shell)/          # Logged-in layout: dashboard, workspace, burnout, etc.
    auth/             # Login, signup, OAuth callback
    api/              # Route handlers (sessions, workspaces, AI, burnout, employer, …)
    focus/            # Full-screen focus experience
  components/         # UI, focus, dashboard, burnout, …
  lib/                # Supabase clients, OpenAI helper, auth utilities
  store/              # Client state (e.g. focus)
```

---

## Deploying (demo day)

1. Push the `web` app to [Vercel](https://vercel.com/) (or your host of choice).  
2. Set the same environment variables in the host’s dashboard.  
3. In Supabase, add your production URL to **Authentication → URL Configuration** (redirect URLs / site URL).  
4. Set `NEXT_PUBLIC_SITE_URL` to your production origin so auth redirects stay correct.

---

## Team — Hacksagon 2026

**Project:** Mushin  
**Event:** Hacksagon 2026  

_Add your team name, members, and roles here._

---

## License

_Add your license if applicable; otherwise remove this section._

---

Built with intention for **Hacksagon 2026**. If Mushin resonates with you, we’d love your feedback after the demos.
