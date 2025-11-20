/**
 * TranscriptAggregator - Single aggregation/routing layer for transcript events
 *
 * Responsibilities:
 * - Ingests events from both microphone (Deepgram) and system audio (AssemblyAI)
 * - Collapses partial→final updates in place (same speaker+timeWindow = update)
 * - Deduplicates cross-engine echoes using time windows and text similarity
 * - Emits idempotent, versioned events to renderers
 * - Routes events: unified mode → floating window only (main app mirroring opt-in)
 */

import { randomUUID } from "crypto";
import type { AudioSource, TranscriptUpdateData } from "../../types/unified-recording";

// Segment state for tracking partials and finals
interface AggregatedSegment {
  id: string;
  version: number;
  text: string;
  normalizedText: string;
  speaker: string | null;
  source: AudioSource;
  isFinal: boolean;
  timestamp: number;
  startTime: number | null;
  endTime: number | null;
  confidence: number | null;
  words?: Array<{
    text: string;
    speaker?: string;
    start: number;
    end: number;
  }>;
  emittedAt: number | null;
  suppressedAsDuplicate: boolean;
}

// Configuration for deduplication
interface AggregatorConfig {
  echoTimeWindowMs: number; // Time window for cross-engine echo detection
  textSimilarityThreshold: number; // 0.0-1.0, minimum similarity to consider duplicate
  partialUpdateWindowMs: number; // Time window for partial→final collapse
  maxSegmentBufferSize: number; // Maximum segments to keep in buffer
  staleSegmentTimeoutMs: number; // Remove stale partials after this time
}

// Event emitter callback types
type TranscriptEventCallback = (segment: TranscriptUpdateData, segmentId: string, version: number) => void;
type InterviewerQuestionCallback = (segment: AggregatedSegment) => void;

const DEFAULT_CONFIG: AggregatorConfig = {
  echoTimeWindowMs: 500,
  textSimilarityThreshold: 0.6,
  partialUpdateWindowMs: 2000,
  maxSegmentBufferSize: 500,
  staleSegmentTimeoutMs: 10000,
};

class TranscriptAggregator {
  private static instance: TranscriptAggregator | null = null;

  private config: AggregatorConfig;
  private segmentBuffer: Map<string, AggregatedSegment> = new Map();
  private recentFinals: AggregatedSegment[] = [];
  private eventListeners: Set<TranscriptEventCallback> = new Set();
  private interviewerQuestionListeners: Set<InterviewerQuestionCallback> = new Set();

  // Routing state
  private unifiedModeActive: boolean = false;
  private mirrorToMainApp: boolean = false;

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<AggregatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  static getInstance(config?: Partial<AggregatorConfig>): TranscriptAggregator {
    if (!TranscriptAggregator.instance) {
      TranscriptAggregator.instance = new TranscriptAggregator(config);
    }
    return TranscriptAggregator.instance;
  }

  /**
   * Set unified recording mode
   */
  setUnifiedMode(active: boolean): void {
    this.unifiedModeActive = active;
    console.log(`[TranscriptAggregator] Unified mode: ${active}`);
  }

  /**
   * Set whether to mirror transcripts to main app in unified mode
   */
  setMirrorToMainApp(mirror: boolean): void {
    this.mirrorToMainApp = mirror;
    console.log(`[TranscriptAggregator] Mirror to main app: ${mirror}`);
  }

  /**
   * Check if unified mode is active
   */
  isUnifiedMode(): boolean {
    return this.unifiedModeActive;
  }

  /**
   * Check if mirroring to main app is enabled
   */
  shouldMirrorToMainApp(): boolean {
    return this.mirrorToMainApp;
  }

