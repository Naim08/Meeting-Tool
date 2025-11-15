-- Rollback script for Google Calendar integration
-- This script removes all tables, functions, triggers, and cron jobs related to the integration
--
-- WARNING: This will delete all calendar data and cannot be undone!
-- Make sure to backup your data before running this script.
--
-- Usage: Run this in Supabase SQL Editor if you need to completely remove the integration

-- 1. Unschedule the cron job
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-google-calendars-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-google-calendars-hourly');
    RAISE NOTICE 'Cron job unscheduled successfully';
  ELSE
    RAISE NOTICE 'Cron job not found, skipping';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error unscheduling cron job: %', SQLERRM;
END $$;

-- 2. Drop trigger and function for user_calendar_events
DROP TRIGGER IF EXISTS update_calendar_event_timestamp_trigger ON public.user_calendar_events;
DROP FUNCTION IF EXISTS update_calendar_event_timestamp();

-- 3. Drop indexes (will be dropped with CASCADE but explicit for clarity)
DROP INDEX IF EXISTS public.idx_calendar_events_user_time;
DROP INDEX IF EXISTS public.idx_calendar_events_source;
DROP INDEX IF EXISTS public.idx_calendar_events_upcoming;
DROP INDEX IF EXISTS public.idx_calendar_events_status;
DROP INDEX IF EXISTS public.idx_calendar_accounts_user;
DROP INDEX IF EXISTS public.idx_calendar_accounts_sync_enabled;
DROP INDEX IF EXISTS public.idx_sync_logs_executed_at;

-- 4. Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS public.user_calendar_events CASCADE;
DROP TABLE IF EXISTS public.google_calendar_accounts CASCADE;
DROP TABLE IF EXISTS public.calendar_sync_logs CASCADE;

-- 5. Note: We don't drop pg_cron extension as it might be used by other features
-- If you want to remove it, uncomment the line below:
-- DROP EXTENSION IF EXISTS pg_cron CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Google Calendar integration rollback completed successfully';
  RAISE NOTICE '   - Cron job unscheduled';
  RAISE NOTICE '   - Tables dropped: user_calendar_events, google_calendar_accounts, calendar_sync_logs';
  RAISE NOTICE '   - Functions and triggers removed';
  RAISE NOTICE '   - Indexes removed';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: This did NOT remove:';
  RAISE NOTICE '   - Edge Functions (must be removed via Supabase CLI or Dashboard)';
  RAISE NOTICE '   - API routes in your Next.js app';
  RAISE NOTICE '   - React components and pages';
END $$;
