-- Add interview detection columns to user_calendar_events

-- Add is_interview generated column with regex heuristics
ALTER TABLE public.user_calendar_events
  ADD COLUMN IF NOT EXISTS is_interview boolean GENERATED ALWAYS AS (
    (COALESCE(summary, '') ~* '(interview|screen|recruiter|hiring\s*manager|HM\b|onsite|loop|take-home|portfolio)')
    OR (COALESCE(description, '') ~* '(interview|screen|recruiter|hiring\s*manager|HM\b|onsite|loop|take-home|portfolio)')
  ) STORED;

-- Add interview_override column for manual override (null = no override, true = is interview, false = not interview)
ALTER TABLE public.user_calendar_events
  ADD COLUMN IF NOT EXISTS interview_override boolean;

-- Create index for efficient interview event queries
CREATE INDEX IF NOT EXISTS idx_events_user_interview
  ON public.user_calendar_events(user_id, is_interview)
  WHERE is_interview = true OR interview_override = true;

-- Create index for start_time ascending (for upcoming events)
CREATE INDEX IF NOT EXISTS idx_events_user_start
  ON public.user_calendar_events(user_id, start_time ASC);

-- Add comment
COMMENT ON COLUMN public.user_calendar_events.is_interview IS 'Auto-detected based on event title/description regex patterns';
COMMENT ON COLUMN public.user_calendar_events.interview_override IS 'Manual override: null=use auto-detect, true=force interview, false=force not interview';

-- Create trigger to mark interview briefs as stale when event changes

-- Function to mark brief as stale when key event fields change
CREATE OR REPLACE FUNCTION mark_brief_stale()
RETURNS TRIGGER AS $$
BEGIN
  -- Only mark stale if key fields changed
  IF (
    COALESCE(NEW.summary, '') IS DISTINCT FROM COALESCE(OLD.summary, '')
    OR COALESCE(NEW.description, '') IS DISTINCT FROM COALESCE(OLD.description, '')
    OR NEW.start_time IS DISTINCT FROM OLD.start_time
    OR NEW.end_time IS DISTINCT FROM OLD.end_time
    OR COALESCE(NEW.location, '') IS DISTINCT FROM COALESCE(OLD.location, '')
  ) THEN
    UPDATE public.interview_briefs
    SET stale = true
    WHERE user_id = NEW.user_id
      AND event_id = NEW.id
      AND stale = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_mark_brief_stale ON public.user_calendar_events;

-- Create trigger on event updates
CREATE TRIGGER trg_mark_brief_stale
  AFTER UPDATE ON public.user_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION mark_brief_stale();

-- Add comment
COMMENT ON FUNCTION mark_brief_stale() IS 'Marks associated interview brief as stale when event summary, description, time, or location changes';


-- Create interview_briefs table for storing AI-generated interview prep briefs

CREATE TABLE IF NOT EXISTS public.interview_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.user_calendar_events(id) ON DELETE CASCADE,

  -- LLM metadata
  model text NOT NULL,
  prompt_tokens int,
  completion_tokens int,

  -- Brief content (JSONB for structured sections)
  brief jsonb NOT NULL,

  -- Generation tracking
  generated_at timestamptz NOT NULL DEFAULT now(),
  regenerated_count int NOT NULL DEFAULT 0,

  -- Status tracking
  stale boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ready', -- 'ready' | 'in_progress' | 'error'
  error_code text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure one brief per user per event
  CONSTRAINT uq_user_event UNIQUE (user_id, event_id)
);

-- Enable Row Level Security
ALTER TABLE public.interview_briefs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view, insert, update, and delete their own briefs
CREATE POLICY "own-briefs" ON public.interview_briefs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index for efficient queries by user
CREATE INDEX IF NOT EXISTS idx_briefs_user
  ON public.interview_briefs(user_id);

-- Create index for efficient queries by event
CREATE INDEX IF NOT EXISTS idx_briefs_event
  ON public.interview_briefs(event_id);

-- Create index for finding stale briefs
CREATE INDEX IF NOT EXISTS idx_briefs_stale
  ON public.interview_briefs(user_id, stale)
  WHERE stale = true;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_briefs_status
  ON public.interview_briefs(status)
  WHERE status = 'in_progress';

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_interview_brief_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interview_brief_timestamp_trigger
  BEFORE UPDATE ON public.interview_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_brief_timestamp();

-- Add helpful comments
COMMENT ON TABLE public.interview_briefs IS 'Stores AI-generated interview prep briefs for calendar events';
COMMENT ON COLUMN public.interview_briefs.brief IS 'Structured JSON containing: company_snapshot, role_hypothesis, interviewer_angle, likely_topics, prep_checklist, stories_to_prepare, smart_questions, risk_flags, one_liners';
COMMENT ON COLUMN public.interview_briefs.stale IS 'True when source event has been modified since brief generation';
COMMENT ON COLUMN public.interview_briefs.status IS 'Generation status: ready, in_progress, or error';
