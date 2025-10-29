-- Insert sample categories for the equipment rental marketplace
INSERT INTO categories (id, name, parent_id, sport_type, attributes, created_at, updated_at) VALUES
-- Winter Sports
('550e8400-e29b-41d4-a716-446655440001', 'Skiing', NULL, 'winter', '{"equipment_types": ["skis", "poles", "boots", "bindings"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Snowboarding', NULL, 'winter', '{"equipment_types": ["snowboards", "boots", "bindings", "helmets"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Ice Skating', NULL, 'winter', '{"equipment_types": ["skates", "helmets", "protective_gear"]}', NOW(), NOW()),

-- Water Sports
('550e8400-e29b-41d4-a716-446655440004', 'Surfing', NULL, 'water', '{"equipment_types": ["surfboards", "wetsuits", "leashes", "wax"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Kayaking', NULL, 'water', '{"equipment_types": ["kayaks", "paddles", "life_jackets", "dry_bags"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440006', 'Scuba Diving', NULL, 'water', '{"equipment_types": ["bcd", "regulator", "wetsuit", "fins", "mask"]}', NOW(), NOW()),

-- Land Sports
('550e8400-e29b-41d4-a716-446655440007', 'Cycling', NULL, 'land', '{"equipment_types": ["bikes", "helmets", "repair_kits", "lights"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440008', 'Hiking', NULL, 'land', '{"equipment_types": ["backpacks", "tents", "sleeping_bags", "hiking_boots"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440009', 'Rock Climbing', NULL, 'land', '{"equipment_types": ["ropes", "harnesses", "shoes", "helmets", "belay_devices"]}', NOW(), NOW()),

-- Team Sports
('550e8400-e29b-41d4-a716-446655440010', 'Soccer', NULL, 'team', '{"equipment_types": ["cleats", "shin_guards", "soccer_balls", "goals"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440011', 'Basketball', NULL, 'team', '{"equipment_types": ["basketballs", "hoops", "jerseys", "shoes"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440012', 'Tennis', NULL, 'team', '{"equipment_types": ["rackets", "tennis_balls", "court_equipment", "shoes"]}', NOW(), NOW()),

-- Fitness & Training
('550e8400-e29b-41d4-a716-446655440013', 'Weight Training', NULL, 'fitness', '{"equipment_types": ["weights", "barbells", "dumbbells", "benches"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440014', 'Cardio Equipment', NULL, 'fitness', '{"equipment_types": ["treadmills", "bikes", "ellipticals", "rowers"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440015', 'Yoga & Pilates', NULL, 'fitness', '{"equipment_types": ["mats", "blocks", "straps", "bolsters"]}', NOW(), NOW()),

-- Outdoor Recreation
('550e8400-e29b-41d4-a716-446655440016', 'Camping', NULL, 'outdoor', '{"equipment_types": ["tents", "sleeping_bags", "camping_stoves", "coolers"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440017', 'Fishing', NULL, 'outdoor', '{"equipment_types": ["rods", "reels", "tackle", "bait", "coolers"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440018', 'Photography', NULL, 'outdoor', '{"equipment_types": ["cameras", "lenses", "tripods", "filters", "bags"]}', NOW(), NOW()),

-- Subcategories for Skiing
('550e8400-e29b-41d4-a716-446655440019', 'Alpine Skis', '550e8400-e29b-41d4-a716-446655440001', 'winter', '{"skill_levels": ["beginner", "intermediate", "advanced"], "terrain": ["groomed", "powder", "all_mountain"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440020', 'Cross-Country Skis', '550e8400-e29b-41d4-a716-446655440001', 'winter', '{"skill_levels": ["beginner", "intermediate", "advanced"], "terrain": ["groomed", "backcountry"]}', NOW(), NOW()),

-- Subcategories for Cycling
('550e8400-e29b-41d4-a716-446655440021', 'Road Bikes', '550e8400-e29b-41d4-a716-446655440007', 'land', '{"skill_levels": ["beginner", "intermediate", "advanced"], "terrain": ["pavement", "smooth_roads"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440022', 'Mountain Bikes', '550e8400-e29b-41d4-a716-446655440007', 'land', '{"skill_levels": ["beginner", "intermediate", "advanced"], "terrain": ["trails", "off_road", "technical"]}', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440023', 'Electric Bikes', '550e8400-e29b-41d4-a716-446655440007', 'land', '{"skill_levels": ["beginner", "intermediate", "advanced"], "terrain": ["all_terrain"], "battery_life": "varies"}', NOW(), NOW());
