-- Migration: Automate booking creation and availability calendar updates
-- This migration creates triggers and functions to automatically:
-- 1. Create a bookings record when a booking request is approved
-- 2. Mark dates as unavailable in availability_calendar when approved
-- 3. Mark dates as available again when booking is cancelled/declined

-- Ensure UNIQUE constraint exists on bookings.booking_request_id for conflict resolution
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_booking_request'
          AND conrelid = 'bookings'::regclass
    ) THEN
        -- Check for existing duplicates before adding constraint
        IF EXISTS (
            SELECT 1 FROM (
                SELECT booking_request_id, COUNT(*)
                FROM bookings
                GROUP BY booking_request_id
                HAVING COUNT(*) > 1
            ) duplicates
        ) THEN
            RAISE EXCEPTION 'Cannot add UNIQUE constraint: found duplicate booking_request_ids in bookings table';
        END IF;
        
        ALTER TABLE bookings ADD CONSTRAINT unique_booking_request UNIQUE (booking_request_id);
    END IF;
END $$;

-- Function to handle booking approval
CREATE OR REPLACE FUNCTION handle_booking_approval()
RETURNS TRIGGER AS $$
DECLARE
  date_range_days INTEGER;
  max_booking_days INTEGER := 30;
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Validate date range (maximum 30 days)
    date_range_days := (NEW.end_date - NEW.start_date) + 1;
    IF date_range_days > max_booking_days THEN
      RAISE EXCEPTION 'Booking date range exceeds maximum allowed period of % days', max_booking_days;
    END IF;
    
    -- Validate that end_date is after start_date
    IF NEW.end_date < NEW.start_date THEN
      RAISE EXCEPTION 'Invalid date range: end_date must be after start_date';
    END IF;
    
    -- Create bookings record if it doesn't exist
    INSERT INTO bookings (booking_request_id, payment_status, return_status)
    VALUES (NEW.id, 'pending', 'pending')
    ON CONFLICT (booking_request_id) DO NOTHING;
    
    -- Mark dates as unavailable in availability_calendar using set-based approach
    INSERT INTO availability_calendar (equipment_id, date, is_available)
    SELECT NEW.equipment_id, date_series::date, false
    FROM generate_series(NEW.start_date, NEW.end_date, '1 day'::interval) AS date_series
    ON CONFLICT (equipment_id, date)
    DO UPDATE SET is_available = false;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle booking cancellation/decline
CREATE OR REPLACE FUNCTION handle_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed from 'approved' to 'declined' or 'cancelled'
  IF (NEW.status = 'declined' OR NEW.status = 'cancelled') 
     AND OLD.status = 'approved' THEN
    
    -- Mark dates as available again in availability_calendar
    -- Use set-based operation to generate date series and UPSERT all dates at once
    -- Recompute availability: set to false if any approved booking still covers the date, otherwise true
    INSERT INTO availability_calendar (equipment_id, date, is_available)
    SELECT 
      OLD.equipment_id,
      date_series::DATE,
      true
    FROM generate_series(OLD.start_date, OLD.end_date, INTERVAL '1 day') AS date_series
    ON CONFLICT (equipment_id, date)
    DO UPDATE SET is_available = (
      NOT EXISTS (
        SELECT 1 
        FROM booking_requests br
        WHERE br.equipment_id = availability_calendar.equipment_id
          AND br.status = 'approved'
          AND br.start_date <= availability_calendar.date
          AND br.end_date >= availability_calendar.date
          AND br.id != OLD.id
      )
    );
    
    -- Note: We keep the bookings record for history/audit purposes
    -- If you want to delete it, uncomment the following:
    -- DELETE FROM bookings WHERE booking_request_id = OLD.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking approval
DROP TRIGGER IF EXISTS trigger_booking_approval ON booking_requests;
CREATE TRIGGER trigger_booking_approval
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION handle_booking_approval();

-- Create trigger for booking cancellation/decline
DROP TRIGGER IF EXISTS trigger_booking_cancellation ON booking_requests;
CREATE TRIGGER trigger_booking_cancellation
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN ((NEW.status = 'declined' OR NEW.status = 'cancelled') AND OLD.status = 'approved')
  EXECUTE FUNCTION handle_booking_cancellation();

-- Handle initial approval (when status is set to 'approved' on INSERT)
-- This is less common but could happen if someone creates a booking request with approved status
DROP TRIGGER IF EXISTS trigger_booking_initial_approval ON booking_requests;
CREATE TRIGGER trigger_booking_initial_approval
  AFTER INSERT ON booking_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION handle_booking_approval();

-- Security: These functions are trigger-only and should not be directly executable by users
-- They run as SECURITY DEFINER within the trigger context, executed by the database system
-- Only the database triggers (trigger_booking_approval, trigger_booking_cancellation, 
-- trigger_booking_initial_approval) should invoke these functions
-- 
-- Revoke any existing grants (safe to run even if grants don't exist):
REVOKE EXECUTE ON FUNCTION handle_booking_approval() FROM authenticated;
REVOKE EXECUTE ON FUNCTION handle_booking_cancellation() FROM authenticated;

