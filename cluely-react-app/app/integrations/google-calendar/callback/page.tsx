'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/SupabaseProvider';

export default function GoogleCalendarCallbackPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session - Supabase will automatically handle the OAuth callback
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session || !session.user) {
          throw new Error('No session found after OAuth callback');
        }

        // Extract provider tokens from session
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;

        if (!providerToken || !providerRefreshToken) {
          throw new Error('Missing OAuth tokens from provider. Please try again.');
        }

        // Call the API route to complete the integration with proper credentials
        const response = await fetch('/api/integrations/google-calendar/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            provider_token: providerToken,
            provider_refresh_token: providerRefreshToken,
            google_user_id: session.user.user_metadata?.sub || session.user.user_metadata?.provider_id || '',
            email: session.user.email || '',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to complete Google Calendar integration');
        }

        // Success! Show success message briefly then redirect
        setProcessing(false);
        setTimeout(() => {
          router.push('/settings/integrations');
        }, 2000);
      } catch (err) {
        console.error('Google Calendar callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Integration failed';
        setError(errorMessage);
        setProcessing(false);

        // Redirect to integrations page with error after a delay
        setTimeout(() => {
          router.push(`/settings/integrations?error=${encodeURIComponent(errorMessage)}`);
        }, 3000);
      }
    };

    handleCallback();
  }, [supabase, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connection Failed</h1>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <p className="text-xs text-gray-500">Redirecting to integrations page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 text-center">
            <div className="mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Connecting Google Calendar...
            </h1>
            <p className="text-sm text-gray-600">
              Please wait while we set up your calendar integration
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Connected Successfully!
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Your Google Calendar is now connected. We&apos;ll start syncing your events.
          </p>
          <p className="text-xs text-gray-500">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}
