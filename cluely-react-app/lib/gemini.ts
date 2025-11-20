/**
 * Google Gemini AI Client Wrapper
 *
 * Server-side only module for interacting with Gemini 2.5 Flash.
 * NEVER import this module in client-side code.
 */

import { GoogleGenAI } from '@google/genai';

// Validate API key is present (server-side only)
if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.warn(
    '[Gemini] GOOGLE_GENAI_API_KEY is not set. Classification will fall back to heuristics.'
  );
}

// Initialize Google GenAI client
const ai = process.env.GOOGLE_GENAI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })
  : null;

/**
 * Generate content with Gemini using system + user messages
 *
 * @param systemPrompt - System instructions for the AI
 * @param userPrompt - User content/query
 * @returns AI-generated text response
 */
export async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; usage: { promptTokens?: number; completionTokens?: number } }> {
  if (!ai) {
    throw new Error('GOOGLE_GENAI_API_KEY is not configured');
  }

  // Combine system prompt and user prompt
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: combinedPrompt,
    });

    const text = response.text || '';

    // Extract token usage if available
    const usage = {
      promptTokens: response.usageMetadata?.promptTokenCount,
      completionTokens: response.usageMetadata?.candidatesTokenCount,
    };

    return { text, usage };
  } catch (error) {
    console.error('[Gemini] Generation error:', error);
    throw error;
  }
}

/**
 * Generate JSON content with Gemini and parse it
 * Handles common code fence formatting from LLM responses
 *
 * @param systemPrompt - System instructions (should specify JSON output)
 * @param userPrompt - User content/query
 * @returns Parsed JSON object and token usage
 */
export async function generateJSON<T = unknown>(
  systemPrompt: string,
  userPrompt: string
): Promise<{ data: T; usage: { promptTokens?: number; completionTokens?: number } }> {
  const { text, usage } = await generateWithGemini(systemPrompt, userPrompt);

  try {
    // Handle common code fence patterns
    let jsonText = text.trim();

    // Remove markdown code fences if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7); // Remove ```json
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3); // Remove ```
    }

    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3); // Remove trailing ```
    }

    jsonText = jsonText.trim();

    // Parse JSON
    const data = JSON.parse(jsonText) as T;

    return { data, usage };
  } catch (error) {
    console.error('[Gemini] JSON parse error:', error);
    console.error('[Gemini] Raw response:', text);
    throw new Error(
      `Failed to parse JSON response from Gemini: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    );
  }
}

/**
 * Utility to mask email addresses to domains for privacy
 *
 * @example maskEmail('john@company.com') => 'company.com'
 */
export function maskEmailToDomain(email: string | null | undefined): string {
  if (!email) return 'unknown';

  const match = email.match(/@([^@]+)$/);
  return match ? match[1] : 'unknown';
}

/**
 * Extract structured logging data (no PII)
 */
export interface GeminiLogData {
  requestId: string;
  userId: string; // hashed or anonymized
  eventId: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  durationMs: number;
  status: 'ok' | 'error';
  errorCode?: string;
}

/**
 * Log structured Gemini request (no PII)
 * In production, send this to your observability platform
 */
export function logGeminiRequest(data: GeminiLogData): void {
  // Simple console logging for now
  // In production: send to Datadog, Sentry, or your logging service
  console.log('[Gemini Log]', JSON.stringify(data));
}
