-- Fix conversation_participants.created_at to be NOT NULL
-- This migration backfills any existing NULL values and enforces the constraint

-- Step 1: Backfill any existing NULL created_at values
-- Use NOW() for new-looking records, or a sensible historical date (e.g., 1 year ago)
-- for records that might have been created before proper timestamp tracking
UPDATE conversation_participants
SET created_at = COALESCE(
  created_at,
  NOW()
)
WHERE created_at IS NULL;

-- Step 2: Enforce NOT NULL constraint
ALTER TABLE conversation_participants
ALTER COLUMN created_at SET NOT NULL;

-- Step 3: Ensure default is set (should already be set, but ensure it)
ALTER TABLE conversation_participants
ALTER COLUMN created_at SET DEFAULT NOW();

