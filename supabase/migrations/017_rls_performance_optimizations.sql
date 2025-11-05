-- Migration: RLS Performance Optimizations
-- This migration fixes two critical performance issues identified by Supabase linter:
-- 1. Auth RLS Initialization Plan: Wrap auth.uid() in subqueries to prevent re-evaluation
-- 2. Multiple Permissive Policies: Consolidate overlapping policies where possible
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- PART 1: Fix Auth RLS Initialization Plan Issues
-- Replace all auth.uid() calls with (select auth.uid()) to optimize performance
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Renter profiles policies
DROP POLICY IF EXISTS "Users can view their own renter profile" ON renter_profiles;
CREATE POLICY "Users can view their own renter profile" ON renter_profiles
    FOR SELECT USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update their own renter profile" ON renter_profiles;
CREATE POLICY "Users can update their own renter profile" ON renter_profiles
    FOR UPDATE USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can insert their own renter profile" ON renter_profiles;
CREATE POLICY "Users can insert their own renter profile" ON renter_profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = profile_id);

-- Owner profiles policies
DROP POLICY IF EXISTS "Users can view their own owner profile" ON owner_profiles;
CREATE POLICY "Users can view their own owner profile" ON owner_profiles
    FOR SELECT USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update their own owner profile" ON owner_profiles;
CREATE POLICY "Users can update their own owner profile" ON owner_profiles
    FOR UPDATE USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can insert their own owner profile" ON owner_profiles;
CREATE POLICY "Users can insert their own owner profile" ON owner_profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = profile_id);

-- Equipment policies
DROP POLICY IF EXISTS "Owners can view their own equipment" ON equipment;
CREATE POLICY "Owners can view their own equipment" ON equipment
    FOR SELECT USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can insert their own equipment" ON equipment;
CREATE POLICY "Owners can insert their own equipment" ON equipment
    FOR INSERT WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can update their own equipment" ON equipment;
CREATE POLICY "Owners can update their own equipment" ON equipment
    FOR UPDATE USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can delete their own equipment" ON equipment;
CREATE POLICY "Owners can delete their own equipment" ON equipment
    FOR DELETE USING ((select auth.uid()) = owner_id);

-- Equipment photos policies
DROP POLICY IF EXISTS "Equipment owners can manage photos" ON equipment_photos;
CREATE POLICY "Equipment owners can manage photos" ON equipment_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = equipment_photos.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

-- Availability calendar policies
DROP POLICY IF EXISTS "Equipment owners can manage availability" ON availability_calendar;
CREATE POLICY "Equipment owners can manage availability" ON availability_calendar
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = availability_calendar.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

-- Booking requests policies
DROP POLICY IF EXISTS "Users can view their own booking requests" ON booking_requests;
CREATE POLICY "Users can view their own booking requests" ON booking_requests
    FOR SELECT USING ((select auth.uid()) = renter_id);

DROP POLICY IF EXISTS "Equipment owners can view requests for their equipment" ON booking_requests;
CREATE POLICY "Equipment owners can view requests for their equipment" ON booking_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = booking_requests.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Renters can create booking requests" ON booking_requests;
CREATE POLICY "Renters can create booking requests" ON booking_requests
    FOR INSERT WITH CHECK ((select auth.uid()) = renter_id);

DROP POLICY IF EXISTS "Equipment owners can update booking requests for their equipment" ON booking_requests;
CREATE POLICY "Equipment owners can update booking requests for their equipment" ON booking_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = booking_requests.equipment_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Renters can cancel their own booking requests" ON booking_requests;
CREATE POLICY "Renters can cancel their own booking requests" ON booking_requests
    FOR UPDATE USING ((select auth.uid()) = renter_id);

-- Bookings policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            WHERE booking_requests.id = bookings.booking_request_id 
            AND booking_requests.renter_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Equipment owners can view bookings for their equipment" ON bookings;
CREATE POLICY "Equipment owners can view bookings for their equipment" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            JOIN equipment ON equipment.id = booking_requests.equipment_id
            WHERE booking_requests.id = bookings.booking_request_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            WHERE booking_requests.id = bookings.booking_request_id 
            AND booking_requests.renter_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Equipment owners can update bookings for their equipment" ON bookings;
