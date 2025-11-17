-- Enable Realtime for user_calendar_events table
-- This allows clients to subscribe to real-time updates on calendar events

-- Remove table from publication if it already exists (for idempotent re-runs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'user_calendar_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_calendar_events;
  END IF;
END $$;

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_calendar_events;

-- Add helpful comment
COMMENT ON TABLE public.user_calendar_events IS 'Stores normalized calendar events from multiple sources (Google Calendar, Outlook, etc.) for cross-platform consumption. Realtime enabled for live updates.';
