/**
 * useInterviewBrief Hook
 *
 * Manages fetching, generating, and regenerating AI interview briefs.
 * Handles caching, staleness detection, and auto-generation for upcoming interviews.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { InterviewBrief } from '@/lib/interview-prompt';

export interface BriefData {
  brief: InterviewBrief | null;
  status: 'empty' | 'loading' | 'ready' | 'error';
  stale: boolean;
  error: string | null;
  regeneratedCount: number;
  generatedAt: string | null; // Mapped from created_at for backward compatibility
  createdAt: string | null; // When the brief was first created
  updatedAt: string | null; // When the brief was last updated
}

export interface UseInterviewBriefOptions {
  eventId: string;
  accessToken: string | null;
  autoGenerate?: boolean; // Auto-generate if missing and interview within 48h
  eventStartTime?: string; // ISO timestamp
}

export function useInterviewBrief({
  eventId,
  accessToken,
  autoGenerate = false,
  eventStartTime,
}: UseInterviewBriefOptions) {
  const [data, setData] = useState<BriefData>({
    brief: null,
    status: 'empty',
    stale: false,
    error: null,
    regeneratedCount: 0,
    generatedAt: null,
    createdAt: null,
    updatedAt: null,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  /**
   * Fetch cached brief from API
   */
  const fetchBrief = useCallback(async () => {
    if (!accessToken) {
      setData((prev) => ({ ...prev, status: 'empty' }));
      return;
    }

    try {
      const response = await fetch(`/api/interview-brief/${eventId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brief');
      }

      const result = await response.json();

      if (!result.brief) {
        // No brief exists yet
        setData({
          brief: null,
          status: 'empty',
          stale: false,
          error: null,
          regeneratedCount: 0,
          generatedAt: null,
          createdAt: null,
          updatedAt: null,
        });
        return;
      }

      // Brief exists
      setData({
        brief: result.brief,
        status: result.status === 'ready' ? 'ready' : result.status === 'error' ? 'error' : 'loading',
        stale: result.stale || false,
        error: result.error_code || null,
        regeneratedCount: result.regenerated_count || 0,
        generatedAt: result.generated_at,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      });
    } catch (error) {
      console.error('[useInterviewBrief] Fetch error:', error);
      setData((prev) => ({
        ...prev,
        status: 'error',
        error: 'Failed to load brief',
      }));
    }
  }, [eventId, accessToken]);

  /**
   * Generate a new brief
   */
  const generate = useCallback(async () => {
    if (!accessToken || isGenerating || isRegenerating) return;

    setIsGenerating(true);
    setData((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await fetch('/api/interview-brief/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();

      setData({
        brief: result.brief,
        status: 'ready',
        stale: false,
        error: null,
        regeneratedCount: 0,
        generatedAt: result.generated_at,
        createdAt: result.generated_at, // Set to generated_at for consistency
        updatedAt: result.generated_at,
      });
    } catch (error) {
      console.error('[useInterviewBrief] Generate error:', error);
      setData((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Generation failed',
      }));
    } finally {
      setIsGenerating(false);
    }
  }, [eventId, accessToken, isGenerating, isRegenerating]);

  /**
   * Regenerate an existing brief
   */
  const regenerate = useCallback(async () => {
    if (!accessToken || isGenerating || isRegenerating) return;

    setIsRegenerating(true);
    setData((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await fetch('/api/interview-brief/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }

      const result = await response.json();

      setData({
        brief: result.brief,
        status: 'ready',
        stale: false,
        error: null,
        regeneratedCount: result.regenerated_count || 0,
        generatedAt: result.generated_at,
        createdAt: result.generated_at, // Set to generated_at for consistency
        updatedAt: result.generated_at,
      });
    } catch (error) {
      console.error('[useInterviewBrief] Regenerate error:', error);
      setData((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Regeneration failed',
      }));
    } finally {
      setIsRegenerating(false);
    }
  }, [eventId, accessToken, isGenerating, isRegenerating]);

  /**
   * Check if event is within auto-generate window (48 hours)
   */
  const shouldAutoGenerate = useCallback(() => {
    if (!autoGenerate || !eventStartTime) return false;

    const eventDate = new Date(eventStartTime);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Auto-generate if event is within 48 hours and in the future
    return hoursUntilEvent > 0 && hoursUntilEvent <= 48;
  }, [autoGenerate, eventStartTime]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  /**
   * Auto-generate if conditions are met
   */
  useEffect(() => {
    if (data.status === 'empty' && shouldAutoGenerate() && !isGenerating) {
      // Debounce to avoid rapid re-triggers
      const timer = setTimeout(() => {
        generate();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [data.status, shouldAutoGenerate, generate, isGenerating]);

  return {
    ...data,
    isGenerating,
    isRegenerating,
    generate,
    regenerate,
    refetch: fetchBrief,
  };
}
