# Mushin Web — Master Handoff Prompt (New Chat)

Paste this entire document into a new chat to restore full context and constraints.

---

## Product & stack

**Mushin** is a focus operating system: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (auth + DB), Recharts, Zustand. Workspace path: `web/` inside repo `mushin`.

---

## Design tokens (CSS variables)

Use only these for app UI (unless chart stroke exceptions already documented elsewhere):

- `--bg-primary`, `--bg-surface`, `--bg-elevated`
- `--border`, `--border-active`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--accent`, `--accent-hover`, `--accent-glow`
- `--focus-active`, `--focus-paused`, `--success`, `--danger`

**shadcn-compatible tokens** (for Hero + `shadcn-button`): `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--destructive`, `--destructive-foreground`, `--input`, `--ring`, `--accent-foreground`, `--background`, `--foreground` — defined in `app/globals.css` and wired in `tailwind.config.ts`.

**Sitewide background:** `body` uses fixed radial gradients built with `color-mix(in srgb, var(--accent) …)` over `--bg-primary` (`app/globals.css`).

---

## Auth & API rules

- Protected routes use `getSessionUser()` from `@/lib/auth`; unauthenticated → `401`.
- No `localStorage` for auth; use Supabase cookie session.
- Prefer `.maybeSingle()` when a row may not exist; `workout_logs` / `rest_logs` use **upsert** with `onConflict: user_id,logged_date`.
- Do **not** change scoring in `web/lib/performance.ts` (source of truth).

---

## Implemented features (prior sessions)

### Workspace reliability

- **`app/(shell)/dashboard/page.tsx`:** `wsError` for failed `GET /api/workspaces`; cleared on success; “+ New workspace” with spinner while creating.
- **`app/(shell)/workspace/[id]/page.tsx`:** Single `useEffect`: `getUser()` → fetch workspace (fixes `userId` race); errors: “Not authenticated”, “Could not load workspace”, “Network error loading workspace”; `setLoadError(null)` before successful fetch.
- **`app/api/health/route.ts`:** `GET` probes `workspaces` (server Supabase client); `{ db: "connected" }` or `503`.
- **`components/layout/MainNav.tsx`:** DB badge `● DB` / `✕ DB` from `/api/health`.

### Burnout / performance analytics

- **`app/api/performance/analytics/route.ts`:** Last **5** days; returns `logs`, `patterns`, `transitions`, `transitionMarkers`, `dateRange`.
- **`components/burnout/*`:** `BurnoutStateIndicator`, `BurnoutTrendChart`, `BurnoutTransitionTimeline`, `BurnoutPatternInsights`, `BurnoutAnalyticsDashboard` (fetch once, refresh after log + `POST /api/performance/snapshot`).
- **`app/(shell)/performance/page.tsx`:** Existing performance UI unchanged; new section **“Burnout Analytics — Last 5 Days”** with `BurnoutAnalyticsDashboard` after XP history.

### Hero + shadcn-style button (this session)

- **`components/ui/hero.tsx`:** Framer Motion hero with gradient/lamp visuals; props include optional **`showMarketingContent`** (default `true`). When `false`, only the background visuals render (used behind auth). `HeroProps` uses `Omit<…, "title">` so `title` is the visible heading, not the HTML `title` attribute.
- **`components/ui/shadcn-button.tsx`:** CVA + Radix `Slot` shadcn button (exported as **`ShadcnButton`**). **Not** named `button.tsx`: the repo already has **`components/ui/Button.tsx`** (Mushin `primary` | `ghost` | `danger`). On case-insensitive filesystems, `button.tsx` and `Button.tsx` collide — keep **one** `Button.tsx` for the app and **`shadcn-button.tsx`** for Hero CTAs.
- **`components/blocks/hero.tsx`:** Re-exports `Hero`, `HeroProps`, `HeroAction` from `@/components/ui/hero`.
- **`components/blocks/hero-demo.tsx`:** Demo matching the provided snippet (import path `@/components/blocks/hero`).
- **Dependencies:** `framer-motion`, `@radix-ui/react-slot`, `class-variance-authority`.
- **Auth backgrounds:** `app/auth/login/page.tsx` and `app/auth/signup/page.tsx` wrap content with fixed `Hero` (`showMarketingContent={false}`, `title=""`). Login/signup forms and Supabase flows are **unchanged**.

### Tailwind additions

- `backgroundImage.gradient-conic` for Hero conic masks.
- `ringOffsetColor.background` for shadcn focus ring offset.

---

## Default paths (shadcn alignment)

| Area | Path |
|------|------|
| Mushin app button | `components/ui/Button.tsx` |
| shadcn-style CTA button (Hero) | `components/ui/shadcn-button.tsx` |
| Hero implementation | `components/ui/hero.tsx` |
| Block re-export / demo | `components/blocks/hero.tsx`, `components/blocks/hero-demo.tsx` |
| Global styles | `app/globals.css` |
| Tailwind config | `tailwind.config.ts` |

**Why not `components/ui/button.tsx`:** Conflicts with existing `Button.tsx` on macOS/Windows default case-insensitive volumes; breaks webpack/TypeScript. Use `shadcn-button.tsx` or merge APIs into a single file intentionally (would touch every consumer).

**Fresh shadcn CLI setup (if starting from scratch):** `npx shadcn@latest init` in `web/`, ensure Tailwind + TypeScript are enabled, then `npx shadcn@latest add button`. This repo already has Tailwind + TS; only the Hero-specific pieces were added manually.

---

## Key files reference

| File | Role |
|------|------|
| `app/(shell)/performance/page.tsx` | Performance + burnout section |
| `app/api/performance/route.ts` | Performance summary |
| `app/api/performance/snapshot/route.ts` | Snapshot compute/save |
| `lib/performance.ts` | Scoring (do not break) |
| `types/performance.ts` | Performance types |
| `lib/supabase/client.ts` / `server.ts` | Supabase |
| `lib/auth.ts` | `getSessionUser()` |

---

## Home route

`app/page.tsx` still **`redirect("/dashboard")`** — no change to entry behavior.

---

## Optional next steps (not done unless asked)

- Render `HeroDemo` or full marketing Hero on a dedicated `/welcome` route.
- Replace duplicate auth `Hero` with a small `AuthHeroBackdrop` wrapper component.
- Audit `/api/health` vs RLS (anon read on `workspaces` may show `✕ DB` while logged-in queries work).

---

*End of handoff — Mushin web.*
