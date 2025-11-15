// Supabase Edge Function: sync_all_calendars
// Syncs Google Calendar events for all users with active calendar integrations
// Called by pg_cron every hour

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  hangoutLink?: string;
  location?: string;
}

interface GoogleCalendarAccount {
  user_id: string;
  access_token: string | null;
  refresh_token: string;
  expires_at: string;
  google_user_id: string;
  email: string;
  sync_enabled: boolean;
}

async function syncUserCalendar(
  supabase: any,
  account: GoogleCalendarAccount
): Promise<{ success: boolean; eventsUpserted: number; error?: string }> {
  try {
    const userId = account.user_id;

    // Check if access token is expired and refresh if needed
    let accessToken = account.access_token;
    const expiresAt = new Date(account.expires_at);
    const now = new Date();

    if (!accessToken || expiresAt <= now) {
      // Refresh the access token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        console.error(`Token refresh failed for user ${userId}:`, await refreshResponse.text());
        // Mark sync as disabled
        await supabase
          .from('google_calendar_accounts')
          .update({ sync_enabled: false })
          .eq('user_id', userId);

        return { success: false, eventsUpserted: 0, error: 'Token refresh failed' };
      }

      const tokenData = await refreshResponse.json();
      accessToken = tokenData.access_token;

      // Update the access token in the database
      const newExpiresAt = new Date(now.getTime() + (tokenData.expires_in || 3600) * 1000);
      await supabase
        .from('google_calendar_accounts')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('user_id', userId);
    }

    // Fetch calendar events from Google Calendar API
    const windowDays = 7; // Fetch events for the next 7 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();

    const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    calendarUrl.searchParams.set('timeMin', timeMin);
    calendarUrl.searchParams.set('timeMax', timeMax);
    calendarUrl.searchParams.set('singleEvents', 'true');
    calendarUrl.searchParams.set('orderBy', 'startTime');
    calendarUrl.searchParams.set('maxResults', '100');

    const calendarResponse = await fetch(calendarUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!calendarResponse.ok) {
      console.error(`Calendar API error for user ${userId}:`, await calendarResponse.text());
      return { success: false, eventsUpserted: 0, error: 'Calendar API error' };
    }

    const calendarData = await calendarResponse.json();
    const events: CalendarEvent[] = calendarData.items || [];

    // Upsert events into the database
    let upserted = 0;

    for (const event of events) {
      // Skip events without start time
      if (!event.start?.dateTime && !event.start?.date) {
        continue;
      }

      const isAllDay = !event.start?.dateTime;
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date || startTime;

      const eventData = {
        user_id: userId,
        source: 'google_calendar',
        external_event_id: event.id,
        google_calendar_id: 'primary',
        status: event.status || 'confirmed',
        summary: event.summary || null,
        description: event.description || null,
        start_time: startTime,
        end_time: endTime,
        is_all_day: isAllDay,
        hangout_link: event.hangoutLink || null,
        location: event.location || null,
        raw_payload: event,
        last_updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('user_calendar_events')
        .upsert(eventData, {
          onConflict: 'user_id,source,external_event_id',
        });

      if (!upsertError) {
        upserted++;
      }
    }

    // Update last_sync_at
    await supabase
      .from('google_calendar_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return { success: true, eventsUpserted: upserted };
  } catch (error) {
    console.error(`Sync error for user ${account.user_id}:`, error);
    return { success: false, eventsUpserted: 0, error: String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all enabled calendar accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('google_calendar_accounts')
      .select('*')
      .eq('sync_enabled', true);

    if (accountsError) {
      console.error('Error fetching calendar accounts:', accountsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calendar accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No enabled calendar accounts to sync',
          total_users: 0,
          successful_syncs: 0,
          failed_syncs: 0,
          total_events_synced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync each account
    const results = await Promise.all(
      accounts.map((account: GoogleCalendarAccount) => syncUserCalendar(supabase, account))
    );

    const successfulSyncs = results.filter((r) => r.success).length;
    const failedSyncs = results.filter((r) => !r.success).length;
    const totalEventsSynced = results.reduce((sum, r) => sum + r.eventsUpserted, 0);

    const executionTimeMs = Date.now() - startTime;

    // Log to calendar_sync_logs table
    await supabase.from('calendar_sync_logs').insert({
      executed_at: new Date().toISOString(),
      status: 'success',
      users_synced: successfulSyncs,
      events_synced: totalEventsSynced,
      errors_count: failedSyncs,
      execution_time_ms: executionTimeMs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Batch sync completed',
        total_users: accounts.length,
        successful_syncs: successfulSyncs,
        failed_syncs: failedSyncs,
        total_events_synced: totalEventsSynced,
        execution_time_ms: executionTimeMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Batch sync error:', error);

    // Log error to calendar_sync_logs table
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('calendar_sync_logs').insert({
        executed_at: new Date().toISOString(),
        status: 'error',
        error_details: { message: String(error) },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
