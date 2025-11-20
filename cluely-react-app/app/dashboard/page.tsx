'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/SupabaseProvider';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { UpcomingMeetings } from '@/components/dashboard/UpcomingMeetings';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActions } from '@/components/dashboard/QuickActions';

import type { CalendarEvent } from '@/lib/google-calendar';

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useSupabase();

  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const { supabase } = useSupabase();

  // Fetch events for stats
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchEvents = async () => {
      const { data } = await supabase
        .from('user_calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('start_time', new Date().toISOString());

      setEvents(data || []);
      setEventsLoading(false);
    };

    fetchEvents();
  }, [session, supabase]);

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
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back{session.user.email ? `, ${session.user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here&apos;s what&apos;s happening with your interviews today.
            </p>
          </div>
          <QuickActions />
        </div>

        {/* Stats Section */}
        <DashboardStats events={events} loading={eventsLoading} />

        {/* Upcoming Meetings Section */}
        <UpcomingMeetings />
      </main>
    </div>
  );
}
