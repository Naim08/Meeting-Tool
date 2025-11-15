-- Drop existing objects if they exist (in correct order)
DROP TRIGGER IF EXISTS update_calendar_event_timestamp_trigger ON public.user_calendar_events;
DROP FUNCTION IF EXISTS update_calendar_event_timestamp();
DROP TABLE IF EXISTS public.user_calendar_events CASCADE;

-- Create table for storing normalized calendar events from multiple sources
CREATE TABLE public.user_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'google_calendar', -- Source of the event (google_calendar, outlook, etc.)
  external_event_id text NOT NULL, -- Event ID from the source system
  google_calendar_id text, -- Which calendar this event belongs to
  status text NOT NULL, -- Event status: confirmed, tentative, cancelled
  summary text, -- Event title/summary
  description text, -- Event description/details
  start_time timestamptz NOT NULL, -- Event start time in UTC
  end_time timestamptz NOT NULL, -- Event end time in UTC
  is_all_day boolean NOT NULL DEFAULT false, -- Whether this is an all-day event
  hangout_link text, -- Google Meet/Hangout link if available
  location text, -- Physical or virtual location
  raw_payload jsonb, -- Full event data from source API for debugging
  last_updated_at timestamptz NOT NULL DEFAULT now(), -- When this record was last updated
  created_at timestamptz NOT NULL DEFAULT now(), -- When this record was created

  -- Ensure we don't have duplicate events from the same source
  CONSTRAINT unique_user_event UNIQUE(user_id, source, external_event_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own calendar events
CREATE POLICY "Users can view own calendar events"
  ON public.user_calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own calendar events (via sync functions)
CREATE POLICY "Users can insert own calendar events"
  ON public.user_calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own calendar events (via sync functions)
CREATE POLICY "Users can update own calendar events"
  ON public.user_calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own calendar events
CREATE POLICY "Users can delete own calendar events"
  ON public.user_calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for querying events by user and time (most common query)
CREATE INDEX idx_calendar_events_user_time
  ON public.user_calendar_events(user_id, start_time DESC);

-- Create index for finding events by source and external ID (for upserts)
CREATE INDEX idx_calendar_events_source
  ON public.user_calendar_events(user_id, source, external_event_id);

-- Create index for querying upcoming events efficiently
CREATE INDEX idx_calendar_events_upcoming
  ON public.user_calendar_events(user_id, start_time)
  WHERE start_time >= now();

-- Create index for querying by status
CREATE INDEX idx_calendar_events_status
  ON public.user_calendar_events(user_id, status);

-- Add helpful comment
COMMENT ON TABLE public.user_calendar_events IS 'Stores normalized calendar events from multiple sources (Google Calendar, Outlook, etc.) for cross-platform consumption';

-- Add trigger to automatically update last_updated_at
CREATE OR REPLACE FUNCTION update_calendar_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_event_timestamp_trigger
  BEFORE UPDATE ON public.user_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_timestamp();
