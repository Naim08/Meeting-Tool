/**
 * POST /api/interview-brief/regenerate
 *
 * Regenerates an existing AI interview brief for a calendar event.
 * Increments the regeneration counter and clears the stale flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJSON, logGeminiRequest } from '@/lib/gemini';
import {
  getInterviewBriefSystemPrompt,
  buildEventPrompt,
  validateBrief,
  extractEventPayload,
  type CalendarEvent,
} from '@/lib/interview-prompt';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // 1. Parse request body
    const body = await request.json();
    const { event_id } = body;

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    // 2. Get user session (validate authentication)
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
    const userHash = createHash('sha256').update(userId).digest('hex').slice(0, 16);

    // 3. Fetch event and verify ownership
    const { data: event, error: eventError } = await supabase
      .from('user_calendar_events')
      .select('*')
      .eq('id', event_id)
      .eq('user_id', userId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Check if event is an interview (considering override)
    const isInterview = event.interview_override ?? event.is_interview;

    if (!isInterview) {
      return NextResponse.json(
        { error: 'Event is not marked as an interview' },
        { status: 400 }
      );
    }

    // 5. Get existing brief (if any) to increment counter
    const { data: existingBrief } = await supabase
      .from('interview_briefs')
      .select('regenerated_count')
      .eq('user_id', userId)
      .eq('event_id', event_id)
      .single();

    const currentCount = existingBrief?.regenerated_count || 0;

    // 6. Set brief status to 'in_progress'
    const { error: updateError } = await supabase
      .from('interview_briefs')
      .upsert(
        {
          user_id: userId,
          event_id: event_id,
          status: 'in_progress',
          stale: false,
          brief: {}, // Placeholder
          model: 'gemini-2.5-flash',
          regenerated_count: currentCount, // Keep current count during generation
        },
        {
          onConflict: 'user_id,event_id',
          ignoreDuplicates: false,
        }
      );

    if (updateError) {
      console.error('[Regenerate Brief] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to initialize brief regeneration' },
        { status: 500 }
      );
    }

    // 7. Build prompt from event data
    const eventPayload = extractEventPayload(event as CalendarEvent);
    const systemPrompt = getInterviewBriefSystemPrompt();
    const userPrompt = buildEventPrompt(eventPayload);

    // 8. Call Gemini (with retry on parse failure)
    let briefData;
    let usage = { promptTokens: 0, completionTokens: 0 };

    try {
      const { data, usage: llmUsage } = await generateJSON(systemPrompt, userPrompt);
      usage = llmUsage;

      // Validate schema
      const validation = validateBrief(data);
      if (!validation.success) {
        // Retry once with format correction prompt
        console.warn('[Regenerate Brief] Initial validation failed, retrying...');

        const correctionPrompt = `${systemPrompt}\n\n**CORRECTION NEEDED:** Your previous output had validation errors: ${validation.error}\n\nPlease regenerate the JSON ensuring it strictly matches the schema.`;

        const retryResult = await generateJSON(correctionPrompt, userPrompt);
        usage.promptTokens = (usage.promptTokens || 0) + (retryResult.usage.promptTokens || 0);
        usage.completionTokens = (usage.completionTokens || 0) + (retryResult.usage.completionTokens || 0);

        const retryValidation = validateBrief(retryResult.data);
        if (!retryValidation.success) {
          throw new Error(`Validation failed after retry: ${retryValidation.error}`);
        }

        briefData = retryValidation.data;
      } else {
        briefData = validation.data;
      }
    } catch (llmError) {
      console.error('[Regenerate Brief] LLM error:', llmError);

      // Update status to error
      await supabase
        .from('interview_briefs')
        .update({
          status: 'error',
          error_code: 'llm_generation_failed',
        })
        .eq('user_id', userId)
        .eq('event_id', event_id);

      // Log failure
      logGeminiRequest({
        requestId,
        userId: userHash,
        eventId: event_id,
        model: 'gemini-2.5-flash',
        durationMs: Date.now() - startTime,
        status: 'error',
        errorCode: 'llm_generation_failed',
      });

      return NextResponse.json(
        { error: 'Failed to regenerate brief with AI' },
        { status: 500 }
      );
    }

    // 9. Save brief to database with incremented counter
    const { error: saveError } = await supabase
      .from('interview_briefs')
      .update({
        brief: briefData,
        model: 'gemini-2.5-flash',
        prompt_tokens: usage.promptTokens || null,
        completion_tokens: usage.completionTokens || null,
        // Note: updated_at is automatically set by database trigger
        regenerated_count: currentCount + 1, // Increment counter
        status: 'ready',
        stale: false,
        error_code: null,
      })
      .eq('user_id', userId)
      .eq('event_id', event_id);

    if (saveError) {
      console.error('[Regenerate Brief] Save error:', saveError);
      return NextResponse.json({ error: 'Failed to save brief' }, { status: 500 });
    }

    // 10. Log success
    logGeminiRequest({
      requestId,
      userId: userHash,
      eventId: event_id,
      model: 'gemini-2.5-flash',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      durationMs: Date.now() - startTime,
      status: 'ok',
    });

    // 11. Return brief
    return NextResponse.json({
      brief: briefData,
      model: 'gemini-2.5-flash',
      tokens: {
        prompt: usage.promptTokens,
        completion: usage.completionTokens,
      },
      generated_at: new Date().toISOString(),
      regenerated_count: currentCount + 1,
    });
  } catch (error) {
    console.error('[Regenerate Brief] Unexpected error:', error);

    // Log failure
    logGeminiRequest({
      requestId,
      userId: 'unknown',
      eventId: 'unknown',
      model: 'gemini-2.5-flash',
      durationMs: Date.now() - startTime,
      status: 'error',
      errorCode: 'unexpected_error',
    });

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
