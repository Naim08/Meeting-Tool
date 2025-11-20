/**
 * CoachingManager - Real-time question-aware timing coach
 *
 * State Machine: IDLE → ARMED → RUNNING → SOFT_NUDGED? → HARD_NUDGED? → ENDED
 *
 * - Detects interviewer question candidates from finalized segments
 * - Sends question text to backend for classification
 * - Arms timer on classification response; starts on candidate speech
 * - Fires soft/hard nudges at thresholds (fixed copy, no LLM)
 * - Ends on interviewer interruption, silence gap, or hotkey
 */

import { randomUUID } from "crypto";
import { BrowserWindow } from "electron";
import { getDb } from "./Database";
import type { AggregatedSegment } from "./TranscriptAggregator";
import {
  QuestionType,
  CoachingState,
  CoachingEndReason,
  DEFAULT_QUESTION_BUDGETS,
  DEFAULT_COACHING_CONFIG,
  NUDGE_MESSAGES,
  COACHING_CHANNELS,
  QUESTION_TYPE_LABELS,
  type CoachingSession,
  type CoachingConfig,
  type CoachingTimerUpdate,
  type CoachingNudge,
  type ClassificationResponse,
  type QuestionBudget,
  type CoachingEvent,
} from "../../types/coaching";

class CoachingManager {
  private static instance: CoachingManager | null = null;

  private config: CoachingConfig;
  private currentSession: CoachingSession | null = null;
  private unifiedSessionId: string | null = null;
  private floatingWindow: BrowserWindow | null = null;

  // Timers
  private timerInterval: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;

  // Last speech timestamps for silence detection
  private lastInterviewerSpeech: number = 0;
  private lastCandidateSpeech: number = 0;

  // Classification cache (normalized question → response)
  private classificationCache: Map<string, { response: ClassificationResponse; expiresAt: number }> =
    new Map();

  private constructor(config: Partial<CoachingConfig> = {}) {
    this.config = { ...DEFAULT_COACHING_CONFIG, ...config };
  }

  static getInstance(config?: Partial<CoachingConfig>): CoachingManager {
    if (!CoachingManager.instance) {
      CoachingManager.instance = new CoachingManager(config);
    }
    return CoachingManager.instance;
  }

  /**
   * Initialize the coaching manager for a unified recording session
   */
  initialize(unifiedSessionId: string, floatingWindow: BrowserWindow | null): void {
    this.unifiedSessionId = unifiedSessionId;
    this.floatingWindow = floatingWindow;
    this.reset();
    console.log(`[CoachingManager] Initialized for session: ${unifiedSessionId}`);
  }

  /**
   * Set the floating window reference
   */
  setFloatingWindow(window: BrowserWindow | null): void {
    this.floatingWindow = window;
  }

  /**
   * Check if coaching is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current coaching state
   */
  getState(): CoachingState {
    return this.currentSession?.state || CoachingState.IDLE;
  }

  /**
   * Get current session
   */
  getCurrentSession(): CoachingSession | null {
    return this.currentSession;
  }

  /**
   * Handle an interviewer question detected by the aggregator
   */
  async handleInterviewerQuestion(segment: AggregatedSegment): Promise<void> {
    if (!this.config.enabled || !this.unifiedSessionId) {
      return;
    }

    // If already in a coaching session, don't start a new one
    if (
      this.currentSession &&
      this.currentSession.state !== CoachingState.IDLE &&
      this.currentSession.state !== CoachingState.ENDED
    ) {
      console.log("[CoachingManager] Ignoring question - session already active");
      return;
    }

    console.log(`[CoachingManager] Question detected: "${segment.text.substring(0, 50)}..."`);

    // Classify the question (backend call or fallback)
    const classification = await this.classifyQuestion(segment.text);

    // Create armed session
    const budget = this.getBudgetForType(classification.type, classification.recommendedSeconds);

    this.currentSession = {
      id: randomUUID(),
      questionText: segment.text,
      questionType: classification.type,
      classificationConfidence: classification.confidence,
      budget,
      state: CoachingState.ARMED,
      startedAt: null,
      endedAt: null,
      elapsedSeconds: 0,
      softNudgeFired: false,
      hardNudgeFired: false,
      endReason: null,
    };

    console.log(
      `[CoachingManager] Armed: ${classification.type} (confidence: ${classification.confidence.toFixed(2)}, budget: ${budget.targetSeconds}s)`
    );

    this.sendStateUpdate();
  }

