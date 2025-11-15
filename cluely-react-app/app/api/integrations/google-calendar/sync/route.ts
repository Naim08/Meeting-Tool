import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get the Authorization header (from cookie or header)
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    let session = null;

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

      const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      session = sessionData;
      token = session.access_token;
    } else {
      // Verify the token if provided via Authorization header
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_DB2_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY!
      );

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }

      // Create a session object for the edge function call
      session = { access_token: token, user };
    }

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Call the Supabase Edge Function to sync calendar
    const syncResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_DB2_URL}/functions/v1/sync_google_calendar`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('Sync function error:', errorText);

      // Check for common error messages
      if (errorText.includes('reconnect') || errorText.includes('invalid')) {
        return NextResponse.json(
          { error: 'Your calendar connection has expired. Please reconnect.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to sync calendar. Please try again later.' },
        { status: 500 }
      );
    }

    const result = await syncResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Calendar synced successfully',
      ...result,
    });
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
