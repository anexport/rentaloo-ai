-- Fix content_translations RLS policies to prevent unauthorized tampering
-- This migration addresses the security vulnerability where any authenticated user
-- could insert/update translations for content they don't own

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert translations" ON content_translations;
DROP POLICY IF EXISTS "Authenticated users can update translations" ON content_translations;

-- Policy 1: Users can select translations for equipment they own
CREATE POLICY "Users can select translations for own equipment"
ON content_translations
FOR SELECT
TO authenticated
USING (
  content_type = 'equipment' AND
  EXISTS (
    SELECT 1 FROM equipment
    WHERE equipment.id = content_translations.content_id
    AND equipment.owner_id = auth.uid()
  )
);

-- Policy 2: Allow service role to select any translations (for cache lookups)
CREATE POLICY "Service role can select any translations"
ON content_translations
FOR SELECT
TO service_role
USING (true);

-- Policy 1: Users can only insert translations for equipment they own
CREATE POLICY "Users can insert translations for own equipment"
ON content_translations
FOR INSERT
TO authenticated
WITH CHECK (
  content_type = 'equipment' AND
  EXISTS (
    SELECT 1 FROM equipment
    WHERE equipment.id = content_translations.content_id
    AND equipment.owner_id = auth.uid()
  )
);

-- Policy 2: Users can only update translations for equipment they own
CREATE POLICY "Users can update translations for own equipment"
ON content_translations
FOR UPDATE
TO authenticated
USING (
  content_type = 'equipment' AND
  EXISTS (
    SELECT 1 FROM equipment
    WHERE equipment.id = content_translations.content_id
    AND equipment.owner_id = auth.uid()
  )
);

-- Policy 3: Allow service role to insert any translations (for automated translation service)
CREATE POLICY "Service role can insert any translations"
ON content_translations
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 4: Allow service role to update any translations (for automated translation service)
CREATE POLICY "Service role can update any translations"
ON content_translations
FOR UPDATE
TO service_role
USING (true);

-- Policy 5: Users can only delete translations for equipment they own
CREATE POLICY "Users can delete translations for own equipment"
ON content_translations
FOR DELETE
TO authenticated
USING (
  content_type = 'equipment' AND
  EXISTS (
    SELECT 1 FROM equipment
    WHERE equipment.id = content_translations.content_id
    AND equipment.owner_id = auth.uid()
  )
);

-- Policy 6: Allow service role to delete any translations (for cleanup/maintenance)
CREATE POLICY "Service role can delete any translations"
ON content_translations
FOR DELETE
TO service_role
USING (true);

-- Add comment explaining the security model
COMMENT ON TABLE content_translations IS 'Caches translations of user-generated content. Write access restricted to content owners or service role to prevent tampering.';
