-- post_learnings: structured findings produced by the analyzer agent from
-- post_metrics. Each row is one hypothesis about what's working on a channel,
-- with the evidence (sample size + before/after metric) attached so we can
-- show it in the dashboard and inject it into the generator's system prompt.
--
-- pattern_key groups related findings; a re-run of the analyzer that produces
-- a new finding for the same pattern_key marks the old one inactive.

create table if not exists post_learnings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  channel text not null check (channel in ('x', 'linkedin', 'facebook', 'email')),
  pattern_key text not null,
  hypothesis text not null,
  evidence jsonb not null default '{}'::jsonb,
  confidence numeric(3,2) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  active boolean not null default true,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists post_learnings_active_idx
  on post_learnings (project_id, channel, active)
  where active;

create index if not exists post_learnings_pattern_idx
  on post_learnings (project_id, channel, pattern_key);

alter table post_learnings enable row level security;

create policy "project_owner_learnings" on post_learnings
  for all using (
    project_id in (select id from projects where user_id = auth.uid())
  );

-- Service-role bypass for the analyzer cron and manual runner script.
create policy "service_role_learnings" on post_learnings
  for all to service_role using (true) with check (true);
