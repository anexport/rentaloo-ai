-- Migration: Create RPC function to get total unread message count for a user
-- This function counts messages where the user is a participant and hasn't read them yet

CREATE OR REPLACE FUNCTION public.get_unread_messages_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_temp, public
STABLE
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::integer
  FROM public.messaging_conversation_summaries
  WHERE participant_id = auth.uid()
    AND unread_count > 0;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_unread_messages_count() TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.get_unread_messages_count() IS 
'Returns the total count of unread messages for the authenticated user across all conversations';

