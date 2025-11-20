/**
 * Unit tests for CoachingManager
 * Tests state machine, timer management, and nudge logic
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

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}));

// Import types
import {
  QuestionType,
  CoachingState,
  DEFAULT_QUESTION_BUDGETS,
  NUDGE_MESSAGES,
} from '../types/coaching';

// Import after mocking
import { CoachingManager } from '../main/services/CoachingManager';

describe('CoachingManager', () => {
  let manager: ReturnType<typeof CoachingManager.getInstance>;

  beforeEach(() => {
    vi.useFakeTimers();
    // Use singleton getInstance() method
    manager = CoachingManager.getInstance();
    manager.reset(); // Clear any previous state
    manager.initialize('test-session-id', null);
  });

  afterEach(() => {
    manager.reset();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start in IDLE state', () => {
      expect(manager.getState()).toBe(CoachingState.IDLE);
    });

    it('should have no active session initially', () => {
      expect(manager.getCurrentSession()).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('should transition to ARMED when interviewer asks a question', async () => {
      await manager.handleInterviewerQuestion({
        id: 'seg-1',
        source: 'system',
        text: 'Tell me about yourself',
        speaker: 'interviewer',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      expect(manager.getState()).toBe(CoachingState.ARMED);
    });

    it('should transition to RUNNING when candidate starts speaking', async () => {
      // First, arm the coach
      await manager.handleInterviewerQuestion({
        id: 'seg-1',
        source: 'system',
        text: 'Tell me about yourself',
        speaker: 'interviewer',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      // Then candidate speaks
      manager.handleCandidateSpeech({
        id: 'seg-2',
        source: 'microphone',
        text: 'Sure, I have been working...',
        speaker: 'candidate',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      expect(manager.getState()).toBe(CoachingState.RUNNING);
    });

    it('should transition to ENDED when interviewer interrupts', async () => {
      // Arm
      await manager.handleInterviewerQuestion({
        id: 'seg-1',
        source: 'system',
        text: 'Tell me about yourself',
        speaker: 'interviewer',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      // Start running
      manager.handleCandidateSpeech({
        id: 'seg-2',
        source: 'microphone',
        text: 'Sure...',
        speaker: 'candidate',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      // Interviewer interrupts
      manager.handleInterviewerSpeech({
        id: 'seg-3',
        source: 'system',
        text: 'Thanks, that is great.',
        speaker: 'interviewer',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      // State goes to ENDED when interrupted (not IDLE until reset)
      expect(manager.getState()).toBe(CoachingState.ENDED);
    });
  });

  describe('endViaHotkey', () => {
    it('should end timer and return to IDLE', async () => {
      // Arm
      await manager.handleInterviewerQuestion({
        id: 'seg-1',
        source: 'system',
        text: 'Tell me about yourself',
        speaker: 'interviewer',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      // Start running
      manager.handleCandidateSpeech({
        id: 'seg-2',
        source: 'microphone',
        text: 'Sure...',
        speaker: 'candidate',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      expect(manager.getState()).toBe(CoachingState.RUNNING);

      // End via hotkey
      manager.endViaHotkey();

      // State goes to ENDED (not IDLE until reset)
      expect(manager.getState()).toBe(CoachingState.ENDED);
    });

    it('should do nothing when not running', () => {
      manager.endViaHotkey();
      // Still IDLE since there was no active session
      expect(manager.getState()).toBe(CoachingState.IDLE);
    });
  });

  describe('reset', () => {
    it('should reset state on reset', async () => {
      // Arm
      await manager.handleInterviewerQuestion({
        id: 'seg-1',
        source: 'system',
        text: 'Tell me about yourself',
        speaker: 'interviewer',
        isFinal: true,
        timestamp: Date.now(),
        version: 1,
      });

      expect(manager.getState()).toBe(CoachingState.ARMED);

      manager.reset();

      expect(manager.getState()).toBe(CoachingState.IDLE);
    });
  });
});

describe('Question type budgets', () => {
  it('should have budgets for all question types', () => {
    const questionTypes = Object.values(QuestionType);

    for (const type of questionTypes) {
      expect(DEFAULT_QUESTION_BUDGETS[type]).toBeDefined();
      expect(DEFAULT_QUESTION_BUDGETS[type].targetSeconds).toBeGreaterThan(0);
      expect(DEFAULT_QUESTION_BUDGETS[type].softThresholdSeconds).toBeGreaterThan(0);
      expect(DEFAULT_QUESTION_BUDGETS[type].hardThresholdSeconds).toBeGreaterThan(0);
    }
  });

  it('should have soft threshold less than or equal to hard threshold', () => {
    for (const type of Object.values(QuestionType)) {
      const budget = DEFAULT_QUESTION_BUDGETS[type];
      expect(budget.softThresholdSeconds).toBeLessThanOrEqual(budget.hardThresholdSeconds);
    }
  });

  it('should have appropriate budgets for each question type', () => {
    // Tell me about yourself: 60 seconds
    expect(DEFAULT_QUESTION_BUDGETS[QuestionType.TELL_ME_ABOUT_YOURSELF].targetSeconds).toBe(60);

    // System design: longer budget (180 seconds)
    expect(DEFAULT_QUESTION_BUDGETS[QuestionType.SYSTEM_DESIGN].targetSeconds).toBe(180);

    // Q&A light: shorter budget (45 seconds)
    expect(DEFAULT_QUESTION_BUDGETS[QuestionType.QA_LIGHT].targetSeconds).toBe(45);
  });
});

describe('Nudge messages', () => {
  it('should have soft nudge message', () => {
    expect(NUDGE_MESSAGES.soft).toBeDefined();
    expect(typeof NUDGE_MESSAGES.soft).toBe('string');
    expect(NUDGE_MESSAGES.soft.length).toBeGreaterThan(0);
  });

  it('should have hard nudge message', () => {
    expect(NUDGE_MESSAGES.hard).toBeDefined();
    expect(typeof NUDGE_MESSAGES.hard).toBe('string');
    expect(NUDGE_MESSAGES.hard.length).toBeGreaterThan(0);
  });

  it('should have different messages for soft and hard nudges', () => {
    expect(NUDGE_MESSAGES.soft).not.toBe(NUDGE_MESSAGES.hard);
  });
});

describe('CoachingState enum', () => {
  it('should have all required states', () => {
    expect(CoachingState.IDLE).toBe('idle');
    expect(CoachingState.ARMED).toBe('armed');
    expect(CoachingState.RUNNING).toBe('running');
    expect(CoachingState.SOFT_NUDGED).toBe('soft_nudged');
    expect(CoachingState.HARD_NUDGED).toBe('hard_nudged');
    expect(CoachingState.ENDED).toBe('ended');
  });
});

describe('QuestionType enum', () => {
  it('should have all required question types', () => {
    expect(QuestionType.TELL_ME_ABOUT_YOURSELF).toBe('tell_me_about_yourself');
    expect(QuestionType.PROJECT_DEEP_DIVE).toBe('project_deep_dive');
    expect(QuestionType.BEHAVIORAL_STAR).toBe('behavioral_star');
    expect(QuestionType.SYSTEM_DESIGN).toBe('system_design');
    expect(QuestionType.CODING_EXPLANATION).toBe('coding_explanation');
    expect(QuestionType.QA_LIGHT).toBe('qa_light');
    expect(QuestionType.UNKNOWN).toBe('unknown');
  });
});
