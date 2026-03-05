-- Phase 3 Tier 1 migrations

-- 1. post_metrics table for social engagement tracking
create table if not exists post_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  scheduled_post_id uuid references scheduled_posts(id) on delete cascade,
  channel text not null,
  external_post_id text not null,
  impressions integer default 0,
  likes integer default 0,
  shares integer default 0,
  comments integer default 0,
  clicks integer default 0,
  synced_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table post_metrics enable row level security;

create policy "project_owner_metrics" on post_metrics
  for all using (
    project_id in (select id from projects where user_id = auth.uid())
  );

-- 2. onboarding_answers JSONB column on projects
alter table projects add column if not exists onboarding_answers jsonb;
