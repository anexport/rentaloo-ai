-- Migration: Medium Priority Booking System Fixes
-- This migration implements important data integrity and performance improvements:
-- 1. Add date range index for efficient conflict checking
-- 2. Add indexes on bookings table for common queries
-- 3. Create payment status sync trigger
-- 4. Add booking history/audit log table

-- 1. Add composite index for efficient conflict checking
-- This index speeds up queries checking for overlapping bookings
CREATE INDEX IF NOT EXISTS idx_booking_requests_conflict_check
ON booking_requests (equipment_id, status, start_date, end_date)
WHERE status IN ('pending', 'approved');

-- 2. Add indexes on bookings table for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
ON bookings (payment_status);

CREATE INDEX IF NOT EXISTS idx_bookings_return_status
ON bookings (return_status);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_request_id
ON bookings (booking_request_id);

-- 3. Create function to sync payment status between bookings and payments
CREATE OR REPLACE FUNCTION sync_payment_status_to_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking payment_status when payment status changes
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    UPDATE bookings
    SET payment_status = NEW.payment_status
    WHERE booking_request_id = NEW.booking_request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync payment status
DROP TRIGGER IF EXISTS trigger_sync_payment_status ON payments;
CREATE TRIGGER trigger_sync_payment_status
  AFTER INSERT OR UPDATE OF payment_status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_status_to_booking();

-- 4. Create booking history/audit log table
CREATE TABLE IF NOT EXISTS booking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_request_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  metadata JSONB
);

-- Create indexes on booking_history for common queries
CREATE INDEX IF NOT EXISTS idx_booking_history_booking_request_id
ON booking_history (booking_request_id);

CREATE INDEX IF NOT EXISTS idx_booking_history_changed_at
ON booking_history (changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_history_changed_by
ON booking_history (changed_by);

-- Create function to log booking status changes
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO booking_history (
      booking_request_id,
      old_status,
      new_status,
      changed_by,
      reason
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(), -- Get current user from Supabase auth
      NULL -- Can be set by application code
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log booking status changes
DROP TRIGGER IF EXISTS trigger_log_booking_status_change ON booking_requests;
CREATE TRIGGER trigger_log_booking_status_change
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION log_booking_status_change();

-- Enable RLS on booking_history table
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view booking history for their own bookings
CREATE POLICY "Users can view their own booking history"
ON booking_history
FOR SELECT
USING (
  -- Check if user is the renter
  EXISTS (
    SELECT 1 FROM booking_requests
    WHERE booking_requests.id = booking_history.booking_request_id
    AND booking_requests.renter_id = auth.uid()
  )
  OR
  -- Check if user is the owner
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN equipment e ON br.equipment_id = e.id
    WHERE br.id = booking_history.booking_request_id
    AND e.owner_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT ON booking_history TO authenticated;
GRANT EXECUTE ON FUNCTION sync_payment_status_to_booking() TO authenticated;
GRANT EXECUTE ON FUNCTION log_booking_status_change() TO authenticated;

