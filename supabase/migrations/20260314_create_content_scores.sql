CREATE TABLE IF NOT EXISTS content_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  post_id uuid,
  content_type text NOT NULL,
  content_preview text,
  total_score integer NOT NULL,
  clarity integer NOT NULL,
  relevance integer NOT NULL,
  engagement_potential integer NOT NULL,
  brand_alignment integer NOT NULL,
  summary text,
  top_strength text,
  top_improvement text,
  scored_at timestamptz DEFAULT now()
);

ALTER TABLE content_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_owner_scores" ON content_scores
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
