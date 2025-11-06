-- Migration: Create payments table for Stripe payment processing
-- This migration creates the payments table with all necessary fields for Stripe integration
-- NOTE: This migration must run before migrations 015, 016, 017, and 019 which reference the payments table

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

-- Create base indexes for better performance
-- Note: Additional indexes are created in migration 016
CREATE INDEX IF NOT EXISTS idx_payments_booking_request ON payments(booking_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_renter ON payments(renter_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_escrow_status ON payments(escrow_status);
CREATE INDEX IF NOT EXISTS idx_payments_payout_status ON payments(payout_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
-- Note: stripe_payment_intent_id already has an index from the UNIQUE constraint
-- Note: idx_payments_status_created_at is created in migration 016

-- Enable Row Level Security on payments table
-- Note: RLS policies are created in migrations 017 and 019
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

