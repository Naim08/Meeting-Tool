'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getGoogleFeatureFlags,
  FEATURE_FLAGS,
  type FeatureFlagName
} from '@/lib/featureFlags';
import { useSupabase } from '@/context/SupabaseProvider';

interface GoogleFeatureFlags {
  signInEnabled: boolean;
  signUpEnabled: boolean;
  calendarSyncEnabled: boolean;
}

interface UseGoogleFeatureFlagsReturn {
  flags: GoogleFeatureFlags;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Cache for feature flags to avoid repeated fetches
let cachedFlags: GoogleFeatureFlags | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch and manage Google-related feature flags
 * Caches results for 5 minutes to reduce database calls
 */
export function useGoogleFeatureFlags(): UseGoogleFeatureFlagsReturn {
  const [flags, setFlags] = useState<GoogleFeatureFlags>({
    signInEnabled: true,
    signUpEnabled: true,
    calendarSyncEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const now = Date.now();
      if (cachedFlags && (now - cacheTimestamp) < CACHE_TTL) {
        setFlags(cachedFlags);
        setLoading(false);
        return;
      }

      const fetchedFlags = await getGoogleFeatureFlags();

      // Update cache
      cachedFlags = fetchedFlags;
      cacheTimestamp = now;

      setFlags(fetchedFlags);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
      // Keep defaults (all enabled) on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return {
    flags,
    loading,
    error,
    refetch: fetchFlags,
  };
}

/**
 * Hook to check a single feature flag
 */
export function useFeatureFlag(flagName: FeatureFlagName): {
  enabled: boolean;
  loading: boolean;
} {
  const { supabase } = useSupabase();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFlag() {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('is_enabled')
          .eq('feature_name', flagName)
          .single();

        if (error) {
          console.error(`Error checking flag ${flagName}:`, error);
          setEnabled(true); // Default to enabled
        } else {
          setEnabled(data?.is_enabled ?? true);
        }
      } catch (err) {
        console.error(`Error checking flag ${flagName}:`, err);
        setEnabled(true);
      } finally {
        setLoading(false);
      }
    }

    checkFlag();
  }, [flagName, supabase]);

  return { enabled, loading };
}

/**
 * Utility to invalidate the feature flags cache
 * Call this after admin updates a flag
 */
export function invalidateFeatureFlagsCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}

// Re-export constants for convenience
export { FEATURE_FLAGS };
