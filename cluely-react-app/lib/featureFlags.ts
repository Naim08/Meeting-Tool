import { supabase } from './supabaseClient';

// Feature flag names as constants for type safety
export const FEATURE_FLAGS = {
  GOOGLE_OAUTH_SIGNIN: 'google_oauth_signin',
  GOOGLE_OAUTH_SIGNUP: 'google_oauth_signup',
  GOOGLE_CALENDAR_SYNC: 'google_calendar_sync',
} as const;

export type FeatureFlagName = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

export interface FeatureFlag {
  id: string;
  feature_name: string;
  is_enabled: boolean;
  description: string | null;
  updated_at: string;
}

export interface FeatureFlagsMap {
  [key: string]: boolean;
}

/**
 * Fetch all feature flags from the database
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('feature_name');

  if (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch a specific feature flag by name
 */
export async function getFeatureFlag(flagName: FeatureFlagName): Promise<boolean> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('is_enabled')
    .eq('feature_name', flagName)
    .single();

  if (error) {
    console.error(`Error fetching feature flag ${flagName}:`, error);
    // Default to enabled if flag doesn't exist or error occurs
    return true;
  }

  return data?.is_enabled ?? true;
}

/**
 * Fetch multiple feature flags and return as a map
 */
export async function getFeatureFlagsMap(flagNames: FeatureFlagName[]): Promise<FeatureFlagsMap> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('feature_name, is_enabled')
    .in('feature_name', flagNames);

  if (error) {
    console.error('Error fetching feature flags:', error);
    // Default all to enabled on error
    return flagNames.reduce((acc, name) => ({ ...acc, [name]: true }), {});
  }

  // Build map with defaults for missing flags
  const flagMap: FeatureFlagsMap = {};
  for (const name of flagNames) {
    const flag = data?.find(f => f.feature_name === name);
    flagMap[name] = flag?.is_enabled ?? true;
  }

  return flagMap;
}

/**
 * Check if Google OAuth Sign In is enabled
 */
export async function isGoogleSignInEnabled(): Promise<boolean> {
  return getFeatureFlag(FEATURE_FLAGS.GOOGLE_OAUTH_SIGNIN);
}

/**
 * Check if Google OAuth Sign Up is enabled
 */
export async function isGoogleSignUpEnabled(): Promise<boolean> {
  return getFeatureFlag(FEATURE_FLAGS.GOOGLE_OAUTH_SIGNUP);
}

/**
 * Check if Google Calendar Sync is enabled
 */
export async function isGoogleCalendarSyncEnabled(): Promise<boolean> {
  return getFeatureFlag(FEATURE_FLAGS.GOOGLE_CALENDAR_SYNC);
}

/**
 * Get all Google-related feature flags at once
 */
export async function getGoogleFeatureFlags(): Promise<{
  signInEnabled: boolean;
  signUpEnabled: boolean;
  calendarSyncEnabled: boolean;
}> {
  const flagMap = await getFeatureFlagsMap([
    FEATURE_FLAGS.GOOGLE_OAUTH_SIGNIN,
    FEATURE_FLAGS.GOOGLE_OAUTH_SIGNUP,
    FEATURE_FLAGS.GOOGLE_CALENDAR_SYNC,
  ]);

  return {
    signInEnabled: flagMap[FEATURE_FLAGS.GOOGLE_OAUTH_SIGNIN],
    signUpEnabled: flagMap[FEATURE_FLAGS.GOOGLE_OAUTH_SIGNUP],
    calendarSyncEnabled: flagMap[FEATURE_FLAGS.GOOGLE_CALENDAR_SYNC],
  };
}
