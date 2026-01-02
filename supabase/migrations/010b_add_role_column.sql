-- Add role column to lexa_user_profiles
-- Migration: 010b_add_role_column.sql
-- Description: Adds role field for captain/admin access control

-- Add role column if it doesn't exist
ALTER TABLE lexa_user_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'captain', 'admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_lexa_user_profiles_role ON lexa_user_profiles(role);

-- Update existing users (optional - set specific users as captains/admins)
-- UPDATE lexa_user_profiles SET role = 'admin' WHERE user_id = 'YOUR_USER_ID';
-- UPDATE lexa_user_profiles SET role = 'captain' WHERE user_id IN ('CAPTAIN_1', 'CAPTAIN_2');

COMMENT ON COLUMN lexa_user_profiles.role IS 'User role: user (default), captain (knowledge portal access), admin (full access)';
