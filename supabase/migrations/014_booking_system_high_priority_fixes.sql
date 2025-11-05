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
-- First, check if there are any duplicate booking_request_ids
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT booking_request_id, COUNT(*)
    FROM bookings
    GROUP BY booking_request_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot add UNIQUE constraint: found % duplicate booking_request_ids in bookings table', duplicate_count;
  END IF;
END $$;

ALTER TABLE bookings
ADD CONSTRAINT unique_booking_request
UNIQUE (booking_request_id);

-- 4. Create function to handle booking completion
CREATE OR REPLACE FUNCTION handle_booking_completion()
RETURNS TRIGGER AS $$
DECLARE
  booking_date DATE;
BEGIN
  -- Mark dates as available again when booking is completed
  -- Use text comparison since enum value might not be committed yet
  IF NEW.status::text = 'completed' AND (OLD.status IS NULL OR OLD.status::text != 'completed') THEN
    booking_date := OLD.start_date;
    
    WHILE booking_date <= OLD.end_date LOOP
      -- Update availability calendar entry to available
      UPDATE availability_calendar
      SET is_available = true
      WHERE equipment_id = OLD.equipment_id
        AND date = booking_date;
      
      booking_date := booking_date + INTERVAL '1 day';
    END LOOP;
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_booking_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION check_booking_conflicts(UUID, DATE, DATE, UUID) TO authenticated;

