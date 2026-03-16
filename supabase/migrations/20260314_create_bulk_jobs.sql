CREATE TABLE IF NOT EXISTS bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  total integer NOT NULL,
  completed integer DEFAULT 0,
  failed integer DEFAULT 0,
  status text DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE bulk_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_owns_bulk_jobs" ON bulk_jobs
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
