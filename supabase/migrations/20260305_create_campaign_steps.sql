CREATE TABLE IF NOT EXISTS campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','skipped')),
  result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage campaign steps via project" ON campaign_steps
  FOR ALL USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN projects p ON c.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
