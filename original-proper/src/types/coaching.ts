/**
 * Type definitions for the Question-Aware Timing Coach
 *
 * The coaching system detects interviewer questions, classifies them,
 * assigns time budgets, and provides deterministic nudges when candidates
 * speak too long.
 */

/**
 * Question types with default time budgets
 */
export enum QuestionType {
  TELL_ME_ABOUT_YOURSELF = "tell_me_about_yourself",
  PROJECT_DEEP_DIVE = "project_deep_dive",
  BEHAVIORAL_STAR = "behavioral_star",
  SYSTEM_DESIGN = "system_design",
  CODING_EXPLANATION = "coding_explanation",
  QA_LIGHT = "qa_light",
  UNKNOWN = "unknown",
}

/**
 * Coaching state machine states
 */
export enum CoachingState {
  IDLE = "idle", // No active coaching
  ARMED = "armed", // Question detected, waiting for candidate to speak
  RUNNING = "running", // Timer active, candidate is speaking
  SOFT_NUDGED = "soft_nudged", // Soft threshold reached, nudge shown
  HARD_NUDGED = "hard_nudged", // Hard threshold reached, nudge shown
  ENDED = "ended", // Answer ended (interruption/silence/hotkey)
}

/**
 * Time budget configuration for a question type
 */
export interface QuestionBudget {
  targetSeconds: number; // Ideal answer duration
  softThresholdSeconds: number; // When to show soft nudge
  hardThresholdSeconds: number; // When to show hard nudge
}

/**
 * Default budgets for each question type
 */
export const DEFAULT_QUESTION_BUDGETS: Record<QuestionType, QuestionBudget> = {
  [QuestionType.TELL_ME_ABOUT_YOURSELF]: {
    targetSeconds: 60,
    softThresholdSeconds: 45,
    hardThresholdSeconds: 60,
  },
  [QuestionType.PROJECT_DEEP_DIVE]: {
    targetSeconds: 120,
    softThresholdSeconds: 90,
    hardThresholdSeconds: 120,
  },
  [QuestionType.BEHAVIORAL_STAR]: {
    targetSeconds: 90,
    softThresholdSeconds: 75,
    hardThresholdSeconds: 90,
  },
  [QuestionType.SYSTEM_DESIGN]: {
    targetSeconds: 180,
    softThresholdSeconds: 150,
    hardThresholdSeconds: 180,
  },
  [QuestionType.CODING_EXPLANATION]: {
    targetSeconds: 75,
    softThresholdSeconds: 60,
    hardThresholdSeconds: 75,
  },
  [QuestionType.QA_LIGHT]: {
    targetSeconds: 45,
    softThresholdSeconds: 35,
    hardThresholdSeconds: 45,
  },
  [QuestionType.UNKNOWN]: {
    targetSeconds: 60,
    softThresholdSeconds: 45,
    hardThresholdSeconds: 60,
  },
};

/**
 * Deterministic nudge messages (fixed copy, no LLM)
 */
export const NUDGE_MESSAGES = {
  soft: "Land the plane in ~15s. Hit result, then stop.",
  hard: "Wrap now. Offer to go deeper if needed.",
  ramble: "Try a one-sentence summary, then pause.",
  metric: "Add a single metric before closing.",
} as const;

export type NudgeType = keyof typeof NUDGE_MESSAGES;

/**
 * Backend classification response
 */
export interface ClassificationResponse {
  type: QuestionType;
  confidence: number; // 0.0 - 1.0
  recommendedSeconds?: number; // Optional budget override
}

/**
 * Active coaching session data
 */
export interface CoachingSession {
  id: string;
  questionText: string;
  questionType: QuestionType;
  classificationConfidence: number;
  budget: QuestionBudget;
  state: CoachingState;
  startedAt: number | null; // When candidate started speaking
  endedAt: number | null;
  elapsedSeconds: number;
  softNudgeFired: boolean;
  hardNudgeFired: boolean;
  endReason: CoachingEndReason | null;
}

/**
 * Reasons for ending a coaching session
 */
export enum CoachingEndReason {
  INTERVIEWER_INTERRUPTION = "interviewer_interruption",
  SILENCE_GAP = "silence_gap",
  USER_HOTKEY = "user_hotkey",
  SESSION_ENDED = "session_ended",
  TIMEOUT = "timeout",
}

/**
 * Coaching event for persistence
 */
export interface CoachingEvent {
  id: string;
  sessionId: string; // Unified recording session ID
  questionText: string;
  questionType: QuestionType;
  classificationConfidence: number;
  budgetSeconds: number;
  actualSeconds: number;
  softNudgeFired: boolean;
  hardNudgeFired: boolean;
  endReason: CoachingEndReason;
  startedAt: number;
  endedAt: number;
  createdAt: number;
}

/**
 * Timer update sent to floating window
 */
export interface CoachingTimerUpdate {
  questionType: QuestionType;
  elapsedSeconds: number;
  targetSeconds: number;
  state: CoachingState;
  progressPercent: number; // 0-100
}

/**
 * Nudge event sent to floating window
 */
export interface CoachingNudge {
  type: NudgeType;
  message: string;
  dismissAfterMs: number;
}

/**
 * IPC channel names for coaching
 */
export const COACHING_CHANNELS = {
  QUESTION_DETECTED: "coaching:question-detected",
  TIMER_UPDATE: "coaching:timer-update",
  NUDGE: "coaching:nudge",
  END: "coaching:end",
  STATE_CHANGE: "coaching:state-change",
} as const;

/**
 * Configuration for coaching behavior
 */
export interface CoachingConfig {
  enabled: boolean;
  silenceGapMs: number; // How long silence triggers end (default 2000ms)
  candidateEnergyGateMs: number; // How long candidate must speak to start timer
  classificationTimeoutMs: number; // Max time to wait for backend classification
  nudgeAutoDismissMs: number; // How long nudges stay visible
  lowDiarizationConfidenceThreshold: number; // Below this, delay RUNNING state
}

/**
 * Default coaching configuration
 */
export const DEFAULT_COACHING_CONFIG: CoachingConfig = {
  enabled: true,
  silenceGapMs: 2000,
  candidateEnergyGateMs: 500,
  classificationTimeoutMs: 1200,
  nudgeAutoDismissMs: 5000,
  lowDiarizationConfidenceThreshold: 0.7,
};

/**
 * Human-readable labels for question types
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.TELL_ME_ABOUT_YOURSELF]: "Background",
  [QuestionType.PROJECT_DEEP_DIVE]: "Project",
  [QuestionType.BEHAVIORAL_STAR]: "Behavioral",
  [QuestionType.SYSTEM_DESIGN]: "System Design",
  [QuestionType.CODING_EXPLANATION]: "Coding",
  [QuestionType.QA_LIGHT]: "Q&A",
  [QuestionType.UNKNOWN]: "General",
};
