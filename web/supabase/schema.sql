-- Mushin schema (run in Supabase SQL Editor). Order: workspaces before sessions (FK).

create table if not exists workspaces (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id) on delete cascade not null,
  title      text not null default 'Untitled',
  content    text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete set null,
  start_time   timestamptz not null default now(),
  end_time     timestamptz,
  duration     integer,
  status       text check (status in ('active', 'paused', 'completed', 'abandoned')) not null default 'active',
  goal         text,
  planned_duration integer,
  created_at   timestamptz default now()
);

create table if not exists collaborators (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  role         text default 'editor',
  joined_at    timestamptz default now(),
  unique(workspace_id, user_id)
);

create table if not exists presence (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  last_seen    timestamptz default now(),
  unique(workspace_id, user_id)
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_workspace_id_idx on sessions(workspace_id);
create index if not exists workspaces_owner_id_idx on workspaces(owner_id);
create index if not exists collaborators_workspace_id_idx on collaborators(workspace_id);
create index if not exists collaborators_user_id_idx on collaborators(user_id);
create index if not exists presence_workspace_id_idx on presence(workspace_id);
create index if not exists presence_last_seen_idx on presence(last_seen);

alter table sessions enable row level security;
alter table workspaces enable row level security;
alter table collaborators enable row level security;
alter table presence enable row level security;

-- RLS-safe membership checks: direct policy subqueries on workspaces <-> collaborators
-- recurse (each table's RLS re-checks the other). SECURITY DEFINER reads bypass RLS.
create or replace function public.is_workspace_owner(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspaces w
    where w.id = p_workspace_id and w.owner_id = p_user_id
  );
$$;

create or replace function public.is_workspace_collaborator(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from collaborators c
    where c.workspace_id = p_workspace_id and c.user_id = p_user_id
  );
$$;

revoke all on function public.is_workspace_owner(uuid, uuid) from public;
grant execute on function public.is_workspace_owner(uuid, uuid) to authenticated, service_role;

revoke all on function public.is_workspace_collaborator(uuid, uuid) from public;
grant execute on function public.is_workspace_collaborator(uuid, uuid) to authenticated, service_role;

drop policy if exists "Users manage own sessions" on sessions;
create policy "Users manage own sessions" on sessions
  for all using (auth.uid() = user_id);

drop policy if exists "Owner full access to workspaces" on workspaces;
create policy "Owner full access to workspaces" on workspaces
  for all using (auth.uid() = owner_id);

drop policy if exists "Collaborators can read workspaces" on workspaces;
create policy "Collaborators can read workspaces" on workspaces
  for select using (is_workspace_collaborator(id, auth.uid()));

drop policy if exists "Collaborators can update workspace content" on workspaces;
create policy "Collaborators can update workspace content" on workspaces
  for update using (is_workspace_collaborator(id, auth.uid()));

drop policy if exists "Owner manages collaborators" on collaborators;
create policy "Owner manages collaborators" on collaborators
  for all using (is_workspace_owner(workspace_id, auth.uid()));

drop policy if exists "Collaborators read own membership" on collaborators;
create policy "Collaborators read own membership" on collaborators
  for select using (auth.uid() = user_id);

drop policy if exists "Workspace members manage presence" on presence;
create policy "Workspace members manage presence" on presence
  for all using (
    auth.uid() = user_id
    or is_workspace_owner(workspace_id, auth.uid())
    or is_workspace_collaborator(workspace_id, auth.uid())
  );

-- Realtime: enable for workspaces and presence in Dashboard → Database → Replication

/*
── Performance tables (run in Supabase SQL Editor) ─────────────────────────────

create table if not exists workout_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  logged_date  date not null,
  duration_min integer not null default 0,
  intensity    text check (intensity in ('low','medium','high')) default 'medium',
  created_at   timestamptz default now(),
  unique(user_id, logged_date)
);

create table if not exists rest_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  logged_date  date not null,
  hours        numeric(4,1) not null,
  created_at   timestamptz default now(),
  unique(user_id, logged_date)
);

create table if not exists performance_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade not null,
  snapshot_date      date not null,
  focus_score        numeric(5,2) default 0,
  fitness_score      numeric(5,2) default 0,
  balance_multiplier numeric(4,3) default 1.0,
  performance_score  numeric(5,2) default 0,
  burnout_state      text check (burnout_state in ('NORMAL','STRAIN','BURNOUT'))
                     default 'NORMAL',
  xp_earned          integer default 0,
  explanation        text,
  created_at         timestamptz default now(),
  unique(user_id, snapshot_date)
);

create table if not exists user_xp (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  total_xp   integer not null default 0,
  level      integer not null default 1,
  updated_at timestamptz default now()
);

alter table workout_logs          enable row level security;
alter table rest_logs             enable row level security;
alter table performance_snapshots enable row level security;
alter table user_xp               enable row level security;

create policy "Users manage own workout_logs"
  on workout_logs for all using (auth.uid() = user_id);

create policy "Users manage own rest_logs"
  on rest_logs for all using (auth.uid() = user_id);

create policy "Users manage own performance_snapshots"
  on performance_snapshots for all using (auth.uid() = user_id);

create policy "Users manage own xp"
  on user_xp for all using (auth.uid() = user_id);

create index if not exists workout_logs_user_date
  on workout_logs(user_id, logged_date);
create index if not exists rest_logs_user_date
  on rest_logs(user_id, logged_date);
create index if not exists perf_snapshots_user_date
  on performance_snapshots(user_id, snapshot_date);
*/
CREATE TABLE IF NOT EXISTS public.burnout_risk_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_date        date NOT NULL,

  -- The headline number (0–100)
  risk_score        numeric(5,2) NOT NULL DEFAULT 0
                    CHECK (risk_score >= 0 AND risk_score <= 100),

  -- Sub-component scores (0–100 each)
  workload_score    numeric(5,2) NOT NULL DEFAULT 0,
  recovery_score    numeric(5,2) NOT NULL DEFAULT 0,
  consistency_score numeric(5,2) NOT NULL DEFAULT 0,

  -- Risk level derived from risk_score thresholds
  risk_level        text NOT NULL DEFAULT 'LOW'
                    CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),

  -- Human-readable explanation
  explanation       text,

  -- Behavioral suggestions (JSON array of strings)
  suggestions       jsonb DEFAULT '[]'::jsonb,

  -- XP penalty multiplier applied for this day (0.0 – 1.0)
  xp_penalty_mult   numeric(4,3) NOT NULL DEFAULT 1.0
                    CHECK (xp_penalty_mult >= 0 AND xp_penalty_mult <= 1),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, score_date)
);

