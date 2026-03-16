-- Add video_type column with CHECK constraint to video_jobs
-- The existing 'style' column stores free text; we add a dedicated video_type
-- column with a constraint to enforce valid values.
ALTER TABLE video_jobs
ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'presenter'
CHECK (video_type IN ('presenter', 'cinematic', 'ugc'));

-- Backfill existing rows from the style column
UPDATE video_jobs SET video_type = style
WHERE style IN ('presenter', 'cinematic')
AND video_type IS DISTINCT FROM style;

-- Confirm RLS is still active
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
