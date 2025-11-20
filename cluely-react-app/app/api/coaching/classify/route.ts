/**
 * POST /api/coaching/classify
 *
 * Classifies interview questions into categories for the timing coach.
 * Returns question type, confidence, and optional budget override.
 *
 * This endpoint:
 * - Uses Gemini for classification with strict timeout
 * - Caches normalized questions briefly (5-minute TTL)
 * - Falls back to UNKNOWN on timeout or low confidence
 * - No authentication required (called from Electron app)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/gemini';

// Question types enum (matches Electron types)
enum QuestionType {
  TELL_ME_ABOUT_YOURSELF = 'tell_me_about_yourself',
  PROJECT_DEEP_DIVE = 'project_deep_dive',
  BEHAVIORAL_STAR = 'behavioral_star',
  SYSTEM_DESIGN = 'system_design',
  CODING_EXPLANATION = 'coding_explanation',
  QA_LIGHT = 'qa_light',
  UNKNOWN = 'unknown',
}

// Classification response shape
interface ClassificationResponse {
  type: QuestionType;
  confidence: number;
  recommendedSeconds?: number;
}

// Simple in-memory cache (process-level)
const classificationCache = new Map<
  string,
  { response: ClassificationResponse; expiresAt: number }
>();

// Clean expired cache entries periodically
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of classificationCache) {
    if (value.expiresAt < now) {
      classificationCache.delete(key);
    }
  }
}

// Normalize question for caching
function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

// System prompt for classification
const CLASSIFICATION_SYSTEM_PROMPT = `You are an interview question classifier. Your job is to categorize interview questions into one of these types:

1. "tell_me_about_yourself" - Questions about background, introduction, career story
   Examples: "Tell me about yourself", "Walk me through your background", "Introduce yourself"

2. "project_deep_dive" - Questions about specific projects, achievements, most challenging work
   Examples: "Tell me about a project you're proud of", "Describe your most challenging project"

3. "behavioral_star" - Behavioral questions using STAR method (Situation, Task, Action, Result)
   Examples: "Tell me about a time you faced a conflict", "Describe a failure", "Leadership experience"

4. "system_design" - Technical system design questions
   Examples: "Design a URL shortener", "How would you architect this system", "Scale this service"

5. "coding_explanation" - Questions about code, algorithms, tradeoffs
   Examples: "Explain your approach to this algorithm", "What's the time complexity", "Coding tradeoffs"

6. "qa_light" - Light Q&A about company, timeline, compensation
   Examples: "Why this company", "Timeline expectations", "Questions for us"

7. "unknown" - If the question doesn't clearly fit any category

Respond with ONLY a JSON object (no markdown fences) in this exact format:
{
  "type": "one_of_the_types_above",
  "confidence": 0.0-1.0,
  "recommendedSeconds": optional_number_or_null
}

The recommendedSeconds field should only be set if you have strong reason to believe the default budget should be adjusted. Otherwise, omit it or set to null.

Be conservative with confidence scores:
- 0.9+ : Very clear match
- 0.7-0.9: Good match with some ambiguity
- 0.5-0.7: Uncertain, could be multiple types
- <0.5: Not confident, consider unknown`;

// Validate classification response
function validateClassification(data: unknown): ClassificationResponse | null {
  if (!data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  if (typeof obj.type !== 'string') return null;
  if (typeof obj.confidence !== 'number') return null;
  if (obj.confidence < 0 || obj.confidence > 1) return null;

  // Validate type is one of the enum values
  const validTypes = Object.values(QuestionType);
  if (!validTypes.includes(obj.type as QuestionType)) {
    return null;
  }

  return {
    type: obj.type as QuestionType,
    confidence: obj.confidence,
    recommendedSeconds:
      typeof obj.recommendedSeconds === 'number' ? obj.recommendedSeconds : undefined,
  };
}

// Heuristic fallback classification
function heuristicClassification(questionText: string): ClassificationResponse {
  const lower = questionText.toLowerCase();

  if (
    lower.includes('tell me about yourself') ||
    lower.includes('walk me through your background') ||
    lower.includes('introduce yourself')
  ) {
    return { type: QuestionType.TELL_ME_ABOUT_YOURSELF, confidence: 0.8 };
  }

  if (
    lower.includes('project') ||
    lower.includes('most challenging') ||
    lower.includes('proud of')
  ) {
    return { type: QuestionType.PROJECT_DEEP_DIVE, confidence: 0.7 };
  }

  if (
    lower.includes('conflict') ||
    lower.includes('challenge') ||
    lower.includes('failure') ||
    lower.includes('leadership') ||
    lower.includes('difficult situation') ||
    lower.includes('disagreed')
  ) {
    return { type: QuestionType.BEHAVIORAL_STAR, confidence: 0.75 };
  }

  if (
    lower.includes('design') ||
    lower.includes('architect') ||
    lower.includes('scale') ||
    lower.includes('system')
  ) {
    return { type: QuestionType.SYSTEM_DESIGN, confidence: 0.7 };
  }

  if (
    lower.includes('code') ||
    lower.includes('algorithm') ||
    lower.includes('implement') ||
    lower.includes('tradeoff') ||
    lower.includes('complexity')
  ) {
    return { type: QuestionType.CODING_EXPLANATION, confidence: 0.7 };
  }

  if (
    lower.includes('why us') ||
    lower.includes('why this company') ||
    lower.includes('timeline') ||
    lower.includes('salary') ||
    lower.includes('compensation') ||
    lower.includes('questions for')
  ) {
    return { type: QuestionType.QA_LIGHT, confidence: 0.75 };
  }

  return { type: QuestionType.UNKNOWN, confidence: 0.5 };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { questionText, context } = body;

    if (!questionText || typeof questionText !== 'string') {
      return NextResponse.json({ error: 'questionText is required' }, { status: 400 });
    }

    // Normalize for caching
    const normalized = normalizeQuestion(questionText);
    if (!normalized) {
      return NextResponse.json(
        { type: QuestionType.UNKNOWN, confidence: 0.3 },
        { status: 200 }
      );
    }

    // Check cache first
    cleanCache();
    const cached = classificationCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('[Classify] Cache hit for:', normalized.substring(0, 50));
      return NextResponse.json(cached.response, {
        status: 200,
        headers: { 'X-Cache': 'HIT' },
      });
    }

    // Call Gemini with timeout
    const timeoutMs = 2000; // p95 target
    const maxTimeoutMs = 5000; // p99 hard limit (increased for Gemini 2.5)

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Classification timeout')), maxTimeoutMs);
      });

      // Build user prompt
      const userPrompt = context
        ? `Question: "${questionText}"\n\nContext: ${context}`
        : `Question: "${questionText}"`;

      // Race against timeout
      const { data } = await Promise.race([
        generateJSON(CLASSIFICATION_SYSTEM_PROMPT, userPrompt),
        timeoutPromise,
      ]);

      // Validate response
      const validated = validateClassification(data);

      if (!validated) {
        console.warn('[Classify] Invalid response from Gemini, using heuristics');
        const fallback = heuristicClassification(questionText);
        cacheResponse(normalized, fallback);
        return NextResponse.json(fallback, { status: 200 });
      }

      // Cache and return
      cacheResponse(normalized, validated);

      const duration = Date.now() - startTime;
      console.log(
        `[Classify] ${validated.type} (${validated.confidence.toFixed(2)}) in ${duration}ms`
      );

      return NextResponse.json(validated, {
        status: 200,
        headers: { 'X-Duration-Ms': duration.toString() },
      });
    } catch (llmError) {
      // LLM failed or timed out, use heuristics
      console.warn('[Classify] LLM error, using heuristics:', llmError);
      const fallback = heuristicClassification(questionText);
      cacheResponse(normalized, fallback);
      return NextResponse.json(fallback, {
        status: 200,
        headers: { 'X-Fallback': 'heuristic' },
      });
    }
  } catch (error) {
    console.error('[Classify] Unexpected error:', error);
    return NextResponse.json(
      { type: QuestionType.UNKNOWN, confidence: 0.3 },
      { status: 200 } // Return 200 even on error, let client handle gracefully
    );
  }
}

// Helper to cache response
function cacheResponse(normalized: string, response: ClassificationResponse) {
  classificationCache.set(normalized, {
    response,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute TTL
  });
}
