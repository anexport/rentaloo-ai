-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE renter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Renter profiles policies
CREATE POLICY "Users can view their own renter profile" ON renter_profiles
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own renter profile" ON renter_profiles
    FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own renter profile" ON renter_profiles
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Owner profiles policies
CREATE POLICY "Users can view their own owner profile" ON owner_profiles
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own owner profile" ON owner_profiles
    FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own owner profile" ON owner_profiles
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Categories policies (public read access)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- Equipment policies
CREATE POLICY "Anyone can view available equipment" ON equipment
    FOR SELECT USING (is_available = true);

CREATE POLICY "Owners can view their own equipment" ON equipment
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own equipment" ON equipment
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own equipment" ON equipment
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own equipment" ON equipment
    FOR DELETE USING (auth.uid() = owner_id);

-- Equipment photos policies
CREATE POLICY "Anyone can view equipment photos" ON equipment_photos
    FOR SELECT USING (true);

CREATE POLICY "Equipment owners can manage photos" ON equipment_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = equipment_photos.equipment_id 
            AND equipment.owner_id = auth.uid()
        )
    );

-- Availability calendar policies
CREATE POLICY "Anyone can view availability calendar" ON availability_calendar
    FOR SELECT USING (true);

CREATE POLICY "Equipment owners can manage availability" ON availability_calendar
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM equipment 
            WHERE equipment.id = availability_calendar.equipment_id 
            AND equipment.owner_id = auth.uid()
        )
    );

-- Booking requests policies
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

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            WHERE booking_requests.id = bookings.booking_request_id 
            AND booking_requests.renter_id = auth.uid()
        )
    );

CREATE POLICY "Equipment owners can view bookings for their equipment" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            JOIN equipment ON equipment.id = booking_requests.equipment_id
            WHERE booking_requests.id = bookings.booking_request_id 
            AND equipment.owner_id = auth.uid()
        )
    );

CREATE POLICY "System can create bookings" ON bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM booking_requests 
            WHERE booking_requests.id = bookings.booking_request_id 
            AND booking_requests.renter_id = auth.uid()
        )
    );

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their bookings" ON reviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings 
            JOIN booking_requests ON booking_requests.id = bookings.booking_request_id
            WHERE bookings.id = reviews.booking_id 
            AND booking_requests.renter_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND auth.uid() = ANY(conversations.participants)
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND auth.uid() = ANY(conversations.participants)
        )
    );

-- User verifications policies
CREATE POLICY "Users can view their own verifications" ON user_verifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verifications" ON user_verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications" ON user_verifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create a function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM profiles 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is equipment owner
CREATE OR REPLACE FUNCTION is_equipment_owner(equipment_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT EXISTS (
            SELECT 1 FROM equipment 
            WHERE id = equipment_id 
            AND owner_id = user_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



