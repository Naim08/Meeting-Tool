// Supabase Edge Function: sync_google_calendar
// Syncs Google Calendar events for a single authenticated user

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Fetch user's Google Calendar account
    const { data: calendarAccount, error: accountError } = await supabase
      .from('google_calendar_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (accountError || !calendarAccount) {
      return new Response(
        JSON.stringify({ error: 'No Google Calendar account found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!calendarAccount.sync_enabled) {
      return new Response(
        JSON.stringify({ error: 'Calendar sync is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if access token is expired and refresh if needed
    let accessToken = calendarAccount.access_token;
    const expiresAt = new Date(calendarAccount.expires_at);
    const now = new Date();

    if (!accessToken || expiresAt <= now) {
      // Refresh the access token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: calendarAccount.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        console.error('Token refresh failed:', await refreshResponse.text());
        // Mark sync as disabled
        await supabase
          .from('google_calendar_accounts')
          .update({ sync_enabled: false })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect your calendar.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
    const windowDays = 14; // Fetch events for the next 14 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all events with pagination support
    const events: CalendarEvent[] = [];
    let nextPageToken: string | undefined;

    do {
      const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      calendarUrl.searchParams.set('timeMin', timeMin);
      calendarUrl.searchParams.set('timeMax', timeMax);
      calendarUrl.searchParams.set('singleEvents', 'true');
      calendarUrl.searchParams.set('orderBy', 'startTime');
      calendarUrl.searchParams.set('maxResults', '250'); // Max allowed by Google API

      if (nextPageToken) {
        calendarUrl.searchParams.set('pageToken', nextPageToken);
      }

      const calendarResponse = await fetch(calendarUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!calendarResponse.ok) {
        console.error('Calendar API error:', await calendarResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calendar events' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const calendarData = await calendarResponse.json();
      const pageEvents: CalendarEvent[] = calendarData.items || [];
      events.push(...pageEvents);

      nextPageToken = calendarData.nextPageToken;
    } while (nextPageToken);

    // Upsert events into the database
    let upserted = 0;
    let skipped = 0;
    let cancelled = 0;

    for (const event of events) {
      // Skip events without start time
      if (!event.start?.dateTime && !event.start?.date) {
        skipped++;
        continue;
      }

      const isAllDay = !event.start?.dateTime;
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date || startTime;
      const status = event.status || 'confirmed';

      // Track cancelled events
      if (status === 'cancelled') {
        cancelled++;
      }

      const eventData = {
        user_id: userId,
        source: 'google_calendar',
        external_event_id: event.id,
        google_calendar_id: 'primary',
        status,
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

      if (upsertError) {
        console.error('Error upserting event:', upsertError);
        skipped++;
      } else {
        upserted++;
      }
    }

    // Update last_sync_at
    await supabase
      .from('google_calendar_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: events.length,
        upserted,
        skipped,
        cancelled,
        window_start: timeMin,
        window_end: timeMax,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
