-- This migration was applied directly via Supabase Studio SQL editor and
-- isn't recorded in supabase_migrations.schema_migrations. The source file
-- is kept here so `supabase db reset` reproduces the function locally.
-- DDL uses CREATE OR REPLACE so re-application is safe.

create or replace function increment_generation_count(user_id_param uuid)
returns void
language sql
security definer
set search_path to ''
as $$
  update public.profiles
  set generation_count = generation_count + 1
  where id = user_id_param;
$$;
