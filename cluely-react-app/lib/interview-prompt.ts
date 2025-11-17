/**
 * Interview Brief Prompt Engineering & Validation
 *
 * Defines the structured schema for AI-generated interview briefs
 * and provides prompt templates for Gemini 2.5 Flash.
 */

import { z } from 'zod';
import { maskEmailToDomain } from './gemini';

// ============================================================================
// Zod Schema for Interview Brief Structure
// ============================================================================

export const InterviewBriefSchema = z.object({
  company_snapshot: z.object({
    inferred_company: z.string().describe('Company name or domain inferred from event'),
    quick_facts: z.array(z.string()).max(3).describe('2-3 quick facts about the company'),
  }),

  role_hypothesis: z.object({
    likely_role: z.string().describe('Best guess at the role based on event context'),
    seniority_guess: z.string().describe('Estimated seniority level'),
    team_context: z.string().optional().describe('Potential team or department'),
  }),

  interviewer_angle: z.array(z.object({
    angle: z.string().describe('Perspective or concern of interviewer'),
    why_it_matters: z.string().describe('Why this angle is important'),
  })).max(3).describe('Key interviewer perspectives to address'),

  likely_topics: z.array(z.object({
    topic: z.string().describe('Topic name'),
    why_asked: z.string().describe('Why this topic might come up'),
  })).max(5).describe('Topics likely to be covered'),

  prep_checklist: z.object({
    today: z.array(z.string()).max(3).describe('Things to prep today'),
    just_before: z.array(z.string()).max(3).describe('Quick refreshers right before interview'),
  }),

  stories_to_prepare: z.array(z.object({
    situation: z.string().describe('Type of situation/story'),
    why_valuable: z.string().describe('Why this story would be valuable'),
  })).max(4).describe('STAR stories to prepare'),

  smart_questions: z.array(z.object({
    question: z.string().describe('Question to ask interviewer'),
    signals: z.string().describe('What this question reveals'),
  })).max(4).describe('Thoughtful questions to ask'),

  risk_flags: z.array(z.string()).max(3).describe('Potential pitfalls or red flags to watch for'),

  one_liners: z.object({
    intro_30s: z.string().max(200).describe('Concise 30-second intro'),
    closing_30s: z.string().max(200).describe('Memorable 30-second closing'),
  }),
});

export type InterviewBrief = z.infer<typeof InterviewBriefSchema>;

// ============================================================================
// Event Data Structure (minimal payload for LLM)
// ============================================================================

export interface EventPayload {
  summary: string;
  description?: string;
  startTime: string; // ISO format
  endTime: string;
  location?: string;
  meetingUrl?: string;
  organizerDomain?: string; // Masked email domain
}

// ============================================================================
// System Prompt for Gemini
// ============================================================================

export function getInterviewBriefSystemPrompt(): string {
  return `You are Interview Copilot, an AI assistant that generates concise, high-value interview preparation briefs.

**Your task:**
Given minimal event metadata (title, description, time, location, organizer domain), produce a structured JSON brief that helps the candidate prepare effectively.

**Output requirements:**
1. Return ONLY valid JSON matching the exact schema provided
2. Be concise: maximum ~350 tokens total
3. Focus on actionable insights, not generic advice
4. Make smart inferences from limited data
5. If uncertain, make educated guesses marked with phrases like "likely", "possibly", "appears to be"

**JSON Schema:**
{
  "company_snapshot": {
    "inferred_company": "string (company name or domain)",
    "quick_facts": ["string", "string", "string"] // 2-3 facts
  },
  "role_hypothesis": {
    "likely_role": "string",
    "seniority_guess": "string",
    "team_context": "string (optional)"
  },
  "interviewer_angle": [
    {
      "angle": "string",
      "why_it_matters": "string"
    }
  ], // max 3
  "likely_topics": [
    {
      "topic": "string",
      "why_asked": "string"
    }
  ], // max 5
  "prep_checklist": {
    "today": ["string", "string", "string"], // max 3
    "just_before": ["string", "string", "string"] // max 3
  },
  "stories_to_prepare": [
    {
      "situation": "string",
      "why_valuable": "string"
    }
  ], // max 4
  "smart_questions": [
    {
      "question": "string",
      "signals": "string"
    }
  ], // max 4
  "risk_flags": ["string", "string", "string"], // max 3
  "one_liners": {
    "intro_30s": "string (max 200 chars)",
    "closing_30s": "string (max 200 chars)"
  }
}

**Guidelines:**
- Infer company from event metadata or organizer domain
- Tailor advice to the specific context (e.g., tech screen vs. behavioral)
- Prioritize quality over quantity—every item should add value
- Use professional, encouraging tone
- Be specific where possible, generic only when necessary

**Output format:**
Return ONLY the JSON object. No explanatory text before or after. You may wrap it in \`\`\`json ... \`\`\` if needed.`;
}

// ============================================================================
// Build User Prompt from Event Data
// ============================================================================

export function buildEventPrompt(event: EventPayload): string {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

  return JSON.stringify(
    {
      event_title: event.summary,
      description: event.description || '(no description provided)',
      scheduled_for: startDate.toISOString(),
      duration_minutes: durationMinutes,
      location: event.location || '(not specified)',
      meeting_url: event.meetingUrl || null,
      organizer_domain: event.organizerDomain || 'unknown',
    },
    null,
    2
  );
}

// ============================================================================
// Validation & Retry Logic
// ============================================================================

export interface ValidationResult {
  success: boolean;
  data?: InterviewBrief;
  error?: string;
}

/**
 * Validate LLM-generated JSON against schema
 */
export function validateBrief(jsonData: unknown): ValidationResult {
  try {
    const validated = InterviewBriefSchema.parse(jsonData);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return { success: false, error: `Schema validation failed: ${issues}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

// ============================================================================
// Helper: Extract Event Payload from Calendar Event
// ============================================================================

export interface CalendarEvent {
  id: string;
  user_id: string;
  summary: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  hangout_link?: string | null;
  raw_payload?: any;
}

export function extractEventPayload(event: CalendarEvent): EventPayload {
  // Try to extract organizer email from raw_payload (Google Calendar format)
  let organizerDomain: string | undefined;

  if (event.raw_payload?.organizer?.email) {
    organizerDomain = maskEmailToDomain(event.raw_payload.organizer.email);
  }

  return {
    summary: event.summary || 'Untitled Interview',
    description: event.description || undefined,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location || undefined,
    meetingUrl: event.hangout_link || undefined,
    organizerDomain,
  };
}
