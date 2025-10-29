-- Fix RLS policies for messaging and booking functionality

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view their own booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Equipment owners can view requests for their equipment" ON booking_requests;
DROP POLICY IF EXISTS "Renters can create booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Equipment owners can update booking requests for their equipment" ON booking_requests;

-- Recreate booking request policies with proper permissions
CREATE POLICY "Users can view their own booking requests" ON booking_requests
    FOR SELECT USING (auth.uid() = renter_id);

CREATE POLICY "Equipment owners can view requests for their equipment" ON booking_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = booking_requests.equipment_id 
            AND equipment.owner_id = auth.uid()
        )
    );

CREATE POLICY "Renters can create booking requests" ON booking_requests
    FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Equipment owners can update booking requests for their equipment" ON booking_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = booking_requests.equipment_id 
            AND equipment.owner_id = auth.uid()
        )
    );

-- Drop existing conversation and message policies that might conflict
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can delete conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can update messages they sent" ON messages;
DROP POLICY IF EXISTS "Users can delete messages they sent" ON messages;

-- Add missing policies for conversations and messages
CREATE POLICY "Users can update conversations they participate in" ON conversations
    FOR UPDATE USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can delete conversations they participate in" ON conversations
    FOR DELETE USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can update messages they sent" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete messages they sent" ON messages
    FOR DELETE USING (auth.uid() = sender_id);

-- Add policy to allow users to view equipment details for booking
CREATE POLICY "Users can view equipment details for booking" ON equipment
    FOR SELECT USING (true);

-- Add policy to allow users to view profiles of other users in conversations
CREATE POLICY "Users can view profiles of conversation participants" ON profiles
    FOR SELECT USING (true);

-- Add policy to allow users to view equipment photos for booking
CREATE POLICY "Users can view equipment photos for booking" ON equipment_photos
    FOR SELECT USING (true);

-- Add policy to allow users to view categories for booking
CREATE POLICY "Users can view categories for booking" ON categories
    FOR SELECT USING (true);

-- Add policy to allow users to view availability calendar for booking
CREATE POLICY "Users can view availability calendar for booking" ON availability_calendar
    FOR SELECT USING (true);

-- Add policy to allow users to view booking requests for equipment they're booking
CREATE POLICY "Users can view booking requests for equipment they're viewing" ON booking_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = booking_requests.equipment_id 
            AND equipment.is_available = true
        )
    );

-- Add policy to allow users to view their own bookings
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            WHERE booking_requests.id = bookings.booking_request_id 
            AND booking_requests.renter_id = auth.uid()
        )
    );

-- Add policy to allow equipment owners to view bookings for their equipment
CREATE POLICY "Equipment owners can view bookings for their equipment" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            JOIN equipment ON equipment.id = booking_requests.equipment_id
            WHERE booking_requests.id = bookings.booking_request_id 
            AND equipment.owner_id = auth.uid()
        )
    );

-- Add policy to allow system to create bookings
CREATE POLICY "System can create bookings" ON bookings
    FOR INSERT WITH CHECK (true);

-- Add policy to allow users to update their own bookings
CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            WHERE booking_requests.id = bookings.booking_request_id 
            AND booking_requests.renter_id = auth.uid()
        )
    );

-- Add policy to allow equipment owners to update bookings for their equipment
CREATE POLICY "Equipment owners can update bookings for their equipment" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            JOIN equipment ON equipment.id = booking_requests.equipment_id
            WHERE booking_requests.id = bookings.booking_request_id 
            AND equipment.owner_id = auth.uid()
        )
    );