  /**
   * Handle candidate speech (to start timer if armed)
   */
  handleCandidateSpeech(segment: AggregatedSegment): void {
    this.lastCandidateSpeech = Date.now();

    // Reset silence timer
    this.resetSilenceTimer();

    if (!this.currentSession) return;

    const { state } = this.currentSession;

    // If armed, check if we should start running
    if (state === CoachingState.ARMED) {
      // Check diarization confidence
      const confidence = segment.confidence ?? 1.0;
      if (confidence < this.config.lowDiarizationConfidenceThreshold) {
        console.log(
          `[CoachingManager] Delaying start - low diarization confidence: ${confidence.toFixed(2)}`
        );
        return;
      }

      // Start the timer
      this.startTimer();
    }
  }

  /**
   * Handle interviewer speech (potential interruption)
   */
  handleInterviewerSpeech(segment: AggregatedSegment): void {
    this.lastInterviewerSpeech = Date.now();

    if (!this.currentSession) return;

    const { state } = this.currentSession;

    // If timer is running, interviewer speech ends the session
    if (
      state === CoachingState.RUNNING ||
      state === CoachingState.SOFT_NUDGED ||
      state === CoachingState.HARD_NUDGED
    ) {
      this.endSession(CoachingEndReason.INTERVIEWER_INTERRUPTION);
    }
  }

  /**
   * End the current coaching session via hotkey
   */
  endViaHotkey(): void {
    if (this.currentSession) {
      this.endSession(CoachingEndReason.USER_HOTKEY);
    }
  }

  /**
   * Classify a question using backend API or fallback heuristics
   */
  private async classifyQuestion(questionText: string): Promise<ClassificationResponse> {
    const normalizedQuestion = this.normalizeQuestion(questionText);

    // Check cache first
    const cached = this.classificationCache.get(normalizedQuestion);
    if (cached && cached.expiresAt > Date.now()) {
      console.log("[CoachingManager] Using cached classification");
      return cached.response;
    }

    try {
      // Call backend classification API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.classificationTimeoutMs);

      const serverRoot = this.getServerRoot();
      const response = await fetch(`${serverRoot}/api/coaching/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Classification API returned ${response.status}`);
      }

      const classification: ClassificationResponse = await response.json();

      // Cache the result (5 minute TTL)
      this.classificationCache.set(normalizedQuestion, {
        response: classification,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return classification;
    } catch (error) {
      console.warn("[CoachingManager] Classification API failed, using heuristics:", error);
      return this.heuristicClassification(questionText);
    }
  }

  /**
   * Fallback heuristic classification when backend is unavailable
   */
  private heuristicClassification(questionText: string): ClassificationResponse {
    const lower = questionText.toLowerCase();

    // Tell me about yourself / background
    if (
      lower.includes("tell me about yourself") ||
      lower.includes("walk me through your background") ||
      lower.includes("introduce yourself")
    ) {
      return { type: QuestionType.TELL_ME_ABOUT_YOURSELF, confidence: 0.8 };
    }

    // Project deep dive
    if (
      lower.includes("project") ||
      lower.includes("describe a time") ||
      lower.includes("most challenging") ||
      lower.includes("proud of")
    ) {
      return { type: QuestionType.PROJECT_DEEP_DIVE, confidence: 0.7 };
    }

    // Behavioral STAR
    if (
      lower.includes("conflict") ||
      lower.includes("challenge") ||
      lower.includes("failure") ||
      lower.includes("leadership") ||
      lower.includes("difficult situation") ||
      lower.includes("disagreed")
    ) {
      return { type: QuestionType.BEHAVIORAL_STAR, confidence: 0.75 };
    }

    // System design
    if (
      lower.includes("design") ||
      lower.includes("architect") ||
      lower.includes("scale") ||
      lower.includes("system")
    ) {
      return { type: QuestionType.SYSTEM_DESIGN, confidence: 0.7 };
    }

    // Coding explanation
    if (
      lower.includes("code") ||
      lower.includes("algorithm") ||
      lower.includes("implement") ||
      lower.includes("tradeoff") ||
      lower.includes("complexity")
    ) {
      return { type: QuestionType.CODING_EXPLANATION, confidence: 0.7 };
    }

    // Q&A light
    if (
      lower.includes("why us") ||
      lower.includes("why this company") ||
      lower.includes("timeline") ||
      lower.includes("salary") ||
      lower.includes("compensation") ||
      lower.includes("questions for")
    ) {
      return { type: QuestionType.QA_LIGHT, confidence: 0.75 };
    }

    // Unknown/general
    return { type: QuestionType.UNKNOWN, confidence: 0.5 };
  }

  /**
   * Get budget for question type with optional override
   */
  private getBudgetForType(type: QuestionType, recommendedSeconds?: number): QuestionBudget {
    const defaultBudget = DEFAULT_QUESTION_BUDGETS[type];

    if (recommendedSeconds && recommendedSeconds > 0) {
      // Use recommended seconds with proportional soft/hard thresholds
      const ratio = recommendedSeconds / defaultBudget.targetSeconds;
      return {
        targetSeconds: recommendedSeconds,
        softThresholdSeconds: Math.round(defaultBudget.softThresholdSeconds * ratio),
        hardThresholdSeconds: Math.round(defaultBudget.hardThresholdSeconds * ratio),
      };
    }

    return defaultBudget;
  }

  /**
   * Start the coaching timer
   */
  private startTimer(): void {
    if (!this.currentSession) return;

    this.currentSession.state = CoachingState.RUNNING;
    this.currentSession.startedAt = Date.now();

    console.log("[CoachingManager] Timer started");
    this.sendStateUpdate();

    // Start interval for timer updates (every 500ms for smooth UI)
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 500);

    // Start silence detection
    this.resetSilenceTimer();
  }

