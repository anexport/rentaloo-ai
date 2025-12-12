-- Insert example users and equipment for testing
-- This script creates sample data to demonstrate the application

-- First, let's get some category IDs to use
-- We'll use the categories we created earlier

-- Insert example profiles (users)
INSERT INTO profiles (id, email, role, created_at, updated_at) VALUES
-- Owner profiles
('550e8400-e29b-41d4-a716-446655440100', 'john.smith@example.com', 'owner', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440101', 'sarah.jones@example.com', 'owner', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440102', 'mike.wilson@example.com', 'owner', NOW(), NOW()),

-- Renter profiles
('550e8400-e29b-41d4-a716-446655440200', 'alex.brown@example.com', 'renter', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440201', 'emma.davis@example.com', 'renter', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440202', 'james.miller@example.com', 'renter', NOW(), NOW());

-- Insert owner profiles
INSERT INTO owner_profiles (id, profile_id, business_info, earnings_total, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440100', '{"business_name": "Mountain Gear Rentals", "description": "Professional outdoor equipment rental service"}', 1250.00, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440101', '{"business_name": "Ski & Snowboard Central", "description": "Premium winter sports equipment"}', 890.50, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440102', '{"business_name": "Adventure Equipment Co", "description": "Quality gear for outdoor enthusiasts"}', 2100.75, NOW(), NOW());

-- Insert renter profiles
INSERT INTO renter_profiles (id, profile_id, experience_level, preferences, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440200', 'intermediate', '{"favorite_activities": ["skiing", "snowboarding"], "preferred_conditions": ["powder", "groomed"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440201', 'beginner', '{"favorite_activities": ["hiking", "camping"], "preferred_conditions": ["dry", "sunny"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440202', 'expert', '{"favorite_activities": ["climbing", "mountaineering"], "preferred_conditions": ["challenging", "technical"]}', NOW(), NOW());

-- Insert example equipment
INSERT INTO equipment (id, owner_id, category_id, title, description, daily_rate, condition, location, latitude, longitude, is_available, created_at, updated_at) VALUES
-- Skiing equipment
('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440001', 'Rossignol Hero Elite Skis', 'Professional-grade all-mountain skis perfect for intermediate to advanced skiers. Excellent condition with recent tune-up.', 45.00, 'excellent', 'Denver, CO', 39.7392, -104.9903, true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440001', 'Atomic Hawx Prime 120 Boots', 'High-performance ski boots with excellent fit and comfort. Size 28.5, perfect for aggressive skiing.', 25.00, 'excellent', 'Denver, CO', 39.7392, -104.9903, true, NOW(), NOW()),

-- Snowboarding equipment
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440002', 'Burton Custom Snowboard', 'Classic all-mountain snowboard, great for riders of all levels. 158cm length, excellent condition.', 50.00, 'excellent', 'Aspen, CO', 39.1911, -106.8175, true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440002', 'Union Force Bindings', 'High-quality bindings with excellent response and comfort. Size M/L, fits most boots.', 20.00, 'good', 'Aspen, CO', 39.1911, -106.8175, true, NOW(), NOW()),

-- Climbing equipment
('550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440003', 'Black Diamond Camalot C4 Set', 'Complete set of camming devices for trad climbing. Sizes 0.5-4, excellent condition.', 35.00, 'excellent', 'Boulder, CO', 40.0150, -105.2705, true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440505', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440003', 'Petzl Grigri 2 Belay Device', 'Auto-locking belay device for sport climbing. Excellent safety features and smooth operation.', 15.00, 'excellent', 'Boulder, CO', 40.0150, -105.2705, true, NOW(), NOW()),

-- Hiking equipment
('550e8400-e29b-41d4-a716-446655440506', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440004', 'Osprey Atmos 65 Backpack', 'Lightweight hiking backpack with excellent ventilation. 65L capacity, perfect for multi-day trips.', 30.00, 'good', 'Denver, CO', 39.7392, -104.9903, true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440507', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440004', 'MSR Hubba Hubba NX Tent', 'Lightweight 2-person tent perfect for backpacking. Easy setup and excellent weather protection.', 40.00, 'excellent', 'Denver, CO', 39.7392, -104.9903, true, NOW(), NOW()),

-- Cycling equipment
('550e8400-e29b-41d4-a716-446655440508', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440005', 'Trek Fuel EX 8 Mountain Bike', 'Full-suspension mountain bike perfect for trail riding. 29" wheels, excellent condition.', 75.00, 'excellent', 'Aspen, CO', 39.1911, -106.8175, true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440509', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440005', 'Specialized Roubaix Road Bike', 'Endurance road bike with smooth ride quality. Perfect for long distance cycling.', 60.00, 'good', 'Boulder, CO', 40.0150, -105.2705, true, NOW(), NOW());

-- Insert some example booking requests
INSERT INTO booking_requests (id, renter_id, equipment_id, start_date, end_date, total_amount, status, message, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440500', '2024-12-01', '2024-12-03', 94.50, 'pending', 'Looking forward to trying these skis on the slopes!', NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440502', '2024-12-05', '2024-12-07', 105.00, 'approved', 'First time snowboarding, excited to learn!', NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440504', '2024-12-10', '2024-12-12', 73.50, 'pending', 'Planning a trad climbing trip in Eldorado Canyon', NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440508', '2024-12-15', '2024-12-17', 157.50, 'declined', 'Need a bike for weekend trail riding', NOW(), NOW());

-- Insert corresponding bookings for approved requests
INSERT INTO bookings (id, booking_request_id, payment_status, pickup_method, return_status, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440700', '550e8400-e29b-41d4-a716-446655440601', 'completed', 'pickup', 'returned', NOW(), NOW());

