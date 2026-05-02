-- Brand kit fields on profiles (powers overlay text cards + future white-label surfaces)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#D4945A',
  ADD COLUMN IF NOT EXISTS brand_secondary_color text DEFAULT '#1A1A1A',
  ADD COLUMN IF NOT EXISTS brand_font text DEFAULT 'Outfit';

-- Public storage bucket for post media (stock/upload/overlay results)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder in post-media
DROP POLICY IF EXISTS "post_media_insert_own" ON storage.objects;
CREATE POLICY "post_media_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_media_read_public" ON storage.objects;
CREATE POLICY "post_media_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_delete_own" ON storage.objects;
CREATE POLICY "post_media_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
