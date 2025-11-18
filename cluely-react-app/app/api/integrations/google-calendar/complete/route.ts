import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isGoogleCalendarSyncEnabled } from '@/lib/featureFlagsServer';

export async function POST(request: NextRequest) {
  try {
    // Check if Google Calendar sync feature is enabled
    const isEnabled = await isGoogleCalendarSyncEnabled();
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Google Calendar integration is temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');

    // Create a Supabase client with user's JWT (RLS will handle permissions)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_DB2_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = user.id;

    // Get tokens and metadata from request body
    const body = await request.json();
    const {
      provider_token: providerToken,
      provider_refresh_token: providerRefreshToken,
      google_user_id: googleUserId,
      email,
    } = body;

    if (!providerToken || !providerRefreshToken) {
      return NextResponse.json(
        { error: 'Missing OAuth tokens. Please try reconnecting.' },
        { status: 400 }
      );
    }

    // Calculate token expiry (typically 1 hour from now for Google tokens)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // Upsert the calendar account (RLS allows user to insert/update their own record)
    const { error: upsertError } = await supabase
      .from('google_calendar_accounts')
      .upsert(
        {
          user_id: userId,
          google_user_id: googleUserId,
          email: email,
          access_token: providerToken,
          refresh_token: providerRefreshToken,
          expires_at: expiresAt,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          primary_calendar_id: 'primary',
          sync_enabled: true,
          connected_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      console.error('Error upserting calendar account:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save calendar integration' },
        { status: 500 }
      );
    }

    // Trigger an immediate sync
    try {
      const syncResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_DB2_URL}/functions/v1/sync_google_calendar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!syncResponse.ok) {
        console.error('Initial sync failed (non-blocking):', await syncResponse.text());
      }
    } catch (syncError) {
      console.error('Initial sync failed (non-blocking):', syncError);
      // Don't fail the integration if initial sync fails
    }

    return NextResponse.json({
      success: true,
      message: 'Google Calendar connected successfully',
    });
  } catch (error) {
    console.error('Complete integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
