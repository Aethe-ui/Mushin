-- Run this in Supabase SQL editor
create table if not exists public.daily_metrics (
    id bigint generated always as identity primary key,
    user_id text not null,
    entry_date date not null default current_date,
    focus_hours numeric not null,
    workout_minutes numeric not null,
    rest_hours numeric not null,
    score numeric not null,
    xp integer not null,
    state text not null,
    explanation text not null,
    created_at timestamptz not null default now()
);

create unique index if not exists daily_metrics_user_date_key
    on public.daily_metrics (user_id, entry_date);

create index if not exists daily_metrics_user_date_idx
    on public.daily_metrics (user_id, entry_date desc);
