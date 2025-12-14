-- Migration: Setup cron job for auto-release deposits
-- Runs every 15 minutes to automatically release security deposits after:
-- - Owner confirms the renter-submitted return inspection, OR
-- - The claim window expires (auto-accept)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to auto-release deposits every 15 minutes
-- Uses pg_net to call the edge function with service role auth
SELECT cron.schedule(
  'auto-release-deposits',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rvbjfmwflirrhnwipuec.supabase.co/functions/v1/auto-release-deposits',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.service_role_key', true) || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
