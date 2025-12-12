-- Migration: Add 'active' status to booking_status enum
-- Description: Adds 'active' status to track rentals that are currently in progress
-- The flow is: approved -> active -> completed

-- Add 'active' to the booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'active' AFTER 'approved';

-- Create rental_events table for audit trail
CREATE TABLE IF NOT EXISTS rental_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'pickup_confirmed',
    'rental_started', 
    'return_confirmed',
    'rental_completed',
    'review_submitted',
    'deposit_released'
  )),
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rental_events_booking ON rental_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_rental_events_type ON rental_events(event_type);

-- Add review tracking columns to booking_requests
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS renter_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS owner_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- RLS policies for rental_events table
ALTER TABLE rental_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view rental events for their bookings" ON rental_events;
DROP POLICY IF EXISTS "Users can create rental events for their bookings" ON rental_events;

-- Users can view events for bookings they're part of (as renter or equipment owner)
CREATE POLICY "Users can view rental events for their bookings"
ON rental_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN equipment e ON br.equipment_id = e.id
    WHERE br.id = rental_events.booking_id
    AND (br.renter_id = auth.uid() OR e.owner_id = auth.uid())
  )
);

-- Users can insert events for bookings they're part of
CREATE POLICY "Users can create rental events for their bookings"
ON rental_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN equipment e ON br.equipment_id = e.id
    WHERE br.id = booking_id
    AND (br.renter_id = auth.uid() OR e.owner_id = auth.uid())
  )
);

-- Function to activate a rental (called after pickup inspection)
CREATE OR REPLACE FUNCTION activate_rental(p_booking_id UUID)
RETURNS VOID AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_renter_id UUID;
  v_owner_id UUID;
BEGIN
  -- Fetch renter and owner for permission check
  SELECT br.renter_id, e.owner_id INTO v_renter_id, v_owner_id
  FROM booking_requests br
  JOIN equipment e ON br.equipment_id = e.id
  WHERE br.id = p_booking_id;

  -- Explicitly validate caller is renter or owner
  IF v_caller_id IS NULL OR (v_caller_id != v_renter_id AND v_caller_id != v_owner_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not have permission to activate this rental';
  END IF;

  -- Update booking status to active
  UPDATE booking_requests
  SET
    status = 'active',
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id
  AND status = 'approved';

  -- Log the event
  INSERT INTO rental_events (booking_id, event_type, created_by, event_data)
  VALUES (
    p_booking_id,
    'rental_started',
    v_caller_id,
    jsonb_build_object('activated_at', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a rental (called after return inspection)
CREATE OR REPLACE FUNCTION complete_rental(p_booking_id UUID)
RETURNS VOID AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_renter_id UUID;
  v_owner_id UUID;
BEGIN
  -- Fetch renter and owner for permission check
  SELECT br.renter_id, e.owner_id INTO v_renter_id, v_owner_id
  FROM booking_requests br
  JOIN equipment e ON br.equipment_id = e.id
  WHERE br.id = p_booking_id;

  -- Explicitly validate caller is renter or owner
  IF v_caller_id IS NULL OR (v_caller_id != v_renter_id AND v_caller_id != v_owner_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not have permission to complete this rental';
  END IF;

  -- Update booking status to completed
  UPDATE booking_requests
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id
  AND status = 'active';

  -- Log the event
  INSERT INTO rental_events (booking_id, event_type, created_by, event_data)
  VALUES (
    p_booking_id,
    'rental_completed',
    v_caller_id,
    jsonb_build_object('completed_at', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION activate_rental(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_rental(UUID) TO authenticated;

COMMENT ON TABLE rental_events IS 'Audit trail for rental lifecycle events';
COMMENT ON FUNCTION activate_rental IS 'Activates a rental after pickup inspection is complete';
COMMENT ON FUNCTION complete_rental IS 'Completes a rental after return inspection is complete';

