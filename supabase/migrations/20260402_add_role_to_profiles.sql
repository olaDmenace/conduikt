-- Add role column to profiles for admin access control
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index for quick role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
