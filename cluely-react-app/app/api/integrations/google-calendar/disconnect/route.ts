import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isGoogleCalendarSyncEnabled } from '@/lib/featureFlagsServer';

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_DB2_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Check if Google Calendar sync feature is enabled
    // Note: We allow disconnect even when feature is disabled to let users remove stale connections
    const isEnabled = await isGoogleCalendarSyncEnabled();
    if (!isEnabled) {
      console.log('Google Calendar sync disabled, but allowing disconnect operation');
    }

    // Get the Authorization header (from cookie or header)
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');

    // If no Authorization header, try to get session from cookies
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (!cookieHeader) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_DB2_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY!,
        {
          global: {
            headers: { cookie: cookieHeader },
          },
        }
      );

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      token = session.access_token;
    }

    // Verify the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_DB2_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = user.id;

    // Hard delete: Delete the calendar account
    const { error: deleteAccountError } = await supabaseAdmin
      .from('google_calendar_accounts')
      .delete()
      .eq('user_id', userId);

    if (deleteAccountError) {
      console.error('Error deleting calendar account:', deleteAccountError);
      return NextResponse.json(
        { error: 'Failed to disconnect Google Calendar' },
        { status: 500 }
      );
    }

    // Hard delete: Delete all synced events for this user
    const { error: deleteEventsError } = await supabaseAdmin
      .from('user_calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'google_calendar');

    if (deleteEventsError) {
      console.error('Error deleting calendar events:', deleteEventsError);
      // Don't fail the disconnect if event deletion fails
      // The account is already disconnected
    }

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
