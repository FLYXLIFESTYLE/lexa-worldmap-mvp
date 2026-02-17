-- Add full_name and first_name columns to lexa_user_profiles
-- so the chat and UI can display the user's real name.

ALTER TABLE lexa_user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT;
