-- Migration: Remove unused verification fields from role-specific profile tables
-- Reason: These fields were replaced by the boolean verification system in profiles table (migration 024)
-- Fields to remove:
--   - renter_profiles.verification_status (enum)
--   - owner_profiles.verification_level (enum)
-- These fields are only set once during signup and never read by the application

-- Drop the unused verification_status column from renter_profiles
ALTER TABLE public.renter_profiles
DROP COLUMN IF EXISTS verification_status;

-- Drop the unused verification_level column from owner_profiles
ALTER TABLE public.owner_profiles
DROP COLUMN IF EXISTS verification_level;

-- Add comments for documentation
COMMENT ON TABLE public.renter_profiles IS
  'Renter-specific profile data. Verification is tracked in the base profiles table.';

COMMENT ON TABLE public.owner_profiles IS
  'Owner-specific profile data. Verification is tracked in the base profiles table.';

-- Note: The verification_status enum type is still used elsewhere, so we keep it
-- If no other tables use it in the future, it can be dropped with:
-- DROP TYPE IF EXISTS verification_status CASCADE;
