import { useEffect, useState, useCallback } from "react";
import { supabaseDb2 } from "@/supabase-db2-client";
import type { RealtimePostgresChangesPayload, Session } from "@supabase/supabase-js";

export interface CalendarEvent {
  id: string;
  user_id: string;
  source: string;
  external_event_id: string;
  google_calendar_id: string | null;
  status: string;
  summary: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  hangout_link: string | null;
  location: string | null;
  last_updated_at: string;
  created_at: string;
}

interface UseUpcomingEventsOptions {
  windowDays?: number;
  limit?: number;
  session?: Session | null;
}

interface UseUpcomingEventsReturn {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUpcomingEvents(
  options: UseUpcomingEventsOptions = {}
): UseUpcomingEventsReturn {
  const { windowDays = 14, limit = 20, session } = options;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!session?.user?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const now = new Date().toISOString();
      const windowEnd = new Date(
        Date.now() + windowDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error: fetchError } = await supabaseDb2
        .from("user_calendar_events")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("start_time", now)
        .lte("start_time", windowEnd)
        .order("start_time", { ascending: true })
        .limit(limit);

      if (fetchError) {
        throw fetchError;
      }

      setEvents(data || []);
    } catch (err) {
      console.error("Error fetching upcoming events:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch upcoming events"
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, windowDays, limit]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const channel = supabaseDb2
      .channel("electron_calendar_events_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_calendar_events",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<CalendarEvent>) => {
          // Refresh the events list when any change occurs
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabaseDb2.removeChannel(channel);
    };
  }, [session?.user?.id, fetchEvents]);

  return {
    events,
    loading,
    error,
    refresh: fetchEvents,
  };
}

// Helper function to format event time for display
export function formatEventTime(
  startTime: string,
  endTime: string,
  isAllDay: boolean
): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isAllDay) {
    return start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const sameDay = start.toDateString() === end.toDateString();
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  if (sameDay) {
    return `${start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })} ${start.toLocaleTimeString(undefined, timeOptions)} - ${end.toLocaleTimeString(undefined, timeOptions)}`;
  }

  return `${start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} ${start.toLocaleTimeString(undefined, timeOptions)} - ${end.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} ${end.toLocaleTimeString(undefined, timeOptions)}`;
}

// Helper function to get status badge color classes
export function getStatusColor(status: string): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status.toLowerCase()) {
    case "confirmed":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        dot: "bg-green-600",
      };
    case "tentative":
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        dot: "bg-yellow-600",
      };
    case "cancelled":
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        dot: "bg-red-600",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        dot: "bg-gray-600",
      };
  }
}

export default useUpcomingEvents;
