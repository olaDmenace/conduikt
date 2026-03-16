CREATE TABLE IF NOT EXISTS competitor_trackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  competitor_url text NOT NULL,
  competitor_name text,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE competitor_trackers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "project_owner_trackers" ON competitor_trackers
    FOR ALL USING (
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid REFERENCES competitor_trackers(id) ON DELETE CASCADE,
  keyword_overlap integer,
  content_gaps text[],
  estimated_da integer,
  top_keywords text[],
  snapshot_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "project_owner_snapshots" ON competitor_snapshots
    FOR ALL USING (
      tracker_id IN (
        SELECT id FROM competitor_trackers
        WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
