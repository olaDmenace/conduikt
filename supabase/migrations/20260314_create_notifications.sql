CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: user_owns_notifications (may already exist)
DO $$ BEGIN
  CREATE POLICY "user_owns_notifications" ON notifications
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