ALTER TABLE public.burnout_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own burnout_risk_scores"
  ON public.burnout_risk_scores FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS brs_user_date_idx
  ON public.burnout_risk_scores (user_id, score_date DESC);

-- ─────────────────────────────────────────────────────────────
-- Burnout Risk Events  (audit log of escalations / de-escalations)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.burnout_risk_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date    date NOT NULL DEFAULT CURRENT_DATE,
  from_level    text NOT NULL,
  to_level      text NOT NULL,
  trigger_facts jsonb DEFAULT '[]'::jsonb,  -- array of strings explaining WHY
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.burnout_risk_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own burnout_risk_events"
  ON public.burnout_risk_events FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS bre_user_date_idx
  ON public.burnout_risk_events (user_id, event_date DESC);

-- ─────────────────────────────────────────────────────────────
-- Employer / organizations (Employer Dashboard)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin', 'manager', 'member')),
  display_name text,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.employer_alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type   text NOT NULL CHECK (alert_type IN ('WARNING', 'CRITICAL')),
  risk_level   text NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  message      text NOT NULL,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accountability_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date    date NOT NULL DEFAULT CURRENT_DATE,
  event_type  text NOT NULL,
  description text NOT NULL,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_members_org_idx ON public.org_members (org_id);
CREATE INDEX IF NOT EXISTS org_members_user_idx ON public.org_members (user_id);
CREATE INDEX IF NOT EXISTS alerts_org_user_idx ON public.employer_alerts (org_id, user_id);
CREATE INDEX IF NOT EXISTS alerts_status_idx ON public.employer_alerts (status);
CREATE INDEX IF NOT EXISTS acct_log_org_user_idx ON public.accountability_logs (org_id, user_id);
CREATE INDEX IF NOT EXISTS acct_log_date_idx ON public.accountability_logs (log_date DESC);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

CREATE POLICY "org_members_read_org" ON public.organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "admin_read_members" ON public.org_members
  FOR SELECT USING (is_org_admin(org_id) OR user_id = auth.uid());

CREATE POLICY "admin_manage_members" ON public.org_members
  FOR ALL USING (is_org_admin(org_id));

CREATE POLICY "admin_manage_alerts" ON public.employer_alerts
  FOR ALL USING (is_org_admin(org_id));

CREATE POLICY "member_read_own_alerts" ON public.employer_alerts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "member_insert_own_employer_alert" ON public.employer_alerts
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_org_member(org_id));

CREATE POLICY "member_update_own_active_employer_alert" ON public.employer_alerts
  FOR UPDATE USING (user_id = auth.uid() AND is_org_member(org_id));

CREATE POLICY "admin_read_logs" ON public.accountability_logs
  FOR ALL USING (is_org_admin(org_id));

CREATE POLICY "member_read_own_logs" ON public.accountability_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "member_insert_own_accountability" ON public.accountability_logs
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_org_member(org_id));

-- ─────────────────────────────────────────────────────────────
-- Org invitations & organization owner (Employer invites)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "org_members_read_org" ON public.organizations;
CREATE POLICY "members_read_own_org" ON public.organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "admin_update_org" ON public.organizations
  FOR UPDATE USING (is_org_admin(id));

CREATE POLICY "auth_create_org" ON public.organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

CREATE POLICY "org_owner_insert_self" ON public.org_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND role = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id AND o.owner_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.org_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text NOT NULL DEFAULT 'member'
                CHECK (role IN ('manager', 'member')),
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  token         uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at    timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  responded_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

CREATE INDEX IF NOT EXISTS inv_org_idx   ON public.org_invitations (org_id);
CREATE INDEX IF NOT EXISTS inv_email_idx ON public.org_invitations (email);
CREATE INDEX IF NOT EXISTS inv_token_idx ON public.org_invitations (token);
CREATE INDEX IF NOT EXISTS inv_status_idx ON public.org_invitations (status);

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_invitations" ON public.org_invitations
  FOR ALL USING (is_org_admin(org_id));

CREATE OR REPLACE FUNCTION public.on_org_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.org_members (org_id, user_id, role, display_name)
    VALUES (NEW.id, NEW.owner_id, 'admin', NULL)
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_created ON public.organizations;
CREATE TRIGGER trg_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.on_org_created();