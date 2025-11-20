-- Add verification columns to profiles table
-- This fixes the error where useVerification.ts expects these fields but they don't exist

-- Add verification status columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.identity_verified IS 'Whether user has completed identity verification';
COMMENT ON COLUMN profiles.phone_verified IS 'Whether user has verified their phone number';
COMMENT ON COLUMN profiles.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN profiles.address_verified IS 'Whether user has verified their physical address';
COMMENT ON COLUMN profiles.verified_at IS 'Timestamp when user completed full verification';

-- Create index for querying verified users
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
ON profiles(identity_verified, phone_verified, email_verified, address_verified)
WHERE identity_verified = TRUE OR phone_verified = TRUE OR email_verified = TRUE OR address_verified = TRUE;

-- Backfill verification data from user_verifications table if any exists
-- Set identity_verified to TRUE for users who have a verified identity verification record
UPDATE profiles p
SET identity_verified = TRUE,
    verified_at = COALESCE(p.verified_at, uv.created_at)
FROM user_verifications uv
WHERE p.id = uv.user_id
  AND uv.verification_type = 'identity'
  AND uv.status = 'verified'
  AND p.identity_verified = FALSE;

-- Set phone_verified to TRUE for users who have a verified phone verification record
UPDATE profiles p
SET phone_verified = TRUE,
    verified_at = COALESCE(p.verified_at, uv.created_at)
FROM user_verifications uv
WHERE p.id = uv.user_id
  AND uv.verification_type = 'phone'
  AND uv.status = 'verified'
  AND p.phone_verified = FALSE;

-- Set email_verified based on auth.users email confirmation
UPDATE profiles p
SET email_verified = TRUE
FROM auth.users au
WHERE p.id = au.id
  AND au.email_confirmed_at IS NOT NULL
  AND p.email_verified = FALSE;
