-- Webhook configurations for outbound content delivery
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS webhook_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL, -- 'wordpress' | 'webflow' | 'buffer' | 'generic'
    endpoint_url text NOT NULL,
    auth_token text, -- encrypted at rest via application-level encryption
    config jsonb DEFAULT '{}',
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- RLS
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own webhooks"
    ON webhook_configs FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Updated at trigger
DO $$ BEGIN
  CREATE TRIGGER update_webhook_configs_updated_at
    BEFORE UPDATE ON webhook_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
