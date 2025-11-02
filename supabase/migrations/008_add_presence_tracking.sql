-- Add presence tracking to profiles table
-- Add last_seen_at column for tracking when users were last active

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries on last_seen_at
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON profiles(last_seen_at);

-- Add RLS policy for presence tracking
-- Allow users to update their own last_seen_at
DROP POLICY IF EXISTS "users can update own last_seen_at" ON profiles;
CREATE POLICY "users can update own last_seen_at"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add RLS policy to allow reading last_seen_at for other users
-- This is needed for showing "last seen" status in conversations
DROP POLICY IF EXISTS "users can read last_seen_at in conversations" ON profiles;
CREATE POLICY "users can read last_seen_at in conversations"
ON profiles
FOR SELECT
USING (
  -- Allow reading if user is in a conversation with the profile
  EXISTS (
    SELECT 1
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.profile_id = auth.uid()
      AND cp2.profile_id = profiles.id
  )
  OR auth.uid() = id -- Users can always see their own last_seen_at
);

-- Update RLS policy for realtime.messages to allow typing channels
-- Allow authenticated users to send/receive typing events on conversation channels
DROP POLICY IF EXISTS "allow messaging topics" ON realtime.messages;
CREATE POLICY "allow messaging topics" ON realtime.messages
FOR SELECT
USING (
  (
    split_part(topic, ':', 1) = 'room'
    AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = split_part(topic, ':', 2)::uuid
        AND cp.profile_id = auth.uid()
    )
  )
  OR (
    split_part(topic, ':', 1) = 'user'
    AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND split_part(topic, ':', 2)::uuid = auth.uid()
  )
);

-- Allow authenticated users to insert typing events
DROP POLICY IF EXISTS "authenticated can send typing events" ON realtime.messages;
CREATE POLICY "authenticated can send typing events"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  split_part(topic, ':', 1) = 'room'
  AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = split_part(topic, ':', 2)::uuid
      AND cp.profile_id = auth.uid()
  )
);

-- Add RLS policy for presence channels in realtime.messages
-- Allow authenticated users to track presence on global presence channel
DROP POLICY IF EXISTS "authenticated can track presence" ON realtime.messages;
CREATE POLICY "authenticated can track presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.messages.extension = 'presence'
  AND (
    split_part(topic, ':', 1) = 'presence'
    OR split_part(topic, ':', 1) = 'room'
  )
);

-- Allow authenticated users to receive presence updates
DROP POLICY IF EXISTS "authenticated can receive presence" ON realtime.messages;
CREATE POLICY "authenticated can receive presence"
ON realtime.messages
FOR SELECT
TO authenticated
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
          AND cp.profile_id = auth.uid()
      )
    )
  )
);

