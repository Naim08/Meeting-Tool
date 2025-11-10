-- Add missing subscription columns to users table
alter table public.users
  add column if not exists price_id text references public.prices(id),
  add column if not exists quantity integer,
  add column if not exists cancel_at_period_end boolean default false,
  add column if not exists current_period_start timestamptz,
  add column if not exists subscription_created timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists cancel_at timestamptz,
  add column if not exists canceled_at timestamptz;

-- Add index on price_id for faster lookups
create index if not exists users_price_id_idx on public.users (price_id);

