-- Add alt and description columns to equipment_photos table
-- These fields provide accessibility and metadata for equipment photos

ALTER TABLE equipment_photos
ADD COLUMN alt TEXT,
ADD COLUMN description TEXT;

COMMENT ON COLUMN equipment_photos.alt IS 'Accessibility text for the photo (used in img alt attribute)';
COMMENT ON COLUMN equipment_photos.description IS 'Optional description of the photo content';

