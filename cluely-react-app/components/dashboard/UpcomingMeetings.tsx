'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/context/SupabaseProvider';
import type { CalendarEvent, GoogleCalendarAccount } from '@/lib/google-calendar';
import { formatRelativeTime } from '@/lib/google-calendar';
import { MeetingCard } from './MeetingCard';

export function UpcomingMeetings() {
  const { supabase, session } = useSupabase();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarAccount, setCalendarAccount] = useState<GoogleCalendarAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch calendar account info
  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchCalendarAccount = async () => {
      const { data, error } = await supabase
        .from('google_calendar_accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching calendar account:', error);
      } else {
        setCalendarAccount(data);
      }
    };

    fetchCalendarAccount();
  }, [session, supabase]);

  // Fetch upcoming events
  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('user_calendar_events')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(20);

        if (error) throw error;

        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching calendar events:', err);
        setError('Failed to load calendar events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [session, supabase]);

  // Handle manual sync
  const handleSync = async () => {
    if (!calendarAccount || syncing) return;

    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      // Refresh events after sync
      const { data } = await supabase
        .from('user_calendar_events')
        .select('*')
        .eq('user_id', session!.user.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20);

      setEvents(data || []);

      // Refresh calendar account to get updated last_sync_at
      const { data: accountData } = await supabase
        .from('google_calendar_accounts')
        .select('*')
        .eq('user_id', session!.user.id)
        .maybeSingle();

      setCalendarAccount(accountData);
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  };

  // No calendar connected state
  if (!loading && !calendarAccount) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="w-full h-full"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No calendar connected
          </h3>
          <p className="text-gray-600 mb-6">
            Connect your Google Calendar to see upcoming meetings and interviews.
          </p>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Google Calendar
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // No upcoming events state
  if (events.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header with sync info */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Upcoming Meetings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Last synced: {formatRelativeTime(calendarAccount?.last_sync_at || null)}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Empty state */}
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-full h-full"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No upcoming meetings
            </h3>
            <p className="text-gray-600">
              You don&apos;t have any meetings scheduled in the next 7 days.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Events list
  return (
    <div className="space-y-6">
      {/* Header with sync info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Upcoming Meetings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Last synced: {formatRelativeTime(calendarAccount?.last_sync_at || null)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            Settings
          </Link>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Events grid */}
      <div className="grid gap-4">
        {events.map((event) => (
          <MeetingCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
