import React, { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabaseDb2 } from "@/supabase-db2-client";
import {
  useUpcomingEvents,
  formatEventTime,
  getStatusColor,
  type CalendarEvent,
} from "@/hooks/useUpcomingEvents";

interface MeetingsPanelProps {
  session: Session | null;
}

export default function MeetingsPanel({ session }: MeetingsPanelProps) {
  const { events, loading, error, refresh } = useUpcomingEvents({
    session,
    limit: 20,
    windowDays: 14,
  });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Manual sync handler
  const handleSync = async () => {
    if (!session) {
      setSyncError("Please sign in to sync your calendar");
      return;
    }

    setSyncError(null);
    setSyncSuccess(null);
    setSyncing(true);

    try {
      const { data, error } = await supabaseDb2.functions.invoke(
        "sync_google_calendar"
      );

      if (error) {
        throw error;
      }

      setSyncSuccess(`Synced ${data.upserted} events`);
      // Refresh the events list
      await refresh();

      // Clear success message after 5 seconds
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err) {
      console.error("Sync error:", err);
      setSyncError(
        err instanceof Error ? err.message : "Failed to sync calendar"
      );
    } finally {
      setSyncing(false);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <svg
          className="w-12 h-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-gray-600">
          Sign in to view your upcoming meetings
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Upcoming Meetings
        </h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {syncing ? "Syncing..." : "Sync"}
        </button>
      </div>

      {/* Sync feedback */}
      {(syncError || syncSuccess) && (
        <div
          className={`px-4 py-2 text-xs ${
            syncError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {syncError || syncSuccess}
        </div>
      )}

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button
              onClick={refresh}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <svg
              className="w-10 h-10 text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600 mb-1">No upcoming meetings</p>
            <p className="text-xs text-gray-500">
              Your calendar is clear for the next 14 days
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventItem({ event }: { event: CalendarEvent }) {
  const statusColors = getStatusColor(event.status);
  const startDate = new Date(event.start_time);

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Date/time indicator */}
        <div className="flex-shrink-0 text-center w-12">
          <div className="text-xs font-medium text-gray-900">
            {startDate.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
          {!event.is_all_day && (
            <div className="text-xs text-gray-500">
              {startDate.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* Event details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {event.summary || "Untitled Event"}
            </h4>

            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${statusColors.bg} ${statusColors.text} text-xs font-medium rounded flex-shrink-0`}
            >
              <span
                className={`w-1 h-1 ${statusColors.dot} rounded-full`}
              ></span>
              {event.status.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {event.location}
            </p>
          )}

          {/* Join link */}
          {event.hangout_link && (
            <a
              href={event.hangout_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Open in external browser
                window.open(event.hangout_link!, "_blank");
              }}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Join
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export { MeetingsPanel };