CREATE POLICY "Equipment owners can update bookings for their equipment" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            JOIN equipment ON equipment.id = booking_requests.equipment_id
            WHERE booking_requests.id = bookings.booking_request_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

-- Payments policies
DROP POLICY IF EXISTS "Renters can view their own payments" ON payments;
CREATE POLICY "Renters can view their own payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            WHERE booking_requests.id = payments.booking_request_id 
            AND booking_requests.renter_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Owners can view their payouts" ON payments;
CREATE POLICY "Owners can view their payouts" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            JOIN equipment ON equipment.id = booking_requests.equipment_id
            WHERE booking_requests.id = payments.booking_request_id 
            AND equipment.owner_id = (select auth.uid())
        )
    );

-- Reviews policies
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON reviews;
CREATE POLICY "Users can create reviews for their bookings" ON reviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings 
            JOIN booking_requests ON booking_requests.id = bookings.booking_request_id
            WHERE bookings.id = reviews.booking_id 
            AND booking_requests.renter_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING ((select auth.uid()) = reviewer_id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING ((select auth.uid()) = ANY(participants));

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK ((select auth.uid()) = ANY(participants));

DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;
CREATE POLICY "Users can update conversations they participate in" ON conversations
    FOR UPDATE USING ((select auth.uid()) = ANY(participants));

DROP POLICY IF EXISTS "Users can delete conversations they participate in" ON conversations;
CREATE POLICY "Users can delete conversations they participate in" ON conversations
    FOR DELETE USING ((select auth.uid()) = ANY(participants));

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (select auth.uid()) = ANY(conversations.participants)
        )
    );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        (select auth.uid()) = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (select auth.uid()) = ANY(conversations.participants)
        )
    );

DROP POLICY IF EXISTS "Users can update messages they sent" ON messages;
CREATE POLICY "Users can update messages they sent" ON messages
    FOR UPDATE USING ((select auth.uid()) = sender_id);

DROP POLICY IF EXISTS "Users can delete messages they sent" ON messages;
CREATE POLICY "Users can delete messages they sent" ON messages
    FOR DELETE USING ((select auth.uid()) = sender_id);

-- User verifications policies
DROP POLICY IF EXISTS "Users can view their own verifications" ON user_verifications;
CREATE POLICY "Users can view their own verifications" ON user_verifications
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own verifications" ON user_verifications;
CREATE POLICY "Users can create their own verifications" ON user_verifications
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own verifications" ON user_verifications;
CREATE POLICY "Users can update their own verifications" ON user_verifications
    FOR UPDATE USING ((select auth.uid()) = user_id);

-- Conversation participants policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_participants.conversation_id
            AND (select auth.uid()) = ANY(conversations.participants)
        )
    );

DROP POLICY IF EXISTS "Users can add participants to conversations they are in" ON conversation_participants;
CREATE POLICY "Users can add participants to conversations they are in" ON conversation_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_participants.conversation_id
            AND (select auth.uid()) = ANY(conversations.participants)
        )
    );

DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON conversation_participants;
CREATE POLICY "Users can remove themselves from conversations" ON conversation_participants
    FOR DELETE USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "users can update own last_read_at" ON conversation_participants;
CREATE POLICY "users can update own last_read_at" ON conversation_participants
    FOR UPDATE USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

-- Profiles - presence tracking policies
DROP POLICY IF EXISTS "users can update own last_seen_at" ON profiles;
CREATE POLICY "users can update own last_seen_at" ON profiles
    FOR UPDATE USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "users can read last_seen_at in conversations" ON profiles;
CREATE POLICY "users can read last_seen_at in conversations" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM conversation_participants cp1
            JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.profile_id = (select auth.uid())
              AND cp2.profile_id = profiles.id
        )
        OR (select auth.uid()) = id
    );

-- Note: "Users can view profiles of conversation participants" policy uses USING (true)
-- so it doesn't need auth.uid() optimization, but it's kept for completeness
-- This policy is intentionally separate for logical clarity

