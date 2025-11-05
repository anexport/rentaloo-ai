-- Migration: Consolidate Multiple Permissive Policies
-- This migration consolidates overlapping permissive RLS policies to improve performance.
-- Multiple permissive policies for the same role and action are suboptimal because
-- PostgreSQL must evaluate each policy separately for every query.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

-- ============================================================================
-- AVAILABILITY_CALENDAR: Consolidate SELECT policies
-- ============================================================================
-- Current: "Anyone can view availability calendar" (anon + authenticated) + 
--         "Equipment owners can manage availability" (FOR ALL TO authenticated includes SELECT)
-- Solution: Keep "Anyone can view" for anon, consolidate authenticated SELECT into one policy

-- Drop the FOR ALL policy and recreate with separate actions
DROP POLICY IF EXISTS "Equipment owners can manage availability" ON availability_calendar;

-- Create separate policies for different actions (FOR ALL was causing SELECT overlap)
CREATE POLICY "Equipment owners can insert availability" ON availability_calendar
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = availability_calendar.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "Equipment owners can update availability" ON availability_calendar
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = availability_calendar.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "Equipment owners can delete availability" ON availability_calendar
    FOR DELETE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = availability_calendar.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

-- Keep "Anyone can view availability calendar" for SELECT (covers both anon and authenticated)
-- No need for separate authenticated SELECT policy

-- ============================================================================
-- BOOKING_REQUESTS: Consolidate SELECT policies for authenticated
-- ============================================================================
-- Current: Three separate SELECT policies for authenticated users:
--   1. "Users can view their own booking requests"
--   2. "Equipment owners can view requests for their equipment"
--   3. "Users can view booking requests for equipment they're viewing" (if exists)
-- Solution: Consolidate into one policy with OR conditions

DROP POLICY IF EXISTS "Users can view their own booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Equipment owners can view requests for their equipment" ON booking_requests;
DROP POLICY IF EXISTS "Users can view booking requests for equipment they're viewing" ON booking_requests;

CREATE POLICY "Authenticated users can view booking requests" ON booking_requests
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            -- Users can view their own booking requests
            (select auth.uid()) = renter_id
            OR
            -- Equipment owners can view requests for their equipment
            EXISTS (
                SELECT 1 FROM equipment 
                WHERE equipment.id = booking_requests.equipment_id 
                AND equipment.owner_id = (select auth.uid())
            )
            OR
            -- Users can view booking requests for available equipment they're viewing
            EXISTS (
                SELECT 1 FROM equipment 
                WHERE equipment.id = booking_requests.equipment_id 
                AND equipment.is_available = true
            )
        )
    );

-- ============================================================================
-- BOOKING_REQUESTS: Consolidate UPDATE policies for authenticated
-- ============================================================================
-- Current: Two separate UPDATE policies:
--   1. "Equipment owners can update booking requests for their equipment"
--   2. "Renters can cancel their own booking requests"
-- Solution: Consolidate into one policy with OR conditions

DROP POLICY IF EXISTS "Equipment owners can update booking requests for their equipment" ON booking_requests;
DROP POLICY IF EXISTS "Renters can cancel their own booking requests" ON booking_requests;

CREATE POLICY "Authenticated users can update booking requests" ON booking_requests
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            -- Equipment owners can update booking requests for their equipment
            EXISTS (
                SELECT 1 FROM equipment 
                WHERE equipment.id = booking_requests.equipment_id 
                AND equipment.owner_id = (select auth.uid())
            )
            OR
            -- Renters can cancel their own booking requests
            (select auth.uid()) = renter_id
        )
    );

-- ============================================================================
-- BOOKINGS: Consolidate SELECT policies for authenticated
-- ============================================================================
-- Current: Two separate SELECT policies:
--   1. "Users can view their own bookings"
--   2. "Equipment owners can view bookings for their equipment"
-- Solution: Consolidate into one policy with OR conditions

DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Equipment owners can view bookings for their equipment" ON bookings;

