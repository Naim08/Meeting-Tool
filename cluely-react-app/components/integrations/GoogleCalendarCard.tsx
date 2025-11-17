'use client';

import React, { useEffect, useState } from 'react';
import { useSupabase } from '@/context/SupabaseProvider';
import type { GoogleCalendarAccount } from '@/lib/google-calendar';
import { formatRelativeTime } from '@/lib/google-calendar';

export function GoogleCalendarCard() {
  const { supabase, session } = useSupabase();
  const [calendarAccount, setCalendarAccount] = useState<GoogleCalendarAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch calendar account
  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchCalendarAccount = async () => {
      try {
        const { data, error } = await supabase
          .from('google_calendar_accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        setCalendarAccount(data);
      } catch (err) {
        console.error('Error fetching calendar account:', err);
        setError('Failed to load calendar integration status');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarAccount();
  }, [session, supabase]);

  // Connect Google Calendar
  const handleConnect = async () => {
    setError(null);
    setSuccess(null);
    setConnecting(true);

    try {
      const siteUrl =
        typeof window !== 'undefined'
          ? window.location.origin || 'http://localhost:3000'
          : 'http://localhost:3000';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/integrations/google-calendar/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // Browser will redirect, so we don't need to do anything else
    } catch (err) {
      console.error('Connect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Google Calendar');
      setConnecting(false);
    }
  };

  // Disconnect Google Calendar
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar? Your synced events will be removed.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setDisconnecting(true);

    try {
      // Get access token from session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch('/api/integrations/google-calendar/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Disconnect failed');
      }

      setCalendarAccount(null);
      setSuccess('Google Calendar disconnected successfully');
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect Google Calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  // Manual sync
  const handleSync = async () => {
    setError(null);
    setSuccess(null);
    setSyncing(true);

    try {
      // Get access token from session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();

      // Refresh calendar account to get updated last_sync_at
      const { data } = await supabase
        .from('google_calendar_accounts')
        .select('*')
        .eq('user_id', session!.user.id)
        .maybeSingle();

      setCalendarAccount(data);
      setSuccess(`Synced ${result.upserted} events successfully`);
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!calendarAccount) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          {/* Calendar Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
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
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Calendar</h3>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Google Calendar to automatically sync upcoming meetings and interviews.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Connect Google Calendar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        {/* Calendar Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-600"
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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Connected: {calendarAccount.email}</p>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p>Last synced: {formatRelativeTime(calendarAccount.last_sync_at)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Automatic sync runs every hour
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing || !calendarAccount.sync_enabled}
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

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? 'Reconnecting...' : 'Reconnect'}
            </button>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
