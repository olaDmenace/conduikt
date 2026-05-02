-- Note: this supersedes the earlier 20260314_create_notifications.sql, which
-- created an older variant of the table without `message`/`data` columns.
-- The 20260314 file is kept in source as a no-op (CREATE IF NOT EXISTS) but
-- this is the canonical schema used in production.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_unread
  on public.notifications (user_id, read)
  where read = false;

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- Service role can insert (from Inngest/server functions)
create policy "Service can insert notifications"
  on public.notifications for insert
  with check (true);
