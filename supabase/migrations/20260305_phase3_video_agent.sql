-- Video generation jobs
create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  brief text not null,
  style text not null default 'presenter',
  voice_id text,
  source_asset_id uuid references assets(id) on delete set null,
  script_data jsonb,
  provider text,
  provider_job_id text,
  status text not null default 'pending',
  progress_message text,
  error_message text,
  video_url text,
  thumbnail_url text,
  duration_seconds integer,
  credits_used integer default 10,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Reusable video clips (schema only for Phase 2)
create table if not exists video_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  scene_type text,
  visual_description text,
  clip_url text not null,
  provider text,
  duration_seconds integer,
  created_at timestamptz default now()
);

-- RLS
alter table video_jobs enable row level security;
alter table video_clips enable row level security;

create policy "video_jobs_owner" on video_jobs
  for all using (user_id = auth.uid());

create policy "video_clips_owner" on video_clips
  for all using (user_id = auth.uid());

-- Indexes
create index video_jobs_status_idx on video_jobs(user_id, status, created_at desc);
create index video_jobs_provider_idx on video_jobs(provider_job_id) where provider_job_id is not null;
