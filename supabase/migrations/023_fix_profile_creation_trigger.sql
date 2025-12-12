-- Migration: Fix profile creation trigger to bypass RLS policies
-- Issue: handle_new_user() trigger function was failing due to RLS policy restrictions
-- Solution: Recreate function with proper SECURITY DEFINER configuration and error handling

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the handle_new_user function with proper RLS bypass
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
      verification_status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'preferences')::jsonb, '{}'::jsonb),
      COALESCE(NEW.raw_user_meta_data->>'experienceLevel', 'beginner'),
      'unverified'::verification_status,
      now(),
      now()
    );

  ELSIF user_role = 'owner' THEN
    INSERT INTO public.owner_profiles (
      profile_id,
      business_info,
      verification_level,
      earnings_total,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'business_info')::jsonb, '{}'::jsonb),
      'unverified'::verification_status,
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

-- Recreate the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates profile and role-specific profile (renter/owner) when a new user signs up. Uses SECURITY DEFINER to bypass RLS policies during profile creation.';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Triggers profile creation after new user registration';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
