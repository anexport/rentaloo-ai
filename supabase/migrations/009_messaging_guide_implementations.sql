-- Implement missing features from MESSAGING_DB_GUIDE.md

-- 1. Add last_read_at column to conversation_participants for read receipts
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient read state queries
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read_at 
ON conversation_participants(conversation_id, profile_id, last_read_at);

-- 2. Create update_last_seen() RPC function (Section 4)
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_last_seen() TO authenticated;

-- 3. Create mark_conversation_read() RPC function (Section 5)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation
    AND profile_id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- 4. Create messaging_conversation_summaries view (Section 2)
CREATE OR REPLACE VIEW messaging_conversation_summaries AS
WITH latest_message AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    id AS message_id,
    sender_id,
    content,
    message_type,
    created_at
  FROM public.messages
  ORDER BY conversation_id, created_at DESC
),
unread AS (
  SELECT
    cp.conversation_id,
    cp.profile_id,
    COUNT(m.id) AS unread_count
  FROM public.conversation_participants cp
    JOIN public.messages m
      ON m.conversation_id = cp.conversation_id
      AND m.created_at > COALESCE(cp.last_read_at, cp.created_at)
      AND m.sender_id <> cp.profile_id
  GROUP BY cp.conversation_id, cp.profile_id
)
SELECT
  c.id,
  c.booking_request_id,
  c.created_at,
  c.updated_at,
  lm.message_id AS last_message_id,
  lm.sender_id AS last_message_sender_id,
  lm.content AS last_message_content,
  lm.message_type AS last_message_type,
  lm.created_at AS last_message_created_at,
  cp.profile_id AS participant_id,
  p.email AS participant_email,
  p.last_seen_at,
  br.status AS booking_status,
  br.start_date,
  br.end_date,
  br.total_amount,
  e.title AS equipment_title,
  COALESCE(u.unread_count, 0) AS unread_count
FROM public.conversations c
  JOIN public.conversation_participants cp ON cp.conversation_id = c.id
  JOIN public.profiles p ON p.id = cp.profile_id
  LEFT JOIN latest_message lm ON lm.conversation_id = c.id
  LEFT JOIN public.booking_requests br ON br.id = c.booking_request_id
  LEFT JOIN public.equipment e ON e.id = br.equipment_id
  LEFT JOIN unread u ON u.conversation_id = cp.conversation_id
    AND u.profile_id = cp.profile_id;

-- Grant select permission on view to authenticated users
GRANT SELECT ON messaging_conversation_summaries TO authenticated;

-- 5. Create composite index on messages(conversation_id, created_at) (Section 6)
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx 
ON messages(conversation_id, created_at);

-- 6. Add RLS policy to allow users to update their own last_read_at
DROP POLICY IF EXISTS "users can update own last_read_at" ON conversation_participants;
CREATE POLICY "users can update own last_read_at"
ON conversation_participants
FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

