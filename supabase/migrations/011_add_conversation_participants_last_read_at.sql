-- Add last_read_at column to conversation_participants table
-- This column tracks when a participant last read messages in a conversation
-- Used for read receipts and unread message counts

ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for efficient read state queries
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read_at 
ON conversation_participants(conversation_id, profile_id, last_read_at);

-- Comment for documentation
COMMENT ON COLUMN conversation_participants.last_read_at IS 
'Timestamp when the participant last read messages in this conversation. NULL indicates unread or never read.';

