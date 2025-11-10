// Script to activate user subscription in Supabase
// Run this in browser console while logged into the app

// get supabase npm module
// this is purely a node script
import * as supabase from '@supabase/supabase-js';

const { createClient } = supabase;

const supabaseUrl = 'https://mthkbfdqqjvremvijfed.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGtiZmRxcWp2cmVtdmlqZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc1MjA1MzUsImV4cCI6MjAyMzA5NjUzNX0.pvjf-iMiPrfjKMkoFB_DHKePQulJdyEIuJl37rced-w';

const client = createClient(supabaseUrl, supabaseAnonKey);

// get user by uuid
const userId = '6325055b-6575-445e-8ed0-17fea3a5e1f3';
// get current user
const { data: user, error: userError } = await client
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
  console.log('User:', user);

// Get current user
const { data: { session } } = await client.auth.getSession();
console.log('Current user:', session);

// Option 1: Give yourself unlimited trial messages
const { data: trialData, error: trialError } = await client
  .from('users')
  .update({
    trial_message_count: 999999,
    trial_start: new Date().toISOString(),
    trial_end: null // Remove trial end
  })
  .eq('id', session.user.id)
  .select();

if (trialError) {
  console.error('Error updating trial:', trialError);
} else {
  console.log('✅ Trial updated:', trialData);
}

// Option 2: Check if subscriptions table allows direct inserts (may be restricted)
// This will likely fail due to RLS policies, but worth trying:
const { data: subData, error: subError } = await client
  .from('subscriptions')
  .insert({
    user_id: session.user.id,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  })
  .select();

if (subError) {
  console.error('⚠️ Subscription insert failed (expected - RLS protected):', subError.message);
  console.log('👉 Use Option 1 (trial messages) instead - it should work!');
} else {
  console.log('✅ Subscription created:', subData);
}

console.log('\n📋 Summary:');
console.log('- If trial update succeeded, you now have 999,999 free messages');
console.log('- Refresh the app to see the changes');
