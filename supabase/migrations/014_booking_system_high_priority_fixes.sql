-- Migration: High Priority Booking System Fixes
-- This migration implements critical missing features for the booking system:
-- 1. Add 'completed' to booking_status enum (separate transaction)
-- 2. Add CHECK constraint for valid date range
-- 3. Add UNIQUE constraint on bookings.booking_request_id
-- 4. Create handle_booking_completion() function and trigger
-- 5. Create check_booking_conflicts() function

-- NOTE: Enum value 'completed' must be added in a separate migration first
-- Run: ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';

-- 2. Add CHECK constraint to ensure end_date >= start_date
ALTER TABLE booking_requests
ADD CONSTRAINT check_valid_date_range
CHECK (end_date >= start_date);

-- 3. Add UNIQUE constraint on bookings.booking_request_id
-- Note: Migration 013 already creates this constraint with IF NOT EXISTS guard
-- This migration ensures it exists but doesn't fail if it's already there
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

-- 4. Create function to handle booking completion
CREATE OR REPLACE FUNCTION handle_booking_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark dates as available again when booking is completed
  -- Use text comparison since enum value might not be committed yet
  IF NEW.status::text = 'completed' AND (OLD.status IS NULL OR OLD.status::text != 'completed') THEN
    -- Update availability calendar entries using set-based operation
    -- Join with generate_series to update all dates in the range at once
    UPDATE availability_calendar
    SET is_available = true
    FROM generate_series(OLD.start_date, OLD.end_date, '1 day'::interval) AS date_series
    WHERE availability_calendar.equipment_id = OLD.equipment_id
      AND availability_calendar.date = date_series::date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking completion
-- Note: Using text comparison in WHEN clause due to enum value commit timing
DROP TRIGGER IF EXISTS trigger_booking_completion ON booking_requests;
CREATE TRIGGER trigger_booking_completion
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN (NEW.status::text = 'completed' AND (OLD.status IS NULL OR OLD.status::text != 'completed'))
  EXECUTE FUNCTION handle_booking_completion();

-- 5. Create function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflicts(
  p_equipment_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping bookings with pending or approved status
  SELECT COUNT(*)
  INTO conflict_count
  FROM booking_requests
  WHERE equipment_id = p_equipment_id
    AND status IN ('pending', 'approved')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      -- Check for date overlap
      (start_date <= p_end_date AND end_date >= p_start_date)
    );
  
  -- Return true if no conflicts found
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security: handle_booking_completion() is trigger-only and should not be directly executable by users
-- It runs as SECURITY DEFINER within the trigger context, executed by the database system
-- Only the database trigger (trigger_booking_completion) should invoke this function
REVOKE EXECUTE ON FUNCTION handle_booking_completion() FROM authenticated;

-- Grant necessary permissions for functions that are meant to be called directly
GRANT EXECUTE ON FUNCTION check_booking_conflicts(UUID, DATE, DATE, UUID) TO authenticated;

