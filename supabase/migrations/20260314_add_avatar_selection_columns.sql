-- Add avatar selection columns to video_jobs
ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS avatar_mode text DEFAULT 'random'
    CHECK (avatar_mode IN ('random', 'pick', 'brand-matched')),
  ADD COLUMN IF NOT EXISTS selected_avatar_id text,
  ADD COLUMN IF NOT EXISTS avatar_gender text
    CHECK (avatar_gender IS NULL OR avatar_gender IN ('male', 'female'));