  /**
   * Update timer and check thresholds
   */
  private updateTimer(): void {
    if (!this.currentSession || !this.currentSession.startedAt) return;

    const elapsed = (Date.now() - this.currentSession.startedAt) / 1000;
    this.currentSession.elapsedSeconds = elapsed;

    const { budget, softNudgeFired, hardNudgeFired, state } = this.currentSession;

    // Check soft threshold
    if (!softNudgeFired && elapsed >= budget.softThresholdSeconds) {
      this.fireSoftNudge();
    }

    // Check hard threshold
    if (!hardNudgeFired && elapsed >= budget.hardThresholdSeconds) {
      this.fireHardNudge();
    }

    // Send timer update to UI
    this.sendTimerUpdate();
  }

  /**
   * Fire soft nudge
   */
  private fireSoftNudge(): void {
    if (!this.currentSession) return;

    this.currentSession.softNudgeFired = true;
    this.currentSession.state = CoachingState.SOFT_NUDGED;

    console.log("[CoachingManager] Soft nudge fired");
    this.sendNudge("soft");
    this.sendStateUpdate();
  }

  /**
   * Fire hard nudge
   */
  private fireHardNudge(): void {
    if (!this.currentSession) return;

    this.currentSession.hardNudgeFired = true;
    this.currentSession.state = CoachingState.HARD_NUDGED;

    console.log("[CoachingManager] Hard nudge fired");
    this.sendNudge("hard");
    this.sendStateUpdate();
  }

