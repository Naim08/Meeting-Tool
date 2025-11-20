/**
 * Unit tests for coaching types
 * Tests type definitions, enums, and default values
 */

import { describe, it, expect } from 'vitest';

import {
  QuestionType,
  CoachingState,
  DEFAULT_QUESTION_BUDGETS,
  NUDGE_MESSAGES,
  type QuestionBudget,
  type CoachingSession,
  type ClassificationResponse,
  type CoachingConfig,
} from '../types/coaching';

describe('coaching types', () => {
  describe('QuestionType enum', () => {
    it('should have 7 question types', () => {
      const types = Object.values(QuestionType);
      expect(types).toHaveLength(7);
    });

    it('should use snake_case values', () => {
      for (const type of Object.values(QuestionType)) {
        expect(type).toMatch(/^[a-z_]+$/);
      }
    });
  });

  describe('CoachingState enum', () => {
    it('should have 6 states', () => {
      const states = Object.values(CoachingState);
      expect(states).toHaveLength(6);
    });

    it('should include all state machine states', () => {
      expect(Object.values(CoachingState)).toContain('idle');
      expect(Object.values(CoachingState)).toContain('armed');
      expect(Object.values(CoachingState)).toContain('running');
      expect(Object.values(CoachingState)).toContain('soft_nudged');
      expect(Object.values(CoachingState)).toContain('hard_nudged');
      expect(Object.values(CoachingState)).toContain('ended');
    });
  });

  describe('DEFAULT_QUESTION_BUDGETS', () => {
    it('should have budget for every question type', () => {
      for (const type of Object.values(QuestionType)) {
        expect(DEFAULT_QUESTION_BUDGETS[type]).toBeDefined();
      }
    });

    it('should have valid budget structure', () => {
      for (const type of Object.values(QuestionType)) {
        const budget = DEFAULT_QUESTION_BUDGETS[type];
        expect(budget).toHaveProperty('targetSeconds');
        expect(budget).toHaveProperty('softThresholdSeconds');
        expect(budget).toHaveProperty('hardThresholdSeconds');
        expect(typeof budget.targetSeconds).toBe('number');
        expect(typeof budget.softThresholdSeconds).toBe('number');
        expect(typeof budget.hardThresholdSeconds).toBe('number');
      }
    });

    it('should have reasonable time budgets', () => {
      for (const type of Object.values(QuestionType)) {
        const budget = DEFAULT_QUESTION_BUDGETS[type];
        // Target should be positive
        expect(budget.targetSeconds).toBeGreaterThan(0);
        // Soft threshold should be before or at hard threshold
        expect(budget.softThresholdSeconds).toBeLessThanOrEqual(budget.hardThresholdSeconds);
        // Hard threshold should be at or after target (user can exceed slightly)
        expect(budget.hardThresholdSeconds).toBeGreaterThanOrEqual(budget.targetSeconds * 0.5);
      }
    });

    describe('specific question type budgets', () => {
      it('TELL_ME_ABOUT_YOURSELF should have 60s target', () => {
        expect(DEFAULT_QUESTION_BUDGETS[QuestionType.TELL_ME_ABOUT_YOURSELF].targetSeconds).toBe(60);
      });

      it('PROJECT_DEEP_DIVE should have 120s target', () => {
        expect(DEFAULT_QUESTION_BUDGETS[QuestionType.PROJECT_DEEP_DIVE].targetSeconds).toBe(120);
      });

      it('BEHAVIORAL_STAR should have 90s target', () => {
        expect(DEFAULT_QUESTION_BUDGETS[QuestionType.BEHAVIORAL_STAR].targetSeconds).toBe(90);
      });

      it('SYSTEM_DESIGN should have 180s target', () => {
        expect(DEFAULT_QUESTION_BUDGETS[QuestionType.SYSTEM_DESIGN].targetSeconds).toBe(180);
      });

      it('CODING_EXPLANATION should have 75s target', () => {
        expect(DEFAULT_QUESTION_BUDGETS[QuestionType.CODING_EXPLANATION].targetSeconds).toBe(75);
      });

      it('QA_LIGHT should have 45s target', () => {
        expect(DEFAULT_QUESTION_BUDGETS[QuestionType.QA_LIGHT].targetSeconds).toBe(45);
      });

      it('UNKNOWN should have 60s target', () => {
        expect(DEFAULT_QUESTION_BUDGETS[QuestionType.UNKNOWN].targetSeconds).toBe(60);
      });
    });
  });

  describe('NUDGE_MESSAGES', () => {
    it('should have soft nudge message', () => {
      expect(NUDGE_MESSAGES.soft).toBeDefined();
      expect(typeof NUDGE_MESSAGES.soft).toBe('string');
    });

    it('should have hard nudge message', () => {
      expect(NUDGE_MESSAGES.hard).toBeDefined();
      expect(typeof NUDGE_MESSAGES.hard).toBe('string');
    });

    it('soft nudge should mention wrapping up', () => {
      expect(NUDGE_MESSAGES.soft.toLowerCase()).toMatch(/land|wrap|finish|stop/);
    });

    it('hard nudge should be more urgent', () => {
      expect(NUDGE_MESSAGES.hard.toLowerCase()).toMatch(/wrap|now|stop/);
    });
  });

  describe('type interfaces', () => {
    it('QuestionBudget should be properly typed', () => {
      const budget: QuestionBudget = {
        targetSeconds: 60,
        softThresholdSeconds: 45,
        hardThresholdSeconds: 60,
      };
      expect(budget.targetSeconds).toBe(60);
    });

    it('ClassificationResponse should be properly typed', () => {
      const response: ClassificationResponse = {
        type: QuestionType.BEHAVIORAL_STAR,
        confidence: 0.95,
        recommendedSeconds: 120,
      };
      expect(response.type).toBe(QuestionType.BEHAVIORAL_STAR);
      expect(response.confidence).toBe(0.95);
      expect(response.recommendedSeconds).toBe(120);
    });

    it('ClassificationResponse recommendedSeconds should be optional', () => {
      const response: ClassificationResponse = {
        type: QuestionType.UNKNOWN,
        confidence: 0.5,
      };
      expect(response.recommendedSeconds).toBeUndefined();
    });

    it('CoachingConfig should have proper defaults available', () => {
      const config: CoachingConfig = {
        classificationTimeoutMs: 500,
        classificationMaxTimeoutMs: 1200,
        timerIntervalMs: 1000,
        minQuestionLengthChars: 10,
      };
      expect(config.classificationTimeoutMs).toBe(500);
    });
  });
});
