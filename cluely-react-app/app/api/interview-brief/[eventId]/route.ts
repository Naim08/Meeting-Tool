/**
 * GET /api/interview-brief/:eventId
 *
 * Fetches a cached AI interview brief for a calendar event.
 * Returns null if no brief exists. RLS enforced via Supabase JWT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // 1. Get user session (validate authentication)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's JWT for RLS
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // 2. Fetch brief (RLS automatically enforces user_id match)
    const { data: brief, error: briefError } = await supabase
      .from('interview_briefs')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (briefError) {
      console.error('[Get Brief] Fetch error:', briefError);
      return NextResponse.json({ error: 'Failed to fetch brief' }, { status: 500 });
    }

    // 3. Return brief or null if not found
    if (!brief) {
      return NextResponse.json({ brief: null }, { status: 200 });
    }

    return NextResponse.json({
      brief: brief.brief,
      model: brief.model,
      tokens: {
        prompt: brief.prompt_tokens,
        completion: brief.completion_tokens,
      },
      generated_at: brief.created_at, // Map created_at to generated_at for backward compatibility
      created_at: brief.created_at,
      updated_at: brief.updated_at,
      regenerated_count: brief.regenerated_count,
      stale: brief.stale,
      status: brief.status,
      error_code: brief.error_code,
    });
  } catch (error) {
    console.error('[Get Brief] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
