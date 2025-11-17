-- Setup automatic hourly sync for Google Calendar using pg_cron
--
-- IMPORTANT: pg_cron must be enabled in your Supabase project first!
-- To enable pg_cron:
-- 1. Go to Supabase Dashboard → Database → Extensions
-- 2. Search for "pg_cron" and enable it
--
-- Alternatively, run this SQL in the Supabase SQL Editor:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop calendar_sync_logs table if it exists
DROP TABLE IF EXISTS public.calendar_sync_logs CASCADE;

-- Enable pg_cron extension (may require admin privileges)
-- If this fails, enable it manually in the Supabase Dashboard
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required for cron jobs)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Unschedule existing cron jobs if they exist (must be after extension is created)
DO $$
BEGIN
  -- Remove old job name if exists
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-google-calendars-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-google-calendars-hourly');
  END IF;
  -- Remove new job name if exists (for re-runs)
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync_google_calendars_every_15_minutes'
  ) THEN
    PERFORM cron.unschedule('sync_google_calendars_every_15_minutes');
  END IF;
END $$;

-- Schedule calendar sync to run every 15 minutes
-- This calls the sync_all_calendars edge function to sync events for all active users
SELECT cron.schedule(
  'sync_google_calendars_every_15_minutes',    -- Job name
  '*/15 * * * *',                               -- Cron expression: every 15 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync_all_calendars',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'PostgreSQL cron extension for scheduling calendar sync jobs every 15 minutes';

-- Create a table to log cron job execution history (optional but helpful for debugging)
CREATE TABLE public.calendar_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL, -- 'success', 'error', 'running'
  users_synced integer,
  events_synced integer,
  errors_count integer,
  error_details jsonb,
  execution_time_ms integer
);

-- Add helpful comment
COMMENT ON TABLE public.calendar_sync_logs IS 'Logs execution history of the automatic calendar sync cron job for monitoring and debugging';

-- Create index for querying recent logs
CREATE INDEX idx_sync_logs_executed_at ON public.calendar_sync_logs(executed_at DESC);

-- Note: To view scheduled cron jobs, run:
-- SELECT * FROM cron.job;

-- Note: To unschedule the job (if needed), run:
-- SELECT cron.unschedule('sync-google-calendars-hourly');

-- Note: To view cron job run history, run:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
