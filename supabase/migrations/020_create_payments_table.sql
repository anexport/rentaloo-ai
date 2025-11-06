-- Migration: Add updated_at trigger for payments table
-- This migration adds the updated_at trigger function and trigger for the payments table
-- NOTE: The payments table is created in migration 013c_create_payments_table.sql

-- Create updated_at trigger function for payments (if not exists)
CREATE OR REPLACE FUNCTION update_payments_updated_at() 
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- Create trigger for payments updated_at
DROP TRIGGER IF EXISTS payments_updated_at_trigger ON payments;
CREATE TRIGGER payments_updated_at_trigger 
  BEFORE UPDATE ON payments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_payments_updated_at();

-- Note: RLS policies are created in migrations 017 and 019:
-- - SELECT: "Authenticated users can view payments" (migration 019)
-- - INSERT: "System can create payments" (created separately)
-- - UPDATE: "System can update payments" (created separately)
