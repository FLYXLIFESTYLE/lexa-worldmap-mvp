-- Create Master Admin Accounts for LEXA Captain Portal
-- Run this in Supabase SQL Editor

-- IMPORTANT: This script creates users with pre-set passwords
-- After deployment, consider forcing password reset for security

-- =============================================================================
-- Step 1: Create Auth Users (if they don't exist)
-- =============================================================================

-- Paul Bickley
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'captain.paulbickley@gmail.com',
  crypt('Sycc8+8+2025#', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'captain.paulbickley@gmail.com'
);

-- Bakary Coulibaly
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'bakcooli@gmail.com',
  crypt('Sycc8+8+2025#', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'bakcooli@gmail.com'
);

-- Christian Haack
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'chh@flyxlifestyle.com',
  crypt('Sycc8+8+2025#', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'chh@flyxlifestyle.com'
);

-- =============================================================================
-- Step 2: Create Captain Profiles with Admin Role
-- =============================================================================

-- Paul Bickley
INSERT INTO captain_profiles (user_id, display_name, role)
SELECT id, 'Paul Bickley', 'admin'
FROM auth.users
WHERE email = 'captain.paulbickley@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin',
    display_name = 'Paul Bickley',
    updated_at = NOW();

-- Bakary Coulibaly
INSERT INTO captain_profiles (user_id, display_name, role)
SELECT id, 'Bakary Coulibaly', 'admin'
FROM auth.users
WHERE email = 'bakcooli@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin',
    display_name = 'Bakary Coulibaly',
    updated_at = NOW();

-- Christian Haack
INSERT INTO captain_profiles (user_id, display_name, role)
SELECT id, 'Christian Haack', 'admin'
FROM auth.users
WHERE email = 'chh@flyxlifestyle.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin',
    display_name = 'Christian Haack',
    updated_at = NOW();

-- =============================================================================
-- Step 3: Verify Creation
-- =============================================================================

-- Check all admin users
SELECT 
  u.email,
  cp.display_name,
  cp.role,
  cp.created_at
FROM captain_profiles cp
JOIN auth.users u ON u.id = cp.user_id
WHERE cp.role = 'admin'
ORDER BY cp.created_at DESC;

-- Expected output: 3 rows showing the admin users

