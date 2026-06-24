-- Public storage bucket for the X playbook's video clips.
-- The clip uploader puts MP4s here; the X publish cron fetches the URL when
-- attaching media to a tweet. Public read so X's media-upload endpoint can
-- pull the bytes without auth.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media-clips',
  'social-media-clips',
  true,
  52428800,  -- 50 MB per file (X's video limit is 512 MB but we'll keep clips short)
  ARRAY['video/mp4', 'video/webm', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS — public read; writes only via service role (which bypasses RLS anyway).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'social_media_clips_public_read'
  ) THEN
    CREATE POLICY social_media_clips_public_read ON storage.objects
      FOR SELECT
      USING (bucket_id = 'social-media-clips');
  END IF;
END $$;
