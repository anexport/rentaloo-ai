-- Create conversation_participants junction table for many-to-many relationship
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, profile_id)
);

-- Create indexes for better performance
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_profile_id ON conversation_participants(profile_id);

-- Migrate existing data from participants array to junction table
INSERT INTO conversation_participants (conversation_id, profile_id)
SELECT 
    c.id as conversation_id,
    unnest(c.participants) as profile_id
FROM conversations c
WHERE c.participants IS NOT NULL;

-- We'll keep the participants column for now for backwards compatibility
-- but eventually we can remove it in a future migration after ensuring
-- all code uses the junction table

-- Add comment for documentation
COMMENT ON TABLE conversation_participants IS 'Junction table linking conversations to participant profiles (many-to-many relationship)';


