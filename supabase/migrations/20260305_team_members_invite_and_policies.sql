-- Add invite_email column and make user_id nullable for pending invites
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS invite_email text;
ALTER TABLE team_members ALTER COLUMN user_id DROP NOT NULL;