  /**
   * Register a listener for transcript events
   */
  onTranscriptEvent(callback: TranscriptEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  /**
   * Register a listener for interviewer question detection
   */
  onInterviewerQuestion(callback: InterviewerQuestionCallback): () => void {
    this.interviewerQuestionListeners.add(callback);
    return () => {
      this.interviewerQuestionListeners.delete(callback);
    };
  }

  /**
   * Ingest a transcript event from either source
   */
  ingest(data: TranscriptUpdateData): void {
    const normalizedText = this.normalizeText(data.text);

    // Skip empty segments
    if (!normalizedText) {
      return;
    }

    // Check for cross-engine echo (duplicate from other source)
    if (this.isEcho(data, normalizedText)) {
      console.log(`[TranscriptAggregator] Suppressed echo: "${data.text.substring(0, 50)}..."`);
      return;
    }

    // Find existing partial to update or create new segment
    const existingPartial = this.findMatchingPartial(data, normalizedText);

    if (existingPartial) {
      // Update existing partial → final collapse
      this.updateSegment(existingPartial, data, normalizedText);
    } else {
      // Create new segment
      this.createSegment(data, normalizedText);
    }
  }

  /**
   * Normalize text for comparison (lowercase, remove punctuation, collapse whitespace)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Calculate Jaccard similarity between two normalized texts
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(" ").filter(Boolean));
    const words2 = new Set(text2.split(" ").filter(Boolean));

    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Check if this is an echo (duplicate from other source within time window)
   */
  private isEcho(data: TranscriptUpdateData, normalizedText: string): boolean {
    const now = data.timestamp;
    const { echoTimeWindowMs, textSimilarityThreshold } = this.config;

    // Check recent finals from the OTHER source
    for (const recent of this.recentFinals) {
      // Skip same source
      if (recent.source === data.source) continue;

      // Check time window
      const timeDiff = Math.abs(now - recent.timestamp);
      if (timeDiff > echoTimeWindowMs) continue;

      // Check text similarity
      const similarity = this.calculateSimilarity(normalizedText, recent.normalizedText);
      if (similarity >= textSimilarityThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find a matching partial segment to update
   */
  private findMatchingPartial(
    data: TranscriptUpdateData,
    normalizedText: string
  ): AggregatedSegment | null {
    const now = data.timestamp;
    const { partialUpdateWindowMs, textSimilarityThreshold } = this.config;

    // Look for non-final segments from same source within time window
    for (const [, segment] of this.segmentBuffer) {
      // Must be from same source
      if (segment.source !== data.source) continue;

      // Must not be final
      if (segment.isFinal) continue;

      // Must be within time window
      const timeDiff = Math.abs(now - segment.timestamp);
      if (timeDiff > partialUpdateWindowMs) continue;

      // Must have same speaker (or both null)
      if (segment.speaker !== data.speaker) continue;

      // Check if new text is a continuation/update of old text
      // Either the new text contains the old, or they have high similarity
      const isContained =
        normalizedText.includes(segment.normalizedText) ||
        segment.normalizedText.includes(normalizedText);
      const similarity = this.calculateSimilarity(normalizedText, segment.normalizedText);

      if (isContained || similarity >= textSimilarityThreshold) {
        return segment;
      }
    }

    return null;
  }

  /**
   * Create a new segment
   */
  private createSegment(data: TranscriptUpdateData, normalizedText: string): void {
    const segment: AggregatedSegment = {
      id: randomUUID(),
      version: 1,
      text: data.text,
      normalizedText,
      speaker: data.speaker || null,
      source: data.source,
      isFinal: data.isFinal,
      timestamp: data.timestamp,
      startTime: data.words?.[0]?.start ?? null,
      endTime: data.words?.[data.words.length - 1]?.end ?? null,
      confidence: data.confidence ?? null,
      words: data.words,
      emittedAt: null,
      suppressedAsDuplicate: false,
    };

    this.segmentBuffer.set(segment.id, segment);
    this.emitSegment(segment);

    // If final, add to recent finals for echo detection
    if (data.isFinal) {
      this.addToRecentFinals(segment);
      this.checkForInterviewerQuestion(segment);
    }

    // Enforce buffer size limit
    this.enforceBufferLimit();
  }

  /**
   * Update an existing segment (partial→final collapse)
   */
  private updateSegment(
    existing: AggregatedSegment,
    data: TranscriptUpdateData,
    normalizedText: string
  ): void {
    existing.version += 1;
    existing.text = data.text;
    existing.normalizedText = normalizedText;
    existing.isFinal = data.isFinal;
    existing.timestamp = data.timestamp;
    existing.confidence = data.confidence ?? existing.confidence;
    existing.words = data.words || existing.words;

    if (data.words && data.words.length > 0) {
      existing.startTime = data.words[0].start;
      existing.endTime = data.words[data.words.length - 1].end;
    }

    this.emitSegment(existing);

    // If now final, add to recent finals for echo detection
    if (data.isFinal) {
      this.addToRecentFinals(existing);
      this.checkForInterviewerQuestion(existing);
    }
  }

  /**
   * Add segment to recent finals list (for echo detection)
   */
  private addToRecentFinals(segment: AggregatedSegment): void {
    this.recentFinals.push(segment);

    // Keep only recent finals within the echo window
    const cutoff = Date.now() - this.config.echoTimeWindowMs * 2;
    this.recentFinals = this.recentFinals.filter((s) => s.timestamp > cutoff);
  }

  /**
   * Check if segment is a potential interviewer question
   */
  private checkForInterviewerQuestion(segment: AggregatedSegment): void {
    // Only check finals from microphone source (interviewer typically speaks into mic)
    // Or segments explicitly tagged as interviewer
    const isInterviewer =
      segment.source === "microphone" ||
      segment.speaker?.toLowerCase().includes("interviewer") ||
      segment.speaker === "Speaker 0";

    if (!isInterviewer || !segment.isFinal) return;

    // Simple heuristic: check if text looks like a question
    const text = segment.text.trim();
    const endsWithQuestion = text.endsWith("?");
    const startsWithQuestionWord = /^(what|how|why|when|where|who|can|could|would|tell|describe|explain)/i.test(
      text
    );

    if (endsWithQuestion || startsWithQuestionWord) {
      // Emit interviewer question event
      for (const listener of this.interviewerQuestionListeners) {
        try {
          listener(segment);
        } catch (error) {
          console.error("[TranscriptAggregator] Error in interviewer question listener:", error);
        }
      }
    }
  }

  /**
   * Emit segment to all listeners
   */
  private emitSegment(segment: AggregatedSegment): void {
    segment.emittedAt = Date.now();

    const data: TranscriptUpdateData = {
      text: segment.text,
      speaker: segment.speaker || undefined,
      source: segment.source,
      isFinal: segment.isFinal,
      timestamp: segment.timestamp,
      confidence: segment.confidence ?? undefined,
      words: segment.words,
    };

    for (const listener of this.eventListeners) {
      try {
        listener(data, segment.id, segment.version);
      } catch (error) {
        console.error("[TranscriptAggregator] Error in transcript event listener:", error);
      }
    }
  }

  /**
   * Enforce buffer size limit by removing oldest segments
   */
  private enforceBufferLimit(): void {
    if (this.segmentBuffer.size <= this.config.maxSegmentBufferSize) {
      return;
    }

    // Sort by timestamp and remove oldest
    const segments = Array.from(this.segmentBuffer.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const toRemove = segments.slice(0, segments.length - this.config.maxSegmentBufferSize);
    for (const segment of toRemove) {
      this.segmentBuffer.delete(segment.id);
    }
  }

  /**
   * Start cleanup interval for stale partials
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePartials();
    }, 5000);
  }

  /**
   * Clean up stale partial segments that never became final
   */
  private cleanupStalePartials(): void {
    const now = Date.now();
    const cutoff = now - this.config.staleSegmentTimeoutMs;

    for (const [id, segment] of this.segmentBuffer) {
      if (!segment.isFinal && segment.timestamp < cutoff) {
        // Mark as final and emit one last time
        segment.isFinal = true;
        segment.version += 1;
        this.emitSegment(segment);
        console.log(
          `[TranscriptAggregator] Finalized stale partial: "${segment.text.substring(0, 30)}..."`
        );
      }
    }
  }

  /**
   * Get all final segments for a session
   */
  getFinalSegments(): AggregatedSegment[] {
    return Array.from(this.segmentBuffer.values())
      .filter((s) => s.isFinal)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get segments by source
   */
  getSegmentsBySource(source: AudioSource): AggregatedSegment[] {
    return Array.from(this.segmentBuffer.values())
      .filter((s) => s.source === source)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear all segments and reset state
   */
  reset(): void {
    this.segmentBuffer.clear();
    this.recentFinals = [];
    console.log("[TranscriptAggregator] Reset");
  }

  /**
   * Destroy the aggregator and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.eventListeners.clear();
    this.interviewerQuestionListeners.clear();
    this.segmentBuffer.clear();
    this.recentFinals = [];
    TranscriptAggregator.instance = null;
    console.log("[TranscriptAggregator] Destroyed");
  }
}

export const transcriptAggregator = TranscriptAggregator.getInstance();
export { TranscriptAggregator, AggregatedSegment, AggregatorConfig };
