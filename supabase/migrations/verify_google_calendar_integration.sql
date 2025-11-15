-- Verification script for Google Calendar integration
-- Run this after applying migrations to verify everything is set up correctly
--
-- Usage: Run this in Supabase SQL Editor and check the output

DO $$
DECLARE
  v_tables_exist boolean;
  v_cron_job_exists boolean;
  v_extension_exists boolean;
  v_function_exists boolean;
  v_trigger_exists boolean;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  RAISE NOTICE '🔍 Verifying Google Calendar Integration Setup...';
  RAISE NOTICE '';

  -- Check if pg_cron extension is enabled
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO v_extension_exists;

  IF v_extension_exists THEN
    RAISE NOTICE '✅ pg_cron extension is enabled';
  ELSE
    RAISE NOTICE '❌ pg_cron extension is NOT enabled';
    v_errors := array_append(v_errors, 'pg_cron extension missing');
  END IF;

  -- Check if google_calendar_accounts table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'google_calendar_accounts') THEN
    RAISE NOTICE '✅ Table google_calendar_accounts exists';

    -- Check RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables
               WHERE schemaname = 'public'
               AND tablename = 'google_calendar_accounts'
               AND rowsecurity = true) THEN
      RAISE NOTICE '   ✅ RLS is enabled';
    ELSE
      RAISE NOTICE '   ❌ RLS is NOT enabled';
      v_errors := array_append(v_errors, 'RLS not enabled on google_calendar_accounts');
    END IF;

    -- Check indexes
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = 'public'
               AND tablename = 'google_calendar_accounts'
               AND indexname = 'idx_calendar_accounts_user') THEN
      RAISE NOTICE '   ✅ Index idx_calendar_accounts_user exists';
    ELSE
      RAISE NOTICE '   ❌ Index idx_calendar_accounts_user missing';
      v_errors := array_append(v_errors, 'Missing index: idx_calendar_accounts_user');
    END IF;
  ELSE
    RAISE NOTICE '❌ Table google_calendar_accounts does NOT exist';
    v_errors := array_append(v_errors, 'Table google_calendar_accounts missing');
  END IF;

  -- Check if user_calendar_events table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'user_calendar_events') THEN
    RAISE NOTICE '✅ Table user_calendar_events exists';

    -- Check RLS
    IF EXISTS (SELECT 1 FROM pg_tables
               WHERE schemaname = 'public'
               AND tablename = 'user_calendar_events'
               AND rowsecurity = true) THEN
      RAISE NOTICE '   ✅ RLS is enabled';
    ELSE
      RAISE NOTICE '   ❌ RLS is NOT enabled';
      v_errors := array_append(v_errors, 'RLS not enabled on user_calendar_events');
    END IF;

    -- Check trigger function exists
    IF EXISTS (SELECT 1 FROM pg_proc
               WHERE proname = 'update_calendar_event_timestamp') THEN
      RAISE NOTICE '   ✅ Function update_calendar_event_timestamp exists';
      v_function_exists := true;
    ELSE
      RAISE NOTICE '   ❌ Function update_calendar_event_timestamp missing';
      v_errors := array_append(v_errors, 'Function update_calendar_event_timestamp missing');
      v_function_exists := false;
    END IF;

    -- Check trigger exists
    IF EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgname = 'update_calendar_event_timestamp_trigger') THEN
      RAISE NOTICE '   ✅ Trigger update_calendar_event_timestamp_trigger exists';
    ELSE
      RAISE NOTICE '   ❌ Trigger update_calendar_event_timestamp_trigger missing';
      v_errors := array_append(v_errors, 'Trigger update_calendar_event_timestamp_trigger missing');
    END IF;
  ELSE
    RAISE NOTICE '❌ Table user_calendar_events does NOT exist';
    v_errors := array_append(v_errors, 'Table user_calendar_events missing');
  END IF;

  -- Check if calendar_sync_logs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'calendar_sync_logs') THEN
    RAISE NOTICE '✅ Table calendar_sync_logs exists';
  ELSE
    RAISE NOTICE '❌ Table calendar_sync_logs does NOT exist';
    v_errors := array_append(v_errors, 'Table calendar_sync_logs missing');
  END IF;

  -- Check if cron job is scheduled
  IF v_extension_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'sync-google-calendars-hourly'
    ) INTO v_cron_job_exists;

    IF v_cron_job_exists THEN
      RAISE NOTICE '✅ Cron job sync-google-calendars-hourly is scheduled';

      -- Show cron details
      RAISE NOTICE '   Schedule: %', (SELECT schedule FROM cron.job WHERE jobname = 'sync-google-calendars-hourly');
    ELSE
      RAISE NOTICE '❌ Cron job sync-google-calendars-hourly is NOT scheduled';
      v_errors := array_append(v_errors, 'Cron job not scheduled');
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- Summary
  IF array_length(v_errors, 1) IS NULL THEN
    RAISE NOTICE '✅ ALL CHECKS PASSED! Google Calendar integration is properly set up.';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Deploy Edge Functions: sync_google_calendar and sync_all_calendars';
    RAISE NOTICE '   2. Set Edge Function secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET';
    RAISE NOTICE '   3. Update Supabase Auth provider scopes to include calendar.readonly';
    RAISE NOTICE '   4. Add Google OAuth redirect URI in Google Cloud Console';
    RAISE NOTICE '   5. Test the integration from your web app';
  ELSE
    RAISE NOTICE '❌ VERIFICATION FAILED! Found % issue(s):', array_length(v_errors, 1);
    RAISE NOTICE '';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '   %d. %', i, v_errors[i];
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Please fix the issues above and run the verification again.';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Show detailed table information
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
  obj_description((table_schema || '.' || table_name)::regclass, 'pg_class') as table_comment
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('google_calendar_accounts', 'user_calendar_events', 'calendar_sync_logs')
ORDER BY table_name;

-- Show RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('google_calendar_accounts', 'user_calendar_events')
ORDER BY tablename, policyname;
