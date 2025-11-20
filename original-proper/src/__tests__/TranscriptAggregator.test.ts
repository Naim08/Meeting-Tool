/**
 * Unit tests for TranscriptAggregator
 * Tests deduplication, echo detection, and event routing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../main/services/Database', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    })),
  })),
}));

// Import after mocking
import { TranscriptAggregator } from '../main/services/TranscriptAggregator';

describe('TranscriptAggregator', () => {
  let aggregator: TranscriptAggregator;

  beforeEach(() => {
    // Create fresh instance for each test with short echo window for testing
    aggregator = new TranscriptAggregator({
      echoWindowMs: 500,
      similarityThreshold: 0.6,
      maxRecentFinals: 20,
    });
  });

  afterEach(() => {
    aggregator.reset();
  });

  describe('ingest', () => {
    it('should accept valid transcript data', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);

      aggregator.ingest({
        source: 'microphone',
        text: 'Hello world',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should ignore empty text', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);

      aggregator.ingest({
        source: 'microphone',
        text: '',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should ignore whitespace-only text', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);

      aggregator.ingest({
        source: 'microphone',
        text: '   \n\t  ',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('echo detection', () => {
    it('should detect echo from same text within time window', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);
      const now = Date.now();

      // First transcript (microphone)
      aggregator.ingest({
        source: 'microphone',
        text: 'Hello how are you',
        isFinal: true,
        timestamp: now,
        speaker: 'candidate',
      });

      // Echo from system audio (same text, within 500ms)
      aggregator.ingest({
        source: 'system',
        text: 'Hello how are you',
        isFinal: true,
        timestamp: now + 100,
        speaker: 'interviewer',
      });

      // Should only emit once (echo is suppressed)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should detect echo from similar text (above threshold)', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);
      const now = Date.now();

      // First transcript
      aggregator.ingest({
        source: 'microphone',
        text: 'Tell me about your experience',
        isFinal: true,
        timestamp: now,
        speaker: 'candidate',
      });

      // Similar text (minor differences)
      aggregator.ingest({
        source: 'system',
        text: 'Tell me about your experiences',
        isFinal: true,
        timestamp: now + 200,
        speaker: 'interviewer',
      });

      // Should detect as echo due to high similarity
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not detect echo after time window expires', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);
      const now = Date.now();

      // First transcript
      aggregator.ingest({
        source: 'microphone',
        text: 'Hello world',
        isFinal: true,
        timestamp: now,
        speaker: 'candidate',
      });

      // Same text but after window (600ms > 500ms)
      aggregator.ingest({
        source: 'system',
        text: 'Hello world',
        isFinal: true,
        timestamp: now + 600,
        speaker: 'interviewer',
      });

      // Should emit both (not an echo)
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should not detect echo for dissimilar text', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);
      const now = Date.now();

      // First transcript
      aggregator.ingest({
        source: 'microphone',
        text: 'The weather is nice today',
        isFinal: true,
        timestamp: now,
        speaker: 'candidate',
      });

      // Different text
      aggregator.ingest({
        source: 'system',
        text: 'What is your favorite programming language',
        isFinal: true,
        timestamp: now + 100,
        speaker: 'interviewer',
      });

      // Should emit both (different content)
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('partial to final collapse', () => {
    it('should replace partial with final when final arrives', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);
      const now = Date.now();

      // Partial transcript
      aggregator.ingest({
        source: 'microphone',
        text: 'Hello',
        isFinal: false,
        timestamp: now,
        speaker: 'candidate',
      });

      // Final transcript (same segment)
      aggregator.ingest({
        source: 'microphone',
        text: 'Hello world',
        isFinal: true,
        timestamp: now + 100,
        speaker: 'candidate',
      });

      // Both should be emitted but final replaces partial
      expect(callback).toHaveBeenCalledTimes(2);
      const lastCall = callback.mock.calls[1];
      expect(lastCall[0].text).toBe('Hello world');
      expect(lastCall[0].isFinal).toBe(true);
    });
  });

  describe('interviewer question detection', () => {
    it('should detect questions from segments tagged as interviewer', () => {
      const questionCallback = vi.fn();
      aggregator.onInterviewerQuestion(questionCallback);

      aggregator.ingest({
        source: 'system',
        text: 'Can you tell me about yourself?',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'interviewer', // Tagged as interviewer
      });

      expect(questionCallback).toHaveBeenCalled();
      expect(questionCallback.mock.calls[0][0].text).toContain('tell me about yourself');
    });

    it('should detect question phrases starting with question words', () => {
      const questionCallback = vi.fn();
      aggregator.onInterviewerQuestion(questionCallback);

      aggregator.ingest({
        source: 'system',
        text: 'Tell me about a time when you faced a challenge',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'interviewer',
      });

      expect(questionCallback).toHaveBeenCalled();
    });

    it('should not trigger for partial transcripts', () => {
      const questionCallback = vi.fn();
      aggregator.onInterviewerQuestion(questionCallback);

      aggregator.ingest({
        source: 'system',
        text: 'What is your experience?',
        isFinal: false, // Partial - should not trigger
        timestamp: Date.now(),
        speaker: 'interviewer',
      });

      expect(questionCallback).not.toHaveBeenCalled();
    });

    it('should not trigger for non-question statements', () => {
      const questionCallback = vi.fn();
      aggregator.onInterviewerQuestion(questionCallback);

      aggregator.ingest({
        source: 'system',
        text: 'That sounds great. Thanks for sharing.',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'interviewer',
      });

      expect(questionCallback).not.toHaveBeenCalled();
    });
  });

  describe('subscription management', () => {
    it('should allow multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      aggregator.onTranscriptEvent(callback1);
      aggregator.onTranscriptEvent(callback2);

      aggregator.ingest({
        source: 'microphone',
        text: 'Test message',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should support unsubscription', () => {
      const callback = vi.fn();
      const unsubscribe = aggregator.onTranscriptEvent(callback);

      aggregator.ingest({
        source: 'microphone',
        text: 'First message',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      aggregator.ingest({
        source: 'microphone',
        text: 'Second message',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('unified mode flag', () => {
    it('should track unified mode state', () => {
      expect(aggregator.isUnifiedMode()).toBe(false);

      aggregator.setUnifiedMode(true);
      expect(aggregator.isUnifiedMode()).toBe(true);

      aggregator.setUnifiedMode(false);
      expect(aggregator.isUnifiedMode()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all state on reset', () => {
      const callback = vi.fn();
      aggregator.onTranscriptEvent(callback);

      aggregator.ingest({
        source: 'microphone',
        text: 'Test message',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback).toHaveBeenCalledTimes(1);

      aggregator.reset();

      // After reset, same message should not be detected as echo
      aggregator.ingest({
        source: 'microphone',
        text: 'Test message',
        isFinal: true,
        timestamp: Date.now(),
        speaker: 'candidate',
      });

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Jaccard similarity', () => {
  // Test the similarity calculation indirectly through echo detection
  let aggregator: TranscriptAggregator;

  beforeEach(() => {
    aggregator = new TranscriptAggregator({
      echoWindowMs: 1000,
      similarityThreshold: 0.6,
      maxRecentFinals: 20,
    });
  });

  it('should consider identical texts as 100% similar', () => {
    const callback = vi.fn();
    aggregator.onTranscriptEvent(callback);
    const now = Date.now();

    aggregator.ingest({
      source: 'microphone',
      text: 'identical text here',
      isFinal: true,
      timestamp: now,
      speaker: 'candidate',
    });

    aggregator.ingest({
      source: 'system',
      text: 'identical text here',
      isFinal: true,
      timestamp: now + 100,
      speaker: 'interviewer',
    });

    // Should be detected as echo
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should consider completely different texts as not similar', () => {
    const callback = vi.fn();
    aggregator.onTranscriptEvent(callback);
    const now = Date.now();

    aggregator.ingest({
      source: 'microphone',
      text: 'apple banana cherry',
      isFinal: true,
      timestamp: now,
      speaker: 'candidate',
    });

    aggregator.ingest({
      source: 'system',
      text: 'dog elephant frog',
      isFinal: true,
      timestamp: now + 100,
      speaker: 'interviewer',
    });

    // Should not be detected as echo (different content)
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
