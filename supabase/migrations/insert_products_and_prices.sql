-- Insert products
INSERT INTO public.products (id, active, name, description, metadata)
VALUES 
  ('prod_TAjKhlVgwGk1F4', true, 'Weekly Subscription', 'Weekly subscription plan', '{}'),
  ('prod_TAjKl0MZPERQEY', true, 'Monthly Subscription', 'Monthly subscription plan', '{}')
ON CONFLICT (id) DO UPDATE SET
  active = EXCLUDED.active,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert prices
INSERT INTO public.prices (id, product_id, active, unit_amount, currency, type, interval, interval_count, metadata)
VALUES 
  ('price_1SENrgQ7wFwuaILeEwiIsjRd', 'prod_TAjKhlVgwGk1F4', true, NULL, 'usd', 'recurring', 'week', 1, '{}'),
  ('price_1SENrzQ7wFwuaILeX9OLs6OW', 'prod_TAjKl0MZPERQEY', true, NULL, 'usd', 'recurring', 'month', 1, '{}')
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  active = EXCLUDED.active,
  unit_amount = EXCLUDED.unit_amount,
  currency = EXCLUDED.currency,
  type = EXCLUDED.type,
  interval = EXCLUDED.interval,
  interval_count = EXCLUDED.interval_count,
  updated_at = NOW();

