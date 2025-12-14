-- Migration: Fix equipment_inspections UPDATE RLS policy
-- Issue: Owner couldn't confirm return inspection due to RLS violation
-- Root cause: The UPDATE policy only had a USING clause that checked (NOT verified_by_owner).
-- When WITH CHECK is missing, PostgreSQL uses USING to validate the new row.
-- After setting verified_by_owner = true, the row failed (NOT verified_by_owner) check.
-- Fix: Add a WITH CHECK clause that only verifies user is owner/renter, without checking verification status.

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update their verification on inspections" ON equipment_inspections;

-- Create a new policy with proper USING and WITH CHECK clauses
-- USING: determines which rows can be selected for update (must not have already verified)
-- WITH CHECK: determines if the updated row is valid (owner or renter of the booking)
CREATE POLICY "Users can update their verification on inspections"
ON equipment_inspections
FOR UPDATE
TO authenticated
USING (
  -- Renter can update if they haven't verified yet
  (
    EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.id = equipment_inspections.booking_id
      AND br.renter_id = auth.uid()
    )
    AND NOT verified_by_renter
  )
  OR
  -- Owner can update if they haven't verified yet
  (
    EXISTS (
      SELECT 1 FROM booking_requests br
      JOIN equipment e ON e.id = br.equipment_id
      WHERE br.id = equipment_inspections.booking_id
      AND e.owner_id = auth.uid()
    )
    AND NOT verified_by_owner
  )
)
WITH CHECK (
  -- After update, just verify the user is the renter or owner of the booking
  EXISTS (
    SELECT 1 FROM booking_requests br
    WHERE br.id = equipment_inspections.booking_id
    AND br.renter_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN equipment e ON e.id = br.equipment_id
    WHERE br.id = equipment_inspections.booking_id
    AND e.owner_id = auth.uid()
  )
);
