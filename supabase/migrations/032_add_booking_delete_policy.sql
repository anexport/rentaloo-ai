-- ============================================================================
-- Migration: Add DELETE policy for booking_requests
-- ============================================================================
-- Issue: Users cannot delete their own pending booking requests because
-- there was no DELETE policy. This causes "orphaned" pending bookings when
-- users abandon the payment flow, blocking other users from booking.
-- 
-- Solution: Allow renters to delete their own PENDING booking requests only.
-- Approved/completed bookings cannot be deleted (must go through cancellation flow).
-- ============================================================================

-- Create DELETE policy for booking_requests
-- Only allow deletion of PENDING bookings by the renter who created them
CREATE POLICY "Renters can delete their own pending booking requests"
    ON booking_requests
    FOR DELETE
    TO authenticated
    USING (
        -- Must be the renter who created this booking
        (select auth.uid()) = renter_id
        -- Can only delete pending bookings (not approved, completed, etc.)
        AND status = 'pending'
    );

-- ============================================================================
-- Also add a function to clean up stale pending bookings (optional cron job)
-- ============================================================================
-- This function can be called by a cron job to clean up abandoned bookings
-- after a configurable timeout (default 30 minutes)

CREATE OR REPLACE FUNCTION cleanup_stale_pending_bookings(
    timeout_minutes INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM booking_requests
        WHERE status = 'pending'
        AND created_at < NOW() - (timeout_minutes || ' minutes')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only (for cron jobs)
-- This should NOT be callable by regular authenticated users
REVOKE ALL ON FUNCTION cleanup_stale_pending_bookings(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_stale_pending_bookings(INTEGER) FROM authenticated;

COMMENT ON FUNCTION cleanup_stale_pending_bookings IS 
    'Cleans up abandoned pending booking requests older than the specified timeout. 
     Should be called by a scheduled cron job, not directly by users.';

-- ============================================================================
-- Add index to improve cleanup query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_booking_requests_pending_cleanup 
    ON booking_requests(created_at) 
    WHERE status = 'pending';

