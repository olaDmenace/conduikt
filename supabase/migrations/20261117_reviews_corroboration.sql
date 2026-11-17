-- Review requests and corroboration tasks (audit §5.4 #6, §5.9 #5).
--
-- review_requests: one row per customer asked for a review. Every
-- customer gets the same ask (Google forbids gating by sentiment), by
-- email through the shared transactional sender or by WhatsApp when the
-- contact opted in and the project has a WhatsApp connection. The row
-- records what was tried and how it went.
--
-- corroboration_tasks: the "get listed where answer engines look" list,
-- seeded once per project from the playbook (src/lib/corroboration/tasks.ts).
-- The owner ticks them off; the "mentioned?" check sets `mentioned` when
-- an answer engine cites that platform's domain for "<business> <city>".
--
-- Depends on 20261117_business_details_leads.sql (projects.review_url),
-- read defensively by the code so either order applies.

CREATE TABLE IF NOT EXISTS public.review_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES public.audience_contacts(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  channel     TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  status      TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  sent_at     TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_requests_project_idx
  ON public.review_requests (project_id, created_at DESC);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_review_requests" ON public.review_requests;
CREATE POLICY "project_owner_review_requests" ON public.review_requests
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.review_requests IS
  'One row per customer asked for a review. Sent by src/lib/reviews/send.ts; never gated by sentiment.';

CREATE TABLE IF NOT EXISTS public.corroboration_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- stable key from src/lib/corroboration/tasks.ts, e.g. 'google_business_profile'
  platform    TEXT NOT NULL,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'done', 'skipped')),
  -- null until the "mentioned?" check has run for this project
  mentioned   BOOLEAN,
  checked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, platform)
);

CREATE INDEX IF NOT EXISTS corroboration_tasks_project_idx
  ON public.corroboration_tasks (project_id, status);

ALTER TABLE public.corroboration_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_corroboration_tasks" ON public.corroboration_tasks;
CREATE POLICY "project_owner_corroboration_tasks" ON public.corroboration_tasks
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.corroboration_tasks IS
  'Listings a business should hold so answer engines can corroborate it. Seeded per playbook by POST /api/projects/[id]/corroboration/seed.';