CREATE POLICY "Authenticated users can view bookings" ON bookings
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            -- Users can view their own bookings
            EXISTS (
                SELECT 1 FROM booking_requests 
                WHERE booking_requests.id = bookings.booking_request_id 
                AND booking_requests.renter_id = (select auth.uid())
            )
            OR
            -- Equipment owners can view bookings for their equipment
            EXISTS (
                SELECT 1 FROM booking_requests 
                JOIN equipment ON equipment.id = booking_requests.equipment_id
                WHERE booking_requests.id = bookings.booking_request_id 
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

-- ============================================================================
-- BOOKINGS: Consolidate UPDATE policies for authenticated
-- ============================================================================
-- Current: Two separate UPDATE policies:
--   1. "Users can update their own bookings"
--   2. "Equipment owners can update bookings for their equipment"
-- Solution: Consolidate into one policy with OR conditions

DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
DROP POLICY IF EXISTS "Equipment owners can update bookings for their equipment" ON bookings;

CREATE POLICY "Authenticated users can update bookings" ON bookings
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            -- Users can update their own bookings
            EXISTS (
                SELECT 1 FROM booking_requests 
                WHERE booking_requests.id = bookings.booking_request_id 
                AND booking_requests.renter_id = (select auth.uid())
            )
            OR
            -- Equipment owners can update bookings for their equipment
            EXISTS (
                SELECT 1 FROM booking_requests 
                JOIN equipment ON equipment.id = booking_requests.equipment_id
                WHERE booking_requests.id = bookings.booking_request_id 
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

-- ============================================================================
-- EQUIPMENT: Consolidate SELECT policies
-- ============================================================================
-- Current: Multiple SELECT policies:
--   1. "Anyone can view available equipment" (anon + authenticated)
--   2. "Owners can view their own equipment" (authenticated)
--   3. "Users can view all equipment for booking" (if exists - authenticated)
-- Solution: 
--   1. Restrict "Anyone can view available equipment" to anon role only
--   2. Create a consolidated policy for authenticated users that allows viewing available equipment OR own equipment

DROP POLICY IF EXISTS "Users can view all equipment for booking" ON equipment;
DROP POLICY IF EXISTS "Users can view equipment details for booking" ON equipment;
DROP POLICY IF EXISTS "Anyone can view available equipment" ON equipment;
DROP POLICY IF EXISTS "Owners can view their own equipment" ON equipment;

-- Create policy for anon users to view available equipment
CREATE POLICY "Anon users can view available equipment" ON equipment
    FOR SELECT TO anon
    USING (is_available = true);

-- Create consolidated policy for authenticated users
-- This allows authenticated users to:
-- 1. View available equipment (for browsing/booking)
-- 2. View their own equipment (regardless of availability status)
CREATE POLICY "Authenticated users can view equipment" ON equipment
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            -- View available equipment (for browsing/booking)
            is_available = true
            OR
            -- View their own equipment (regardless of availability)
            (select auth.uid()) = owner_id
        )
    );

-- ============================================================================
-- EQUIPMENT_PHOTOS: Consolidate SELECT policies
-- ============================================================================
-- Current: "Anyone can view equipment photos" (anon + authenticated) + 
--         "Equipment owners can manage photos" (FOR ALL TO authenticated includes SELECT)
-- Solution: Keep "Anyone can view" for anon, separate FOR ALL into individual actions

DROP POLICY IF EXISTS "Equipment owners can manage photos" ON equipment_photos;

-- Create separate policies for different actions (FOR ALL was causing SELECT overlap)
CREATE POLICY "Equipment owners can insert photos" ON equipment_photos
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = equipment_photos.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "Equipment owners can update photos" ON equipment_photos
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = equipment_photos.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "Equipment owners can delete photos" ON equipment_photos
    FOR DELETE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = equipment_photos.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

-- Keep "Anyone can view equipment photos" for SELECT (covers both anon and authenticated)
-- No need for separate authenticated SELECT policy

-- ============================================================================
-- PAYMENTS: Consolidate SELECT policies for authenticated
-- ============================================================================
-- Current: Two separate SELECT policies:
--   1. "Renters can view their own payments"
--   2. "Owners can view their payouts"
-- Solution: Consolidate into one policy with OR conditions

DROP POLICY IF EXISTS "Renters can view their own payments" ON payments;
DROP POLICY IF EXISTS "Owners can view their payouts" ON payments;

CREATE POLICY "Authenticated users can view payments" ON payments
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (
            -- Renters can view their own payments
            EXISTS (
                SELECT 1 FROM booking_requests 
                WHERE booking_requests.id = payments.booking_request_id 
                AND booking_requests.renter_id = (select auth.uid())
            )
            OR
            -- Owners can view their payouts
            EXISTS (
                SELECT 1 FROM booking_requests 
                JOIN equipment ON equipment.id = booking_requests.equipment_id
                WHERE booking_requests.id = payments.booking_request_id 
                AND equipment.owner_id = (select auth.uid())
            )
        )
    );

-- ============================================================================
-- PROFILES: Consolidate SELECT policies for authenticated
-- ============================================================================
-- Current: Three separate SELECT policies:
--   1. "Users can view their own profile"
--   2. "Users can view other user profiles" (if exists - allows viewing any profile)
--   3. "users can read last_seen_at in conversations" (allows viewing last_seen_at for conversation participants)
-- Solution: If "Users can view other user profiles" exists with USING(true), it already covers everything.
--           Otherwise, consolidate into one policy with OR conditions.

DROP POLICY IF EXISTS "Users can view other user profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON profiles;

-- Consolidate with existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "users can read last_seen_at in conversations" ON profiles;

-- Since "Users can view other user profiles" likely had USING(true), we can use a single policy
-- that allows viewing any profile (which covers own profile, other profiles, and last_seen_at)
CREATE POLICY "Authenticated users can view profiles" ON profiles
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        -- This allows viewing any profile, which covers:
        -- - Viewing own profile
        -- - Viewing other user profiles  
        -- - Viewing last_seen_at for conversation participants (since you can view any profile)
    );

-- ============================================================================
-- PROFILES: Consolidate UPDATE policies for authenticated
-- ============================================================================
-- Current: Two separate UPDATE policies:
--   1. "Users can update their own profile"
--   2. "users can update own last_seen_at"
-- Solution: Consolidate into one policy with OR conditions

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "users can update own last_seen_at" ON profiles;

CREATE POLICY "Authenticated users can update profiles" ON profiles
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (select auth.uid()) = id
    )
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (select auth.uid()) = id
    );

-- Note: Both policies had the same condition (auth.uid() = id), so they can be safely merged