-- Booking history policies
DROP POLICY IF EXISTS "Users can view their own booking history" ON booking_history;
CREATE POLICY "Users can view their own booking history" ON booking_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests
            WHERE booking_requests.id = booking_history.booking_request_id
            AND booking_requests.renter_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM booking_requests br
            JOIN equipment e ON br.equipment_id = e.id
            WHERE br.id = booking_history.booking_request_id
            AND e.owner_id = (select auth.uid())
        )
    );

-- Realtime messages policies
DROP POLICY IF EXISTS "allow messaging topics" ON realtime.messages;
CREATE POLICY "allow messaging topics" ON realtime.messages
    FOR SELECT USING (
        (
            split_part(topic, ':', 1) = 'room'
            AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND EXISTS (
                SELECT 1
                FROM public.conversation_participants cp
                WHERE cp.conversation_id = split_part(topic, ':', 2)::uuid
                  AND cp.profile_id = (select auth.uid())
            )
        )
        OR (
            split_part(topic, ':', 1) = 'user'
            AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND split_part(topic, ':', 2)::uuid = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "authenticated can send typing events" ON realtime.messages;
CREATE POLICY "authenticated can send typing events" ON realtime.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        split_part(topic, ':', 1) = 'room'
        AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
            SELECT 1
            FROM public.conversation_participants cp
            WHERE cp.conversation_id = split_part(topic, ':', 2)::uuid
              AND cp.profile_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "authenticated can track presence" ON realtime.messages;
CREATE POLICY "authenticated can track presence" ON realtime.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        realtime.messages.extension = 'presence'
        AND (
            split_part(topic, ':', 1) = 'presence'
            OR (
                split_part(topic, ':', 1) = 'room'
                AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND EXISTS (
                    SELECT 1
                    FROM public.conversation_participants cp
                    WHERE cp.conversation_id = split_part(topic, ':', 2)::uuid
                      AND cp.profile_id = (select auth.uid())
                )
            )
        )
    );

DROP POLICY IF EXISTS "authenticated can receive presence" ON realtime.messages;
CREATE POLICY "authenticated can receive presence" ON realtime.messages
    FOR SELECT TO authenticated
    USING (
        realtime.messages.extension = 'presence'
        AND (
            split_part(topic, ':', 1) = 'presence'
            OR (
                split_part(topic, ':', 1) = 'room'
                AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND EXISTS (
                    SELECT 1
                    FROM conversation_participants cp
                    WHERE cp.conversation_id = split_part(topic, ':', 2)::uuid
                      AND cp.profile_id = (select auth.uid())
                )
            )
        )
    );

-- ============================================================================
-- PART 2: Consolidate Multiple Permissive Policies
-- Combine overlapping policies where possible to improve performance
-- ============================================================================

-- Profiles: Consolidate SELECT policies
-- Note: We keep separate policies for logical clarity but they're now optimized
-- The policies "Users can view their own profile", "Users can view other user profiles", 
-- and "users can read last_seen_at in conversations" are intentionally separate for security

-- Equipment: Consolidate SELECT policies
-- The "Users can view all equipment for booking" policy already covers public viewing
-- We can drop the redundant "Users can view equipment details for booking" if it exists
DROP POLICY IF EXISTS "Users can view equipment details for booking" ON equipment;
-- The existing "Anyone can view available equipment" covers public access
-- The "Owners can view their own equipment" covers owner access
-- These remain separate as they serve different purposes

-- Booking requests: Consolidate SELECT policies
-- The policy "Users can view booking requests for equipment they're viewing" is redundant
-- as it overlaps with other policies. We'll keep the more specific ones.
-- Note: The existing policies are logically distinct and needed for different access patterns

-- Bookings: Policies are already optimized - each serves a distinct purpose

-- Payments: Policies are already optimized - each serves a distinct purpose

-- Equipment photos: Policies are already optimized
-- "Anyone can view equipment photos" covers public access
-- "Equipment owners can manage photos" covers owner management

-- Availability calendar: Policies are already optimized
-- "Anyone can view availability calendar" covers public access
-- "Equipment owners can manage availability" covers owner management

-- Note on consolidation: While we could combine some policies using OR conditions,
-- keeping them separate provides better security auditing and clearer intent.
-- The main performance gain comes from fixing the auth.uid() calls, which is done above.

