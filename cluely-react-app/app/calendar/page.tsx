'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/context/SupabaseProvider';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  useUpcomingEvents,
  formatEventTime,
  getStatusColor,
  type CalendarEvent,
} from '@/hooks/useUpcomingEvents';

export default function CalendarPage() {
  const router = useRouter();
  const { supabase, session, loading: authLoading } = useSupabase();
  const { events, loading: eventsLoading, error, refresh } = useUpcomingEvents();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [session, authLoading, router]);

  // Manual sync handler
  const handleSync = async () => {
    setSyncError(null);
    setSyncSuccess(null);
    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync_google_calendar');

      if (error) {
        throw error;
      }

      setSyncSuccess(`Synced ${data.upserted} events successfully`);
      // Refresh the events list
      await refresh();

      // Clear success message after 5 seconds
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err) {
      console.error('Sync error:', err);
      setSyncError(
        err instanceof Error ? err.message : 'Failed to sync calendar'
      );
    } finally {
      setSyncing(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </li>
            <li>
              <span className="text-gray-900 font-medium">Calendar</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Upcoming Meetings
            </h1>
            <p className="mt-2 text-gray-600">
              Your upcoming meetings and events for the next 14 days.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
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
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Sync feedback */}
        {syncError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {syncError}
            </div>
          </div>
        )}

        {syncSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {syncSuccess}
            </div>
          </div>
        )}

        {/* Events list */}
        {eventsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Error loading events
            </h3>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={refresh}
              className="mt-4 text-sm text-red-700 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No upcoming meetings
            </h3>
            <p className="text-gray-600 mb-6">
              Your calendar is clear for the next 14 days.
            </p>
            <Link
              href="/settings/integrations"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Connect Google Calendar
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const statusColors = getStatusColor(event.status);
  const timeDisplay = formatEventTime(
    event.start_time,
    event.end_time,
    event.is_all_day
  );

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Time indicator */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className="text-sm font-medium text-gray-900">
            {new Date(event.start_time).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          {!event.is_all_day && (
            <div className="text-xs text-gray-500">
              {new Date(event.start_time).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        {/* Event details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {event.summary || 'Untitled Event'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{timeDisplay}</p>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 ${statusColors.bg} ${statusColors.text} text-xs font-medium rounded-full`}
              >
                <span
                  className={`w-1.5 h-1.5 ${statusColors.dot} rounded-full`}
                ></span>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>

              {/* Source badge */}
              <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {event.source === 'google_calendar' ? 'Google' : event.source}
              </span>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Join link */}
          {event.hangout_link && (
            <a
              href={event.hangout_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
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
              Join Meeting
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
