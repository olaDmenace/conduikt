-- Fix infinite recursion in team_members RLS policies.
--
-- The policies created in 20260424_teams_infrastructure.sql used subqueries
-- of the form:
--   team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE ...)
-- Selecting from team_members inside a team_members policy re-triggers the
-- same policy, producing:
--   ERROR 42P17: infinite recursion detected in policy for relation "team_members"
--
-- Fix: move the membership lookups into SECURITY DEFINER SQL functions so the
-- inner SELECT bypasses RLS. The policies then just call the function.

CREATE OR REPLACE FUNCTION public.auth_user_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.auth_user_manages_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin');
$$;

DROP POLICY IF EXISTS "members read own team rows" ON public.team_members;
DROP POLICY IF EXISTS "owners or admins can invite" ON public.team_members;
DROP POLICY IF EXISTS "owners or admins can update" ON public.team_members;
DROP POLICY IF EXISTS "owners or admins can remove" ON public.team_members;
DROP POLICY IF EXISTS "members read own teams" ON public.teams;

CREATE POLICY "members read own team rows" ON public.team_members
  FOR SELECT USING (team_id IN (SELECT public.auth_user_team_ids()));

CREATE POLICY "owners or admins can invite" ON public.team_members
  FOR INSERT WITH CHECK (team_id IN (SELECT public.auth_user_manages_team_ids()));

CREATE POLICY "owners or admins can update" ON public.team_members
  FOR UPDATE USING (team_id IN (SELECT public.auth_user_manages_team_ids()));

CREATE POLICY "owners or admins can remove" ON public.team_members
  FOR DELETE USING (team_id IN (SELECT public.auth_user_manages_team_ids()));

CREATE POLICY "members read own teams" ON public.teams
  FOR SELECT USING (id IN (SELECT public.auth_user_team_ids()));
