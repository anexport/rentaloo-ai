-- Migration: Create database schema for damage protection system
-- This migration establishes the database foundation for damage deposits, insurance,
-- equipment inspections, and damage claims.

-- Create enum types for inspection and claim statuses
CREATE TYPE inspection_type AS ENUM ('pickup', 'return');
CREATE TYPE claim_status AS ENUM ('pending', 'accepted', 'disputed', 'resolved', 'escalated');
CREATE TYPE deposit_status AS ENUM ('held', 'released', 'claimed', 'refunded');

-- Create equipment_inspections table
CREATE TABLE equipment_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  inspection_type inspection_type NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  condition_notes TEXT,
  checklist_items JSONB DEFAULT '[]',
  verified_by_owner BOOLEAN DEFAULT false,
  verified_by_renter BOOLEAN DEFAULT false,
  owner_signature TEXT,
  renter_signature TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for equipment_inspections
CREATE INDEX idx_equipment_inspections_booking ON equipment_inspections(booking_id);
CREATE INDEX idx_equipment_inspections_type ON equipment_inspections(inspection_type);

-- Create damage_claims table
CREATE TABLE damage_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  filed_by UUID NOT NULL REFERENCES profiles(id),
  filed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  damage_description TEXT NOT NULL,
  evidence_photos TEXT[] NOT NULL DEFAULT '{}',
  estimated_cost DECIMAL(10,2) NOT NULL,
  repair_quotes TEXT[] DEFAULT '{}',
  status claim_status NOT NULL DEFAULT 'pending',
  renter_response JSONB,
  resolution JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for damage_claims
CREATE INDEX idx_damage_claims_booking ON damage_claims(booking_id);
CREATE INDEX idx_damage_claims_status ON damage_claims(status);
CREATE INDEX idx_damage_claims_filed_by ON damage_claims(filed_by);

-- Modify equipment table to add deposit fields
ALTER TABLE equipment
ADD COLUMN damage_deposit_amount DECIMAL(10,2),
ADD COLUMN damage_deposit_percentage INTEGER CHECK (damage_deposit_percentage >= 0 AND damage_deposit_percentage <= 100),
ADD COLUMN deposit_refund_timeline_hours INTEGER DEFAULT 48;

-- Add comments to equipment columns
COMMENT ON COLUMN equipment.damage_deposit_amount IS 'Fixed damage deposit amount in dollars';
COMMENT ON COLUMN equipment.damage_deposit_percentage IS 'Damage deposit as percentage of daily rate (0-100)';
COMMENT ON COLUMN equipment.deposit_refund_timeline_hours IS 'Hours after return before deposit is auto-released (default 48)';

-- Modify booking_requests table to add insurance and deposit fields
ALTER TABLE booking_requests
ADD COLUMN insurance_type TEXT CHECK (insurance_type IN ('none', 'basic', 'premium')),
ADD COLUMN insurance_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN damage_deposit_amount DECIMAL(10,2) DEFAULT 0;

-- Add comments to booking_requests columns
COMMENT ON COLUMN booking_requests.insurance_type IS 'Type of insurance selected: none, basic (5%), or premium (10%)';
COMMENT ON COLUMN booking_requests.insurance_cost IS 'Calculated insurance cost based on rental amount';
COMMENT ON COLUMN booking_requests.damage_deposit_amount IS 'Damage deposit amount for this booking';

-- Modify payments table to add detailed payment breakdown
ALTER TABLE payments
ADD COLUMN rental_amount DECIMAL(10,2),
ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN insurance_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN deposit_status deposit_status DEFAULT 'held',
ADD COLUMN deposit_released_at TIMESTAMPTZ;

-- Add comments to payments columns
COMMENT ON COLUMN payments.rental_amount IS 'Base rental amount (excluding fees, deposit, insurance)';
COMMENT ON COLUMN payments.deposit_amount IS 'Damage deposit amount held in escrow';
COMMENT ON COLUMN payments.insurance_amount IS 'Insurance fee charged to renter';
COMMENT ON COLUMN payments.deposit_status IS 'Status of damage deposit: held, released, claimed, or refunded';
COMMENT ON COLUMN payments.deposit_released_at IS 'Timestamp when deposit was released back to renter';

-- Add table comments
COMMENT ON TABLE equipment_inspections IS
  'Records equipment condition inspections at pickup and return. Both owner and renter verify condition with photos, checklists, and digital signatures.';

COMMENT ON TABLE damage_claims IS
  'Damage claims filed by owners after equipment return. Includes evidence photos, repair quotes, and renter responses.';

-- Create updated_at trigger for damage_claims
CREATE OR REPLACE FUNCTION update_damage_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_damage_claims_updated_at
  BEFORE UPDATE ON damage_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_damage_claims_updated_at();
