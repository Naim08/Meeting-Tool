import { createClient } from '@supabase/supabase-js';

// Feature flag names
export const FEATURE_FLAGS = {
  GOOGLE_OAUTH_SIGNIN: 'google_oauth_signin',
  GOOGLE_OAUTH_SIGNUP: 'google_oauth_signup',
  GOOGLE_CALENDAR_SYNC: 'google_calendar_sync',
} as const;

export type FeatureFlagName = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_DB2_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY!
);

/**
 * Check if a feature flag is enabled (server-side)
 * Uses service role to bypass RLS
 */
export async function isFeatureEnabled(flagName: FeatureFlagName): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .select('is_enabled')
      .eq('feature_name', flagName)
      .single();

    if (error) {
      console.error(`Error checking feature flag ${flagName}:`, error);
      // Default to enabled if flag doesn't exist or error occurs
      return true;
    }

    return data?.is_enabled ?? true;
  } catch (err) {
    console.error(`Error checking feature flag ${flagName}:`, err);
    return true; // Default to enabled on error
  }
}

/**
 * Check if Google Calendar sync is enabled
 */
export async function isGoogleCalendarSyncEnabled(): Promise<boolean> {
  return isFeatureEnabled(FEATURE_FLAGS.GOOGLE_CALENDAR_SYNC);
}

/**
 * Check if Google OAuth sign-in is enabled
 */
export async function isGoogleSignInEnabled(): Promise<boolean> {
  return isFeatureEnabled(FEATURE_FLAGS.GOOGLE_OAUTH_SIGNIN);
}

/**
 * Check if Google OAuth sign-up is enabled
 */
export async function isGoogleSignUpEnabled(): Promise<boolean> {
  return isFeatureEnabled(FEATURE_FLAGS.GOOGLE_OAUTH_SIGNUP);
}
