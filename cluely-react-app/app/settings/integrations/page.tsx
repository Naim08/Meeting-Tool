'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/context/SupabaseProvider';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { GoogleCalendarCard } from '@/components/integrations/GoogleCalendarCard';

export default function IntegrationsPage() {
  const router = useRouter();
  const { session, loading } = useSupabase();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [session, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
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
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <span className="text-gray-900 font-medium">Integrations</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-2 text-gray-600">
            Connect your favorite tools to enhance your Interview Copilot experience.
          </p>
        </div>

        {/* Integrations Grid */}
        <div className="space-y-6">
          {/* Calendar Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar</h2>
            <div className="grid gap-6">
              <GoogleCalendarCard />
            </div>
          </div>

          {/* Future integrations section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Outlook Calendar (Coming Soon) */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Outlook Calendar</h3>
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Sync your Microsoft Outlook calendar for a unified view of all your meetings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Zoom (Coming Soon) */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
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
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Zoom</h3>
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Get notified when your Zoom meetings start and join with one click.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
