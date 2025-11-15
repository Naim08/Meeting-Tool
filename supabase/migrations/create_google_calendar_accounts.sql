-- Drop existing objects if they exist
DROP TABLE IF EXISTS public.google_calendar_accounts CASCADE;

-- Create table for storing Google Calendar OAuth credentials and integration metadata
CREATE TABLE public.google_calendar_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_user_id text NOT NULL,
  email text NOT NULL,
  access_token text, -- Short-lived token, may be null/expired
  refresh_token text NOT NULL, -- Long-lived token for refreshing access
  expires_at timestamptz NOT NULL, -- When the access_token expires
  scope text NOT NULL, -- OAuth scopes granted
  primary_calendar_id text, -- Usually 'primary' but can be customized
  sync_enabled boolean NOT NULL DEFAULT true, -- Whether to sync this account
  connected_at timestamptz NOT NULL DEFAULT now(), -- When the user first connected
  last_sync_at timestamptz, -- Last successful sync timestamp

  -- Ensure one calendar account per user
  CONSTRAINT unique_user_calendar UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.google_calendar_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own calendar accounts
CREATE POLICY "Users can view own calendar accounts"
  ON public.google_calendar_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own calendar accounts
CREATE POLICY "Users can insert own calendar accounts"
  ON public.google_calendar_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own calendar accounts
CREATE POLICY "Users can update own calendar accounts"
  ON public.google_calendar_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own calendar accounts
CREATE POLICY "Users can delete own calendar accounts"
  ON public.google_calendar_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for fast user lookups
CREATE INDEX idx_calendar_accounts_user ON public.google_calendar_accounts(user_id);

-- Create index for finding enabled accounts (used by batch sync)
CREATE INDEX idx_calendar_accounts_sync_enabled ON public.google_calendar_accounts(sync_enabled) WHERE sync_enabled = true;

-- Add helpful comment
COMMENT ON TABLE public.google_calendar_accounts IS 'Stores Google Calendar OAuth credentials and integration metadata for each user';
