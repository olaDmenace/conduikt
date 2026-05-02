-- Enforce project count limits per plan tier.
-- Runs as a BEFORE INSERT trigger on the projects table.

create or replace function public.enforce_project_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  user_plan text;
  project_count int;
  plan_limit int;
begin
  -- Get the user's plan
  select coalesce(plan, 'free') into user_plan
  from public.profiles
  where id = new.user_id;

  -- Map plan to limit
  plan_limit := case user_plan
    when 'agency' then null  -- unlimited
    when 'growth' then 15
    when 'pro'    then 5
    else 1  -- free
  end;

  -- Skip check for unlimited plans
  if plan_limit is null then
    return new;
  end if;

  -- Count existing projects
  select count(*) into project_count
  from public.projects
  where user_id = new.user_id;

  if project_count >= plan_limit then
    raise exception 'Project limit reached (% on % plan). Upgrade to create more projects.', plan_limit, user_plan;
  end if;

  return new;
end;
$$;

-- Attach trigger
drop trigger if exists trg_enforce_project_limit on public.projects;
create trigger trg_enforce_project_limit
  before insert on public.projects
  for each row
  execute function public.enforce_project_limit();
