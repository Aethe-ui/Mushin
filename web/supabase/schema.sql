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

drop policy if exists "Users manage own sessions" on sessions;
create policy "Users manage own sessions" on sessions
  for all using (auth.uid() = user_id);

drop policy if exists "Owner full access to workspaces" on workspaces;
create policy "Owner full access to workspaces" on workspaces
  for all using (auth.uid() = owner_id);

drop policy if exists "Collaborators can read workspaces" on workspaces;
create policy "Collaborators can read workspaces" on workspaces
  for select using (
    exists (
      select 1 from collaborators
      where workspace_id = workspaces.id and user_id = auth.uid()
    )
  );

drop policy if exists "Collaborators can update workspace content" on workspaces;
create policy "Collaborators can update workspace content" on workspaces
  for update using (
    exists (
      select 1 from collaborators
      where workspace_id = workspaces.id and user_id = auth.uid()
    )
  );

drop policy if exists "Owner manages collaborators" on collaborators;
create policy "Owner manages collaborators" on collaborators
  for all using (
    exists (
      select 1 from workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

drop policy if exists "Collaborators read own membership" on collaborators;
create policy "Collaborators read own membership" on collaborators
  for select using (auth.uid() = user_id);

drop policy if exists "Workspace members manage presence" on presence;
create policy "Workspace members manage presence" on presence
  for all using (
    auth.uid() = user_id or
    exists (
      select 1 from workspaces where id = workspace_id and owner_id = auth.uid()
    ) or
    exists (
      select 1 from collaborators where workspace_id = presence.workspace_id and user_id = auth.uid()
    )
  );

-- Realtime: enable for workspaces and presence in Dashboard → Database → Replication
