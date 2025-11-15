-- Setup automatic hourly sync for Google Calendar using pg_cron
--
-- IMPORTANT: pg_cron must be enabled in your Supabase project first!
-- To enable pg_cron:
-- 1. Go to Supabase Dashboard → Database → Extensions
-- 2. Search for "pg_cron" and enable it
--
-- Alternatively, run this SQL in the Supabase SQL Editor:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing objects if they exist
-- Unschedule existing cron job if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-google-calendars-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-google-calendars-hourly');
  END IF;
END $$;

-- Drop calendar_sync_logs table if it exists
DROP TABLE IF EXISTS public.calendar_sync_logs CASCADE;

-- Enable pg_cron extension (may require admin privileges)
-- If this fails, enable it manually in the Supabase Dashboard
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule a job to sync all Google Calendar accounts every hour
-- Runs at the top of every hour (minute 0)
SELECT cron.schedule(
  'sync-google-calendars-hourly',              -- Job name
  '0 * * * *',                                  -- Cron expression: every hour at minute 0
  $$
    SELECT
      net.http_post(
        url := 'https://ggzxxdtmwvublestzawb.supabase.co/functions/v1/sync_all_calendars',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnenh4ZHRtd3Z1Ymxlc3R6YXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzI5MTQsImV4cCI6MjA3NTE0ODkxNH0.vE4B1Va31lmqJpIa63lYCpQUNxagbEkMVxsw-TzAOyM',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);

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
