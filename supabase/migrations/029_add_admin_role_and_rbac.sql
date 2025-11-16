-- Migration: Add admin role and enhance RBAC
-- Description: Adds 'admin' role to user_role enum and creates helper functions for role-based access control

-- Step 1: Add 'admin' to the user_role enum
-- PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction, so we need to handle this carefully

-- Check if 'admin' already exists, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'admin'
    AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END $$;

-- Step 2: Create or replace function to get user role from profiles table
-- This function is SECURITY DEFINER to allow querying profiles table
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Step 3: Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = required_role
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(user_role) TO authenticated;

-- Step 4: Create function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles user_role[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_any_role(user_role[]) TO authenticated;

-- Step 5: Create admin_profiles table for admin-specific data
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{}',  -- Store granular permissions
  last_admin_action_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin_profiles
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS policies for admin_profiles
-- Only admins can view admin profiles
CREATE POLICY "Admins can view admin profiles"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update admin profiles
CREATE POLICY "Admins can update admin profiles"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Step 7: Create trigger to create admin_profile when profile role is set to admin
CREATE OR REPLACE FUNCTION create_admin_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is admin and no admin_profile exists, create one
  IF NEW.role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM admin_profiles WHERE profile_id = NEW.id
  ) THEN
    INSERT INTO admin_profiles (profile_id, permissions)
    VALUES (NEW.id, '{"all": true}'::jsonb);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_admin_role_change ON profiles;
CREATE TRIGGER on_profile_admin_role_change
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION create_admin_profile();

-- Step 8: Add helpful comments
COMMENT ON FUNCTION public.get_my_role() IS 'Returns the role of the currently authenticated user';
COMMENT ON FUNCTION public.has_role(user_role) IS 'Checks if the current user has a specific role';
COMMENT ON FUNCTION public.has_any_role(user_role[]) IS 'Checks if the current user has any of the specified roles';
COMMENT ON TABLE admin_profiles IS 'Additional data for admin users including granular permissions';

-- Step 9: Create index for role lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
