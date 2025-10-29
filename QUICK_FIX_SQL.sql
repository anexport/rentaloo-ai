-- =====================================================
-- QUICK FIX FOR: Infinite recursion error
-- Run this SQL in Supabase Dashboard → SQL Editor
-- =====================================================

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they create" ON conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON conversation_participants;

-- Create a security definer function to check if user is in a conversation
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND profile_id = user_id
  );
$$;

-- Policy: Users can view participants of conversations they are part of
CREATE POLICY "Users can view participants of their conversations"
ON conversation_participants
FOR SELECT
USING (
  is_conversation_participant(conversation_id, auth.uid())
);

-- Policy: Users can insert participants when they are part of the conversation
CREATE POLICY "Users can add participants to conversations they are in"
ON conversation_participants
FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
  OR
  is_conversation_participant(conversation_id, auth.uid())
);

-- Policy: Users can remove themselves from conversations
CREATE POLICY "Users can remove themselves from conversations"
ON conversation_participants
FOR DELETE
USING (
  profile_id = auth.uid()
);

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION is_conversation_participant(UUID, UUID) TO authenticated;

-- =====================================================
-- After running this:
-- 1. Refresh your browser (Cmd/Ctrl + Shift + R)
-- 2. Try loading the messages page again
-- 3. Should work without infinite recursion error!
-- =====================================================


