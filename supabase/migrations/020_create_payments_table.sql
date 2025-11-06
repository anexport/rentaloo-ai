-- Migration: Create payments table for Stripe payment processing
-- This migration creates the payments table with all necessary fields for Stripe integration

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE,
  stripe_charge_id text,
  stripe_transfer_id text,
  payment_method_id text,
  subtotal numeric(10,2) NOT NULL,
  service_fee numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  escrow_amount numeric(10,2) NOT NULL,
  owner_payout_amount numeric(10,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
  escrow_status text NOT NULL DEFAULT 'held' 
    CHECK (escrow_status IN ('held', 'released', 'refunded', 'disputed')),
  payout_status text NOT NULL DEFAULT 'pending' 
    CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  refund_amount numeric(10,2) DEFAULT 0,
  refund_reason text,
  currency text NOT NULL DEFAULT 'usd',
  failure_reason text,
  escrow_released_at timestamptz,
  payout_processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_amounts CHECK (total_amount = subtotal + service_fee + tax),
  CONSTRAINT valid_escrow CHECK (escrow_amount <= total_amount),
  CONSTRAINT valid_payout CHECK (owner_payout_amount <= escrow_amount)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_request ON payments(booking_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_renter ON payments(renter_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_escrow_status ON payments(escrow_status);
CREATE INDEX IF NOT EXISTS idx_payments_payout_status ON payments(payout_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(payment_status, created_at DESC);
-- Note: stripe_payment_intent_id In supabase/migrations/020_create_payments_table.sql around lines 7 to 9, the renter_id and owner_id columns currently use ON DELETE CASCADE which will remove payment records when a profile is deleted; change these constraints to use ON DELETE RESTRICT to prevent profile deletion while payments exist (recommended for financial/audit integrity). If you prefer to allow profile deletion but retain payments, change to ON DELETE SET NULL and make renter_id and owner_id nullable; update the migration to implement one of these two alternatives and remove CASCADE for both columns.already has an index from the UNIQUE constraint

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

-- Enable Row Level Security on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are created in migrations 017 and 019:
-- - SELECT: "Authenticated users can view payments" (migration 019)
-- - INSERT: "System can create payments" (created separately)
-- - UPDATE: "System can update payments" (created separately)
