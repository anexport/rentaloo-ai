-- Migration: Fix security issues in rental activation functions
-- Description: Adds null checks and documents SECURITY DEFINER usage
-- Fixes critical issues identified in migration 034:
--   1. Missing null checks for non-existent bookings
--   2. Unclear SECURITY DEFINER permissions model

-- ============================================================================
-- SECURITY MODEL DOCUMENTATION
-- ============================================================================
-- These functions use SECURITY DEFINER to bypass RLS because:
-- 1. rental_events table requires elevated privileges for audit trail integrity
-- 2. Multiple table updates (booking_requests + rental_events) need to be atomic
-- 3. Complex authorization logic (renter OR owner) is easier to maintain in one place
--
-- Security measures:
-- 1. Explicit authorization checks at function entry
-- 2. Direct table access is revoked (see REVOKE statements below)
-- 3. Users can ONLY modify these tables via these functions
-- ============================================================================

-- Fix activate_rental function with proper null checking
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

  -- Critical: Check if booking exists before authorization
  -- Without this, NULL variables bypass authorization checks
  IF v_renter_id IS NULL OR v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

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

  -- Verify the update actually happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not activate booking. Current status may not be "approved".';
  END IF;

  -- Log the event (uses SECURITY DEFINER to bypass RLS on rental_events)
  INSERT INTO rental_events (booking_id, event_type, created_by, event_data)
  VALUES (
    p_booking_id,
    'rental_started',
    v_caller_id,
    jsonb_build_object('activated_at', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix complete_rental function with proper null checking
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

  -- Critical: Check if booking exists before authorization
  -- Without this, NULL variables bypass authorization checks
  IF v_renter_id IS NULL OR v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

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

  -- Verify the update actually happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not complete booking. Current status may not be "active".';
  END IF;

  -- Log the event (uses SECURITY DEFINER to bypass RLS on rental_events)
  INSERT INTO rental_events (booking_id, event_type, created_by, event_data)
  VALUES (
    p_booking_id,
    'rental_completed',
    v_caller_id,
    jsonb_build_object('completed_at', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERMISSION HARDENING
-- ============================================================================
-- Revoke direct INSERT/UPDATE on rental_events to enforce function-only access
-- Users MUST use activate_rental() and complete_rental() functions

-- Revoke direct modification privileges
REVOKE INSERT, UPDATE, DELETE ON rental_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON rental_events FROM anon;

-- Users can only SELECT rental_events (controlled by RLS policies in migration 034)
GRANT SELECT ON rental_events TO authenticated;

-- Ensure execute permissions are granted (in case they were revoked)
GRANT EXECUTE ON FUNCTION activate_rental(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_rental(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION activate_rental IS 'Activates a rental after pickup inspection. Uses SECURITY DEFINER to atomically update booking_requests and insert into rental_events audit trail. Authorization: caller must be renter or equipment owner.';
COMMENT ON FUNCTION complete_rental IS 'Completes a rental after return inspection. Uses SECURITY DEFINER to atomically update booking_requests and insert into rental_events audit trail. Authorization: caller must be renter or equipment owner.';
