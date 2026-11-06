-- Read-only ad performance, one row per ad per day (audit 2026-10-24 §5.6).
--
-- Filled by src/lib/integrations/meta-ads.ts (syncAdInsights) from the
-- Marketing API insights endpoint with scope ads_read only. Nothing in the
-- app creates or edits ads. The table is shaped so a later Google Ads sync
-- can write the same rows with platform = 'google'.
--
-- The summary helper (adInsightsSummaryForPrompt) reads this table so the
-- performance context can tell the writing agents which hooks earned clicks.

CREATE TABLE IF NOT EXISTS public.ad_insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta', 'google')),
  account_id     TEXT NOT NULL,
  campaign_id    TEXT,
  campaign_name  TEXT,
  adset_id       TEXT,
  ad_id          TEXT NOT NULL,
  ad_name        TEXT,
  date           DATE NOT NULL,
  spend          NUMERIC(14, 4) NOT NULL DEFAULT 0,
  impressions    INTEGER NOT NULL DEFAULT 0,
  clicks         INTEGER NOT NULL DEFAULT 0,
  ctr            NUMERIC(10, 6) NOT NULL DEFAULT 0,
  cpc            NUMERIC(14, 6) NOT NULL DEFAULT 0,
  conversions    INTEGER,
  roas           NUMERIC(14, 6),
  raw            JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ad_insights_project_platform_ad_date_unique
    UNIQUE (project_id, platform, ad_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ad_insights_project_date
  ON public.ad_insights(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_insights_project_campaign
  ON public.ad_insights(project_id, campaign_id);

ALTER TABLE public.ad_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_ad_insights" ON public.ad_insights;
CREATE POLICY "project_owner_ad_insights" ON public.ad_insights
  FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );
-- Rows are written by the Inngest sync with the service role only.

COMMENT ON TABLE public.ad_insights IS
  'Daily ad performance pulled read-only from Meta (and later Google). One row per ad per day; re-synced rows are upserted on (project_id, platform, ad_id, date).';
