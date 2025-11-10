import { useEffect, useState, useCallback } from "react";
import { MeetingDetail, Source } from "./helpers";

// Re-defining types for clarity in the new module
export interface ActiveMeeting {
  id: string;
  startedAt: number;
  title?: string;
  language: string;
  sources: Record<Source, { enabled: boolean; sessionId?: string }>;
}

export interface RecentMeeting {
  id: string;
  title?: string;
  started_at: number;
  ended_at?: number;
  duration?: number;
  word_count?: number;
  aggregated_word_count?: number;
  sources?: string;
  isActive: boolean;
}

export type MeetingDetails = MeetingDetail;

const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

const POLL_INTERVAL_MS = 2000;

export function useMeetingsState() {
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshState = useCallback(async () => {
    const meetingsApi = window.api.meetings;
    if (!meetingsApi) return;

    try {
      const [meeting, recent] = await Promise.all([
        meetingsApi.getActive(),
        meetingsApi.getRecent(50, 0),
      ]);

      const normalizedMeeting = (meeting || null) as ActiveMeeting | null;
      setActiveMeeting(prev => isEqual(prev, normalizedMeeting) ? prev : normalizedMeeting);

      const recentWithActive = (recent || []).map(m => ({
          ...m,
          isActive: m.id === normalizedMeeting?.id,
      })) as RecentMeeting[];
      setRecentMeetings(prev => isEqual(prev, recentWithActive) ? prev : recentWithActive);

    } catch (error) {
        console.error("[useMeetingsState] Failed to refresh state:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshState]);

  return { activeMeeting, recentMeetings, isLoading, refreshState };
}

export async function getMeetingDetails(meetingId: string): Promise<MeetingDetails | null> {
    if (!window.api.meetings?.getDetails) return null;
    try {
        const details = await window.api.meetings.getDetails(meetingId);
        return details as MeetingDetails | null;
    } catch (error) {
        console.error(`[getMeetingDetails] Failed to fetch details for ${meetingId}:`, error);
        return null;
    }
}

export async function startMeeting(prefs: { microphone: boolean; system: boolean }) {
    if (!window.api.meetings?.start) return null;
    try {
        const meetingId = await window.api.meetings.start({
            mic: prefs.microphone,
            system: prefs.system,
            language: 'en',
        });
        return meetingId;
    } catch (error) {
        console.error("[startMeeting] Failed to start meeting:", error);
        return null;
    }
}

export async function stopMeeting() {
    if (!window.api.meetings?.stop) return;
    try {
        await window.api.meetings.stop();
    } catch (error) {
        console.error("[stopMeeting] Failed to stop meeting:", error);
    }
}
