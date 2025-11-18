-- Create feature flags table for application-wide feature toggles
-- This allows disabling features like Google OAuth without code deployment

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_name text unique not null,
  is_enabled boolean default true not null,
  description text,
  updated_at timestamptz default now() not null,
  updated_by uuid references auth.users(id),
  created_at timestamptz default now() not null
);

-- Add comment for documentation
comment on table public.feature_flags is 'Application-wide feature toggles for enabling/disabling features';
comment on column public.feature_flags.feature_name is 'Unique identifier for the feature (e.g., google_oauth_signin)';
comment on column public.feature_flags.is_enabled is 'Whether the feature is currently enabled';
comment on column public.feature_flags.updated_by is 'Admin user who last modified this flag';

-- Create index for fast lookups by feature name
create index if not exists feature_flags_name_idx on public.feature_flags (feature_name);

-- Create trigger to auto-update updated_at timestamp
create or replace function public.handle_feature_flags_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_feature_flags_updated_at
before update on public.feature_flags
for each row execute function public.handle_feature_flags_updated_at();

-- Enable Row Level Security
alter table public.feature_flags enable row level security;

-- RLS Policies

-- All authenticated users can read feature flags
create policy "Anyone can read feature flags"
  on public.feature_flags for select
  using (true);

-- Only service role can insert/update/delete (admin operations)
-- This is handled via service role key from admin dashboard or API

-- Seed with default Google integration flags (all enabled by default)
insert into public.feature_flags (feature_name, is_enabled, description) values
  ('google_oauth_signin', true, 'Google Sign In button on login page. When disabled, users cannot sign in with Google but existing sessions remain valid.'),
  ('google_oauth_signup', true, 'Google Sign Up button on registration page. When disabled, new users cannot register with Google.'),
  ('google_calendar_sync', true, 'Google Calendar integration and sync. When disabled, calendar connection UI is hidden and background sync is paused.')
on conflict (feature_name) do nothing;
