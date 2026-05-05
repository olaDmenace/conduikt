-- Create the storage buckets the upload route already references but
-- which were never provisioned. Without these, /api/upload returns
-- "bucket not found" for any non-post-media upload — most visibly the
-- brand-logo upload in /settings/brand.
--
-- Both buckets use the same shape as the existing `post-media` bucket
-- (created in 20260413073652): public-read, per-user folder for
-- writes/deletes, no anonymous writes. The path scheme is
-- `<user_id>/<rest-of-path>` so the (storage.foldername(name))[1]
-- check enforces "users can only touch their own folder".

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ------- logos -------

DROP POLICY IF EXISTS "logos_insert_own" ON storage.objects;
CREATE POLICY "logos_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "logos_update_own" ON storage.objects;
CREATE POLICY "logos_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "logos_read_public" ON storage.objects;
CREATE POLICY "logos_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_delete_own" ON storage.objects;
CREATE POLICY "logos_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------- brand-assets -------

DROP POLICY IF EXISTS "brand_assets_insert_own" ON storage.objects;
CREATE POLICY "brand_assets_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_update_own" ON storage.objects;
CREATE POLICY "brand_assets_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_read_public" ON storage.objects;
CREATE POLICY "brand_assets_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "brand_assets_delete_own" ON storage.objects;
CREATE POLICY "brand_assets_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