  /**
   * Reset silence detection timer
   */
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    if (
      this.currentSession &&
      (this.currentSession.state === CoachingState.RUNNING ||
        this.currentSession.state === CoachingState.SOFT_NUDGED ||
        this.currentSession.state === CoachingState.HARD_NUDGED)
    ) {
      this.silenceTimer = setTimeout(() => {
        this.endSession(CoachingEndReason.SILENCE_GAP);
      }, this.config.silenceGapMs);
    }
  }

  /**
   * End the current coaching session
   */
  private endSession(reason: CoachingEndReason): void {
    if (!this.currentSession) return;

    // Clear timers
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.currentSession.state = CoachingState.ENDED;
    this.currentSession.endedAt = Date.now();
    this.currentSession.endReason = reason;

    console.log(
      `[CoachingManager] Session ended: ${reason} (elapsed: ${this.currentSession.elapsedSeconds.toFixed(1)}s)`
    );

    // Persist to database
    this.persistCoachingEvent();

    // Send final update
    this.sendStateUpdate();

    // Reset session after a brief delay
    setTimeout(() => {
      this.currentSession = null;
    }, 1000);
  }

  /**
   * Persist coaching event to database
   */
  private persistCoachingEvent(): void {
    if (!this.currentSession || !this.unifiedSessionId) return;

    try {
      const db = getDb();
      const event: CoachingEvent = {
        id: this.currentSession.id,
        sessionId: this.unifiedSessionId,
        questionText: this.currentSession.questionText,
        questionType: this.currentSession.questionType,
        classificationConfidence: this.currentSession.classificationConfidence,
        budgetSeconds: this.currentSession.budget.targetSeconds,
        actualSeconds: Math.round(this.currentSession.elapsedSeconds),
        softNudgeFired: this.currentSession.softNudgeFired,
        hardNudgeFired: this.currentSession.hardNudgeFired,
        endReason: this.currentSession.endReason || CoachingEndReason.SESSION_ENDED,
        startedAt: this.currentSession.startedAt || Date.now(),
        endedAt: this.currentSession.endedAt || Date.now(),
        createdAt: Date.now(),
      };

      const stmt = db.prepare(`
        INSERT INTO coaching_events (
          id, session_id, question_text, question_type, classification_confidence,
          budget_seconds, actual_seconds, soft_nudge_fired, hard_nudge_fired,
          end_reason, started_at, ended_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        event.id,
        event.sessionId,
        event.questionText,
        event.questionType,
        event.classificationConfidence,
        event.budgetSeconds,
        event.actualSeconds,
        event.softNudgeFired ? 1 : 0,
        event.hardNudgeFired ? 1 : 0,
        event.endReason,
        event.startedAt,
        event.endedAt,
        event.createdAt
      );

      console.log("[CoachingManager] Coaching event persisted");
    } catch (error) {
      console.error("[CoachingManager] Failed to persist coaching event:", error);
    }
  }

  /**
   * Send timer update to floating window
   */
  private sendTimerUpdate(): void {
    if (!this.floatingWindow || this.floatingWindow.isDestroyed() || !this.currentSession) return;

    const update: CoachingTimerUpdate = {
      questionType: this.currentSession.questionType,
      elapsedSeconds: this.currentSession.elapsedSeconds,
      targetSeconds: this.currentSession.budget.targetSeconds,
      state: this.currentSession.state,
      progressPercent: Math.min(
        100,
        (this.currentSession.elapsedSeconds / this.currentSession.budget.targetSeconds) * 100
      ),
    };

    this.floatingWindow.webContents.send(COACHING_CHANNELS.TIMER_UPDATE, update);
  }

  /**
   * Send state update to floating window
   */
  private sendStateUpdate(): void {
    if (!this.floatingWindow || this.floatingWindow.isDestroyed()) return;

    const state = this.currentSession
      ? {
          state: this.currentSession.state,
          questionType: this.currentSession.questionType,
          questionTypeLabel: QUESTION_TYPE_LABELS[this.currentSession.questionType],
          targetSeconds: this.currentSession.budget.targetSeconds,
        }
      : { state: CoachingState.IDLE };

    this.floatingWindow.webContents.send(COACHING_CHANNELS.STATE_CHANGE, state);
  }

  /**
   * Send nudge to floating window
   */
  private sendNudge(type: "soft" | "hard" | "ramble" | "metric"): void {
    if (!this.floatingWindow || this.floatingWindow.isDestroyed()) return;

    const nudge: CoachingNudge = {
      type,
      message: NUDGE_MESSAGES[type],
      dismissAfterMs: this.config.nudgeAutoDismissMs,
    };

    this.floatingWindow.webContents.send(COACHING_CHANNELS.NUDGE, nudge);
  }

  /**
   * Normalize question text for caching
   */
  private normalizeQuestion(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200);
  }

  /**
   * Get server root URL
   */
  private getServerRoot(): string {
    // In production, use the deployed URL; in dev, use localhost
    const isDev = process.env.NODE_ENV === "development";
    return isDev ? "http://localhost:3000" : "https://cluely.vercel.app";
  }

  /**
   * Reset the coaching manager state
   */
  reset(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.currentSession = null;
    this.lastInterviewerSpeech = 0;
    this.lastCandidateSpeech = 0;
    console.log("[CoachingManager] Reset");
  }

  /**
   * Destroy the coaching manager
   */
  destroy(): void {
    this.reset();
    this.classificationCache.clear();
    this.floatingWindow = null;
    this.unifiedSessionId = null;
    CoachingManager.instance = null;
    console.log("[CoachingManager] Destroyed");
  }
}

export const coachingManager = CoachingManager.getInstance();
export { CoachingManager };
