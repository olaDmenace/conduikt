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
