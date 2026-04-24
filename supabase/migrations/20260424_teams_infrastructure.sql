-- Full team/invite infrastructure fix.
--
-- Before this migration, team_members had no team_id column even though the
-- API routes queried for it. No code path ever created owner rows either,
-- so every invite attempt returned 403 "Not authorized to invite members".
--
-- This migration:
--   1. Introduces a teams table (one team per owner_id)
--   2. Adds team_members.team_id + partial unique indexes
--   3. Backfills a team + owner membership for every existing profile
--   4. Replaces RLS policies with team-scoped rules
--   5. Extends handle_new_user to provision a team + owner membership on signup
--      and auto-accept pending invites sent to the new user's email.

CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'My Workspace',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

INSERT INTO public.teams (owner_id, name)
SELECT p.id, COALESCE(NULLIF(p.full_name, ''), 'My Workspace') || '''s Workspace'
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.owner_id = p.id);

INSERT INTO public.team_members (team_id, user_id, invited_by, role, status)
SELECT t.id, t.owner_id, t.owner_id, 'owner', 'active'
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.team_id = t.id AND tm.user_id = t.owner_id
);

ALTER TABLE public.team_members ALTER COLUMN team_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_team_members_team_user
  ON public.team_members(team_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_team_members_team_invite
  ON public.team_members(team_id, invite_email)
  WHERE invite_email IS NOT NULL;

DROP POLICY IF EXISTS "Users can view own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can invite team members" ON public.team_members;
DROP POLICY IF EXISTS "Inviters can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Inviters can remove team members" ON public.team_members;

CREATE POLICY "members read own team rows" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "owners or admins can invite" ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "owners or admins can update" ON public.team_members
  FOR UPDATE USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "owners or admins can remove" ON public.team_members
  FOR DELETE USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "members read own teams" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "owner updates team" ON public.teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _role TEXT := 'user';
  _admin_emails JSONB;
  _team_id UUID;
BEGIN
  SELECT value INTO _admin_emails FROM public.app_config WHERE key = 'admin_emails';

  IF _admin_emails IS NOT NULL AND _admin_emails ? NEW.email THEN
    _role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    _role
  );

  INSERT INTO public.teams (owner_id, name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      'My Workspace'
    ) || '''s Workspace'
  )
  RETURNING id INTO _team_id;

  INSERT INTO public.team_members (team_id, user_id, invited_by, role, status)
  VALUES (_team_id, NEW.id, NEW.id, 'owner', 'active');

  UPDATE public.team_members
     SET user_id = NEW.id, status = 'active'
   WHERE invite_email = NEW.email AND user_id IS NULL;

  RETURN NEW;
END;
$function$;
