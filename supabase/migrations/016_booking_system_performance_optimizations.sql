-- Migration: Additional Performance Optimizations for Booking System
-- This migration adds missing indexes for common query patterns

-- 1. Add indexes on created_at for ordering (heavily used in queries)
-- booking_requests is ordered by created_at DESC in many places
CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at_desc
ON booking_requests (created_at DESC);

-- bookings table - add created_at index for ordering
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_desc
ON bookings (created_at DESC);

-- availability_calendar - add created_at index (though less critical)
CREATE INDEX IF NOT EXISTS idx_availability_calendar_created_at
ON availability_calendar (created_at DESC);

-- 2. Add composite index for owner queries (equipment_id + status + created_at)
-- This optimizes queries where owners query booking requests for their equipment
-- Pattern: SELECT ... WHERE equipment_id IN (...) AND status = 'pending' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_booking_requests_equipment_status_created
ON booking_requests (equipment_id, status, created_at DESC)
WHERE status IN ('pending', 'approved', 'declined', 'cancelled');

-- 3. Add composite index for renter queries (renter_id + status + created_at)
-- Pattern: SELECT ... WHERE renter_id = ... AND status IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_booking_requests_renter_status_created
ON booking_requests (renter_id, status, created_at DESC);

-- 4. Add index for availability_calendar date range queries
-- Pattern: SELECT ... WHERE equipment_id = ... AND date >= ... AND date <= ...
-- The unique index on (equipment_id, date) helps, but adding a date-only index for range queries
CREATE INDEX IF NOT EXISTS idx_availability_calendar_date
ON availability_calendar (date);

-- 5. Add composite index for availability_calendar queries by equipment and date range
-- Optimizes: SELECT ... WHERE equipment_id = ... AND date BETWEEN ... AND ...
CREATE INDEX IF NOT EXISTS idx_availability_calendar_equipment_date_range
ON availability_calendar (equipment_id, date);

-- 6. Add updated_at indexes for tracking changes (if needed for future features)
CREATE INDEX IF NOT EXISTS idx_booking_requests_updated_at
ON booking_requests (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_updated_at
ON bookings (updated_at DESC);

-- 7. Add composite index for booking requests with date filtering
-- Optimizes queries that filter by status and date range
CREATE INDEX IF NOT EXISTS idx_booking_requests_status_dates
ON booking_requests (status, start_date, end_date)
WHERE status IN ('pending', 'approved');

-- 8. Add index for payments filtering by status and created_at (if not exists)
-- Check if payments.created_at already has an index (it does from earlier migration)
-- But add composite index for status + created_at queries
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at
ON payments (payment_status, created_at DESC);

-- Note: These indexes are optimized for the most common query patterns:
-- - Owner dashboard: equipment_id + status + created_at
-- - Renter dashboard: renter_id + status + created_at  
-- - Ordering by created_at (most common)
-- - Availability calendar date range queries
-- - Payment history queries

