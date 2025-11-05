-- Migration: Fix booking cancellation availability recomputation
-- This migration updates the handle_booking_cancellation function to properly
-- recompute availability by checking for remaining approved bookings instead of
-- unconditionally setting dates to available.

-- Update function to handle booking cancellation/decline with proper availability recomputation
CREATE OR REPLACE FUNCTION handle_booking_cancellation()
RETURNS TRIGGER
SET search_path = public, pg_temp
AS $$
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

