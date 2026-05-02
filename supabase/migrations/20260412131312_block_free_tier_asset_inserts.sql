-- Block free-tier users from inserting assets.
-- The project owner's plan is checked via the profiles table.

create or replace function public.is_paid_user(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select plan from public.profiles where id = uid),
    'free'
  ) <> 'free';
$$;

-- Drop existing insert policy if any, then create gated one
drop policy if exists "Users can insert assets for own projects" on public.assets;
create policy "Users can insert assets for own projects"
  on public.assets
  for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = assets.project_id
        and projects.user_id = auth.uid()
    )
    and public.is_paid_user(auth.uid())
  );
