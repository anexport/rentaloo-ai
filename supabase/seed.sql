-- Insert sample categories
INSERT INTO categories (id, name, sport_type, attributes) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Hiking & Backpacking', 'Hiking', '{"gear_type": "backpacking", "season": "all"}'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Rock Climbing', 'Climbing', '{"gear_type": "safety", "season": "all"}'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Skiing & Snowboarding', 'Winter Sports', '{"gear_type": "winter", "season": "winter"}'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Mountain Biking', 'Cycling', '{"gear_type": "cycling", "season": "all"}'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Camping', 'Outdoor', '{"gear_type": "shelter", "season": "all"}'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Water Sports', 'Water', '{"gear_type": "water", "season": "summer"}');

-- Insert sample profiles (these would normally be created through Supabase Auth)
-- Note: In a real scenario, these would be created when users sign up
INSERT INTO profiles (id, email, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'renter@example.com', 'renter'),
    ('22222222-2222-2222-2222-222222222222', 'owner@example.com', 'owner'),
    ('33333333-3333-3333-3333-333333333333', 'owner2@example.com', 'owner');

-- Insert sample renter profile
INSERT INTO renter_profiles (profile_id, experience_level, verification_status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'intermediate', 'verified');

-- Insert sample owner profiles
INSERT INTO owner_profiles (profile_id, business_info, earnings_total, verification_level) VALUES
    ('22222222-2222-2222-2222-222222222222', '{"business_name": "Mountain Gear Rentals", "description": "Professional outdoor equipment rental service"}', 2500.00, 'verified'),
    ('33333333-3333-3333-3333-333333333333', '{"business_name": "Bay Area Adventures", "description": "Local outdoor equipment sharing"}', 1800.00, 'verified');

-- Insert sample equipment
INSERT INTO equipment (id, owner_id, category_id, title, description, daily_rate, condition, location, latitude, longitude) VALUES
    ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440001', 'Professional Hiking Backpack 65L', 'High-quality 65L backpack perfect for multi-day hiking trips. Features multiple compartments, hydration system compatibility, and comfortable suspension system.', 25.00, 'excellent', 'San Francisco, CA', 37.7749, -122.4194),
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440002', 'Rock Climbing Harness', 'Comfortable and safe climbing harness for all skill levels. Includes gear loops and adjustable leg loops.', 15.00, 'excellent', 'San Francisco, CA', 37.7749, -122.4194),
    ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440004', 'Mountain Bike - Full Suspension', 'Full-suspension mountain bike perfect for trail riding. 27.5" wheels, hydraulic disc brakes, and 21-speed drivetrain.', 45.00, 'good', 'Oakland, CA', 37.8044, -122.2712),
    ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440005', '4-Person Camping Tent', 'Spacious 4-person tent with rainfly and ground tarp. Easy setup and weather-resistant materials.', 20.00, 'excellent', 'Berkeley, CA', 37.8715, -122.2730),
    ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440003', 'Ski Boots - Size 10', 'Professional ski boots in excellent condition. Heat-moldable liners and adjustable buckles.', 30.00, 'excellent', 'San Francisco, CA', 37.7749, -122.4194);

-- Insert sample equipment photos
INSERT INTO equipment_photos (equipment_id, photo_url, is_primary, order_index) VALUES
    ('44444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400', true, 0),
    ('44444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400', false, 1),
    ('55555555-5555-5555-5555-555555555555', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400', true, 0),
    ('66666666-6666-6666-6666-666666666666', 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', true, 0),
    ('77777777-7777-7777-7777-777777777777', 'https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=400', true, 0),
    ('88888888-8888-8888-8888-888888888888', 'https://images.unsplash.com/photo-1551524164-6cf2ac531f82?w=400', true, 0);

-- Insert sample availability calendar (next 30 days)
INSERT INTO availability_calendar (equipment_id, date, is_available)
SELECT 
    e.id,
    CURRENT_DATE + INTERVAL '1 day' * generate_series(0, 29),
    CASE 
        WHEN random() > 0.2 THEN true  -- 80% chance of being available
        ELSE false
    END
FROM equipment e;

-- Insert sample booking requests
INSERT INTO booking_requests (id, equipment_id, renter_id, start_date, end_date, total_amount, status, message) VALUES
    ('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '5 days', 50.00, 'pending', 'Looking forward to this hiking trip!'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days', 15.00, 'approved', 'Need for indoor climbing session');

-- Insert sample bookings
INSERT INTO bookings (booking_request_id, payment_status, pickup_method) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'completed', 'pickup');

-- Insert sample reviews
INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment) VALUES
    ((SELECT id FROM bookings WHERE booking_request_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 5, 'Great harness, very comfortable and secure. Owner was very helpful with setup instructions.');

-- Insert sample conversations
INSERT INTO conversations (id, booking_request_id, participants) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', ARRAY['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']);

-- Insert sample messages
INSERT INTO messages (conversation_id, sender_id, content) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Hi! I''m interested in renting your hiking backpack. Is it available for this weekend?'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Yes, it''s available! The backpack is in excellent condition and ready for your trip.');



