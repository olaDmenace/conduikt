alter table public.notifications
  add column if not exists action_url text,
  add column if not exists data jsonb default '{}';
