-- Lock down public.app_config. It stores internal key/value settings
-- and should never be readable or writable by anon / authenticated clients
-- directly — server code should go through the service role client.

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Admins (profiles.role = 'admin') may read and write via the dashboard.
-- Everyone else is denied by default (no other policies).
DROP POLICY IF EXISTS "Admins can read app_config" ON public.app_config;
CREATE POLICY "Admins can read app_config"
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can modify app_config" ON public.app_config;
CREATE POLICY "Admins can modify app_config"
  ON public.app_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
