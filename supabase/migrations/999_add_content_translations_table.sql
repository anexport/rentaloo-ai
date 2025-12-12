-- Create content_translations table for caching translated user-generated content
CREATE TABLE IF NOT EXISTS content_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL,  -- 'equipment', 'reviews', etc.
    content_id UUID NOT NULL,           -- ID of the content being translated
    field_name VARCHAR(50) NOT NULL,    -- 'title', 'description', 'comment', etc.
    source_lang VARCHAR(5) NOT NULL DEFAULT 'en',
    target_lang VARCHAR(5) NOT NULL,    -- 'es', 'fr', 'de', etc.
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_type, content_id, field_name, target_lang)
);

-- Create index for faster lookups
CREATE INDEX idx_content_translations_lookup ON content_translations(content_type, content_id, target_lang);
CREATE INDEX idx_content_translations_created_at ON content_translations(created_at);

-- RLS policies for content_translations
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can read translations
CREATE POLICY "Anyone can read translations"
ON content_translations
FOR SELECT
TO authenticated, anon
USING (true);

-- Only system/admin can insert translations (you may want to adjust this based on your needs)
-- For now, we'll allow authenticated users to insert/update for their own content
CREATE POLICY "Authenticated users can insert translations"
ON content_translations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM equipment e
        WHERE e.id = content_id
          AND e.owner_id = auth.uid()
          AND content_type = 'equipment'
    )
);

CREATE POLICY "Authenticated users can update translations"
ON content_translations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM equipment e
        WHERE e.id = content_id
          AND e.owner_id = auth.uid()
          AND content_type = 'equipment'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM equipment e
        WHERE e.id = content_id
          AND e.owner_id = auth.uid()
          AND content_type = 'equipment'
    )
);

CREATE POLICY "Authenticated owners can delete translations"
ON content_translations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM equipment e
        WHERE e.id = content_id
          AND e.owner_id = auth.uid()
          AND content_type = 'equipment'
    )
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_content_translations_updated_at
    BEFORE UPDATE ON content_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_content_translations_updated_at();

-- Add comment for documentation
COMMENT ON TABLE content_translations IS 'Caches translations of user-generated content like equipment titles and descriptions';
