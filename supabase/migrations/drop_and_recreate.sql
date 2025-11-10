-- ⚠️ WARNING: This will delete all existing data in these tables!
-- Only run this if you're okay with losing all current data.

-- Drop existing triggers first
drop trigger if exists on_auth_user_email_updated on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
drop trigger if exists set_users_updated_at on public.users;
drop trigger if exists set_prices_updated_at on public.prices;
drop trigger if exists set_products_updated_at on public.products;

-- Drop trigger functions
drop function if exists public.handle_user_email_update();
drop function if exists public.handle_new_user();

-- Drop tables (in reverse order of dependencies)
drop table if exists public.subscriptions cascade;
drop table if exists public.users cascade;
drop table if exists public.prices cascade;
drop table if exists public.products cascade;

-- Now recreate everything fresh
-- Enable the trigger helper once per database
create extension if not exists moddatetime schema extensions;

-- Products (Stripe catalog items)
create table public.products (
  id          text primary key,
  active      boolean default true,
  name        text not null,
  description text,
  image       text,
  metadata    jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger set_products_updated_at
before update on public.products
for each row
execute function moddatetime(updated_at);

-- Prices (per product)
create table public.prices (
  id                text primary key,
  product_id        text references public.products(id) on delete cascade,
  active            boolean default true,
  description       text,
  unit_amount       bigint,
  currency          text,
  type              text,          -- one_time or recurring
  interval          text,          -- month, week, etc.
  interval_count    integer,
  trial_period_days integer,
  metadata          jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create trigger set_prices_updated_at
before update on public.prices
for each row
execute function moddatetime(updated_at);

-- Custom user profile (1:1 with auth.users)
create table public.users (
  id                         uuid primary key references auth.users(id) on delete cascade,
  email                      text,
  full_name                  text,
  avatar_url                 text,
  trial_start                timestamptz,
  trial_end                  timestamptz,
  trial_message_count        integer default 0,
  subscription_status        text,
  plan_id                    text,
  stripe_customer_id         text unique,
  stripe_checkout_session_id text,
  latest_invoice_id          text,
  latest_checkout_at         timestamptz,
  current_period_end         timestamptz,
  metadata                   jsonb,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

create trigger set_users_updated_at
before update on public.users
for each row
execute function moddatetime(updated_at);

-- Index on email for faster webhook queries
create index users_email_idx on public.users (email);

-- Index on stripe_customer_id for faster lookups
create index users_stripe_customer_id_idx on public.users (stripe_customer_id);

-- Subscription records (Stripe subscriptions)
create table public.subscriptions (
  id                     text primary key,
  user_id                uuid not null references auth.users(id) on delete cascade,
  status                 text,
  metadata               jsonb,
  price_id               text references public.prices(id),
  quantity               integer,
  cancel_at_period_end   boolean,
  created                timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  ended_at               timestamptz,
  cancel_at              timestamptz,
  canceled_at            timestamptz,
  trial_start            timestamptz,
  trial_end              timestamptz,
  plan_id                text,
  latest_invoice_id      text,
  updated_at             timestamptz default now()
);

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function moddatetime(updated_at);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_price_id_idx on public.subscriptions (price_id);

-- Trigger function to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Trigger to automatically create user profile on auth signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Trigger function to sync email updates from auth.users to public.users
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set email = new.email,
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

-- Trigger to keep email in sync when changed in auth.users
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_update();

-- Enable Row Level Security
alter table public.products enable row level security;
alter table public.prices enable row level security;
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;

-- RLS Policies for products (public read)
create policy "Products are viewable by everyone"
  on public.products for select
  using (true);

-- RLS Policies for prices (public read)
create policy "Prices are viewable by everyone"
  on public.prices for select
  using (true);

-- RLS Policies for users (users can read their own data)
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- RLS Policies for subscriptions (users can read their own subscriptions)
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

