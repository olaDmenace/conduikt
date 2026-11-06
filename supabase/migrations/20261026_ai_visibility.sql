-- Found-by-AI monitor (audit 2026-10-24 §5.9 item 4).
--
-- Each row is one question put to one answer engine on one day, and whether
-- the project's business was named or cited in the answer. Filled by
-- src/lib/integrations/ai-visibility.ts (checkVisibility) from the
-- found-by-ai Inngest job. Read by the Analytics card and by
-- visibilitySummaryForPrompt so Missing Pages can target the questions the
-- business lost.

CREATE TABLE IF NOT EXISTS public.ai_visibility_checks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  engine                TEXT NOT NULL CHECK (engine IN ('perplexity', 'openai', 'gemini', 'claude')),
  question              TEXT NOT NULL,
  asked_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mentioned             BOOLEAN NOT NULL DEFAULT false,
  cited                 BOOLEAN NOT NULL DEFAULT false,
  -- 1-based position of our domain among the answer's citations, when cited.
  position              INTEGER,
  competitors_mentioned TEXT[] NOT NULL DEFAULT '{}',
  answer_excerpt        TEXT,
  raw                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_visibility_checks_project_time
  ON public.ai_visibility_checks(project_id, asked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_visibility_checks_project_question
  ON public.ai_visibility_checks(project_id, question);

ALTER TABLE public.ai_visibility_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_ai_visibility_checks" ON public.ai_visibility_checks;
CREATE POLICY "project_owner_ai_visibility_checks" ON public.ai_visibility_checks
  FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );
-- Rows are written by the Inngest job with the service role only.

COMMENT ON TABLE public.ai_visibility_checks IS
  'One row per question per answer engine per run. mentioned = the business name or domain appears in the answer text; cited = the domain appears in the citations.';
