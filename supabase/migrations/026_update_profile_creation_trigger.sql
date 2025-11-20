-- Migration: Update profile creation trigger to remove references to dropped verification fields
-- This migration updates the handle_new_user() trigger to stop setting the removed fields:
--   - renter_profiles.verification_status (removed in migration 025)
--   - owner_profiles.verification_level (removed in migration 025)

-- Drop existing function (this will cascade to the trigger)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the handle_new_user function without verification fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from user metadata, default to 'renter'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'renter');

  -- Create base profile
  -- SECURITY DEFINER allows this function to bypass RLS policies
  IF user_role = 'owner' THEN
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'owner'::public.user_role,
      now(),
      now()
    );
  ELSE
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'renter'::public.user_role,
      now(),
      now()
    );
  END IF;

  -- Create role-specific profile
  IF user_role = 'renter' THEN
    INSERT INTO public.renter_profiles (
      profile_id,
      preferences,
      experience_level,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'preferences')::jsonb, '{}'::jsonb),
      COALESCE(NEW.raw_user_meta_data->>'experienceLevel', 'beginner'),
      now(),
      now()
    );

  ELSIF user_role = 'owner' THEN
    INSERT INTO public.owner_profiles (
      profile_id,
      business_info,
      earnings_total,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'business_info')::jsonb, '{}'::jsonb),
      0,
      now(),
      now()
    );
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    -- This ensures auth.users record is still created even if profile creation fails
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates profile and role-specific profile (renter/owner) when a new user signs up. Uses SECURITY DEFINER to bypass RLS policies during profile creation. Verification is tracked in the base profiles table.';

-- Recreate the trigger (was dropped by CASCADE when function was dropped)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
