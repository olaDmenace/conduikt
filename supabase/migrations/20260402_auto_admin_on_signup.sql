-- App config table for platform-level settings (survives data resets if included in migrations)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed admin emails — these users get role='admin' automatically on signup
INSERT INTO app_config (key, value)
VALUES ('admin_emails', '["oladmenace@gmail.com"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Update the profile creation trigger to auto-assign admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _role TEXT := 'user';
  _admin_emails JSONB;
BEGIN
  -- Check if this email is in the admin_emails config
  SELECT value INTO _admin_emails
  FROM public.app_config
  WHERE key = 'admin_emails';

  IF _admin_emails IS NOT NULL AND _admin_emails ? NEW.email THEN
    _role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    _role
  );
  RETURN NEW;
END;
$function$;
