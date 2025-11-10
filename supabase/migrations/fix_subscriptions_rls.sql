-- Allow service role to insert/update/delete subscriptions (for webhooks)
create policy "Service role can manage all subscriptions"
  on public.subscriptions
  for all
  using (true)
  with check (true);

-- Also allow service role to update users table (for webhooks)
create policy "Service role can update all users"
  on public.users
  for update
  using (true)
  with check (true);

