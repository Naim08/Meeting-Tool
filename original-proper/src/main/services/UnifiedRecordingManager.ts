import { randomUUID } from "crypto";
import { BrowserWindow } from "electron";
import Store from "electron-store";

import { getDb } from "./Database";
import { sessionManager } from "./TranscriptionRecorder";
import { SpeakerMapper } from "./SpeakerMapper";
import { FloatingWindowManager } from "./FloatingWindowManager";
import { transcriptAggregator } from "./TranscriptAggregator";
import { coachingManager } from "./CoachingManager";
import { safeSendToRenderer } from "../utils/ipc";
// NOTE: handleTranscribe is imported dynamically to avoid circular dependency
// UnifiedRecordingManager -> audioRecorder -> TranscriptionService -> UnifiedRecordingManager
import type {
  UnifiedRecordingStatus,
  UnifiedRecordingConfig,
  UnifiedSession,
  TranscriptUpdateData,
} from "../../types/unified-recording";

class UnifiedRecordingManager {
  private static instance: UnifiedRecordingManager | null = null;
  private currentSession: UnifiedSession | null = null;
  private floatingWindow: FloatingWindowManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private store: Store | null = null;
  private speakerMapper: SpeakerMapper;

  // Audio level tracking for 60fps updates
  private microphoneLevel: number = 0;
  private systemAudioLevel: number = 0;
  private audioLevelInterval: NodeJS.Timeout | null = null;

  // Aggregator event listener cleanup
  private aggregatorUnsubscribe: (() => void) | null = null;
  private questionListenerUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.speakerMapper = new SpeakerMapper();
  }

  static getInstance(): UnifiedRecordingManager {
    if (!UnifiedRecordingManager.instance) {
      UnifiedRecordingManager.instance = new UnifiedRecordingManager();
    }
    return UnifiedRecordingManager.instance;
  }

  initialize(mainWindow: BrowserWindow, store: Store): void {
    this.mainWindow = mainWindow;
    this.store = store;
    console.log("[UnifiedRecordingManager] Initialized");
  }

  async startUnifiedRecording(config: UnifiedRecordingConfig = {}): Promise<string | null> {
    if (this.currentSession) {
      console.log("[UnifiedRecordingManager] Session already active");
      return this.currentSession.sessionId;
    }

    if (!this.mainWindow || !this.store) {
      console.error("[UnifiedRecordingManager] Not initialized");
      return null;
    }

    try {
      // Use provided meetingId or null (don't generate fake meeting IDs that don't exist)
      const meetingId = config.meetingId || null;
      const language = config.language || "en";
      const sessionId = randomUUID();
      const now = Date.now();

      console.log(`[UnifiedRecordingManager] Starting unified recording: ${sessionId}`);

      // Start microphone transcription session (creates database record)
      const micSessionId = sessionManager.startSession("microphone", language, meetingId || undefined);
      const micRecorder = sessionManager.getSession(micSessionId);

      // Start system audio recording using the existing toggle mechanism
      // This spawns capturekit and connects to AssemblyAI
      const isSystemAudioAlreadyEnabled = this.store!.get("isAudioListenerEnabled");
      if (!isSystemAudioAlreadyEnabled) {
        // Dynamic import to avoid circular dependency
        const { handleTranscribe } = await import("../audioRecorder");
        handleTranscribe(this.mainWindow, this.store);
        console.log("[UnifiedRecordingManager] System audio capture started");
      } else {
        console.log("[UnifiedRecordingManager] System audio already enabled");
      }

      // Create a system audio session for tracking (note: actual audio goes through AssemblyAI pipeline)
      const systemSessionId = sessionManager.startSession("system", language, meetingId || undefined);
      const systemRecorder = sessionManager.getSession(systemSessionId);

      // Create unified transcription record (after we have transcription IDs)
      const db = getDb();
      const id = randomUUID();

      const insertUnified = db.prepare(`
        INSERT INTO unified_transcriptions (
          id, session_id, meeting_id, microphone_transcription_id, system_audio_transcription_id, started_at, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertUnified.run(
        id,
        sessionId,
        meetingId,
        micRecorder?.getTranscriptionId() || null,
        systemRecorder?.getTranscriptionId() || null,
        now,
        "active",
        now,
        now
      );

      this.currentSession = {
        id,
        sessionId,
        meetingId,
        microphoneTranscriptionId: micRecorder?.getTranscriptionId() || null,
        systemAudioTranscriptionId: systemRecorder?.getTranscriptionId() || null,
        speakerMapping: null,
        startedAt: now,
        endedAt: null,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      // Launch floating transcript window
      await this.launchFloatingWindow();

      // Initialize transcript aggregator for unified mode
      transcriptAggregator.setUnifiedMode(true);
      transcriptAggregator.reset();

      // Set up aggregator event listener to route to floating window
      this.aggregatorUnsubscribe = transcriptAggregator.onTranscriptEvent(
        (data, segmentId, version) => {
          // Send to floating window
          if (this.floatingWindow) {
            this.floatingWindow.sendTranscriptUpdate(data);
          }

          // Optionally mirror to main app (disabled by default)
          if (transcriptAggregator.shouldMirrorToMainApp() && this.mainWindow) {
            safeSendToRenderer(this.mainWindow, {
              type: "transcription.update",
              value: data,
            });
          }

          // Route to coaching manager for speaker detection
          const isInterviewer =
            data.source === "microphone" ||
            data.speaker?.toLowerCase().includes("interviewer");
          const isCandidate =
            data.source === "system" ||
            data.speaker?.toLowerCase().includes("interviewee");

          if (data.isFinal) {
            if (isCandidate) {
              coachingManager.handleCandidateSpeech({
                id: segmentId,
                version,
                text: data.text,
                normalizedText: data.text.toLowerCase(),
                speaker: data.speaker || null,
                source: data.source,
                isFinal: data.isFinal,
                timestamp: data.timestamp,
                startTime: data.words?.[0]?.start ?? null,
                endTime: data.words?.[data.words.length - 1]?.end ?? null,
                confidence: data.confidence ?? null,
                words: data.words,
                emittedAt: Date.now(),
                suppressedAsDuplicate: false,
              });
            } else if (isInterviewer) {
              coachingManager.handleInterviewerSpeech({
                id: segmentId,
                version,
                text: data.text,
                normalizedText: data.text.toLowerCase(),
                speaker: data.speaker || null,
                source: data.source,
                isFinal: data.isFinal,
                timestamp: data.timestamp,
                startTime: data.words?.[0]?.start ?? null,
                endTime: data.words?.[data.words.length - 1]?.end ?? null,
                confidence: data.confidence ?? null,
                words: data.words,
                emittedAt: Date.now(),
                suppressedAsDuplicate: false,
              });
            }
          }
        }
      );

      // Set up interviewer question detection for coaching
      this.questionListenerUnsubscribe = transcriptAggregator.onInterviewerQuestion(
        async (segment) => {
          await coachingManager.handleInterviewerQuestion(segment);
        }
      );

      // Initialize coaching manager
      coachingManager.initialize(sessionId, this.floatingWindow?.getWindow() || null);

      // Start audio level forwarding at 60fps
      this.startAudioLevelForwarding();

      // Notify renderer
      safeSendToRenderer(this.mainWindow, {
        type: "unified-recording.started",
        value: {
          sessionId,
          meetingId,
          startedAt: now,
        },
      });

      // Send IPC to start microphone in renderer
      this.mainWindow.webContents.send("message", {
        type: "microphone.start",
        value: { meetingId, language },
      });

      console.log(`[UnifiedRecordingManager] Unified recording started: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error("[UnifiedRecordingManager] Failed to start:", error);
      return null;
    }
  }

  async stopUnifiedRecording(): Promise<boolean> {
    if (!this.currentSession) {
      console.log("[UnifiedRecordingManager] No active session to stop");
      return false;
    }

    if (!this.mainWindow || !this.store) {
      console.error("[UnifiedRecordingManager] Not initialized");
      return false;
    }

    try {
      const { sessionId, meetingId, microphoneTranscriptionId, systemAudioTranscriptionId } =
        this.currentSession;
      const now = Date.now();

      console.log(`[UnifiedRecordingManager] Stopping unified recording: ${sessionId}`);

      // Clean up aggregator event listeners
      if (this.aggregatorUnsubscribe) {
        this.aggregatorUnsubscribe();
        this.aggregatorUnsubscribe = null;
      }
      if (this.questionListenerUnsubscribe) {
        this.questionListenerUnsubscribe();
        this.questionListenerUnsubscribe = null;
      }

      // Reset aggregator and coaching
      transcriptAggregator.setUnifiedMode(false);
      transcriptAggregator.reset();
      coachingManager.reset();

      // Stop audio level forwarding
      this.stopAudioLevelForwarding();

      // Stop microphone recording via IPC
      this.mainWindow.webContents.send("message", {
        type: "microphone.stop",
        value: null,
      });

      // Stop system audio recording (only if it's currently enabled)
      const isSystemAudioEnabled = this.store!.get("isAudioListenerEnabled");
      if (isSystemAudioEnabled) {
        // Dynamic import to avoid circular dependency
        const { handleTranscribe } = await import("../audioRecorder");
        handleTranscribe(this.mainWindow, this.store);
        console.log("[UnifiedRecordingManager] System audio capture stopped");
      }

      // End individual sessions
      const micSession = sessionManager.getSessionBySource("microphone");
      const systemSession = sessionManager.getSessionBySource("system");

      if (micSession) {
        sessionManager.endSession(micSession.getSessionId());
      }
      if (systemSession) {
        sessionManager.endSession(systemSession.getSessionId());
      }

      // Perform speaker mapping if we have both transcriptions
      let speakerMapping: string | null = null;
      if (microphoneTranscriptionId && systemAudioTranscriptionId) {
        const db = getDb();

        // Get segments from both sources
        const getMicSegments = db.prepare(`
          SELECT speaker, text, start_time, end_time, confidence
          FROM transcription_segments
          WHERE transcription_id = ? AND is_final = 1
          ORDER BY start_time
        `);
        const getSystemSegments = db.prepare(`
          SELECT speaker, text, start_time, end_time, confidence
          FROM transcription_segments
          WHERE transcription_id = ? AND is_final = 1
          ORDER BY start_time
        `);

        const micSegments = getMicSegments.all(microphoneTranscriptionId) as Array<{
          speaker: string | null;
          text: string;
          start_time: number | null;
          end_time: number | null;
          confidence: number | null;
        }>;

        const systemSegments = getSystemSegments.all(systemAudioTranscriptionId) as Array<{
          speaker: string | null;
          text: string;
          start_time: number | null;
          end_time: number | null;
          confidence: number | null;
        }>;

        const mapping = this.speakerMapper.mapSpeakers(micSegments, systemSegments);
        speakerMapping = JSON.stringify(mapping);

        console.log(`[UnifiedRecordingManager] Speaker mapping generated:`, mapping);
      }

      // Update unified transcription record
      const db = getDb();
      const updateUnified = db.prepare(`
        UPDATE unified_transcriptions
        SET ended_at = ?, status = ?, speaker_mapping = ?, updated_at = ?
        WHERE session_id = ?
      `);
      updateUnified.run(now, "stopped", speakerMapping, now, sessionId);

      // Close floating window
      this.closeFloatingWindow();

      // Notify renderer
      safeSendToRenderer(this.mainWindow, {
        type: "unified-recording.stopped",
        value: {
          sessionId,
          meetingId,
          endedAt: now,
          duration: Math.floor((now - this.currentSession.startedAt) / 1000),
          speakerMapping: speakerMapping ? JSON.parse(speakerMapping) : null,
        },
      });

      this.currentSession = null;
      console.log(`[UnifiedRecordingManager] Unified recording stopped`);
      return true;
    } catch (error) {
      console.error("[UnifiedRecordingManager] Failed to stop:", error);
      return false;
    }
  }

  getStatus(): UnifiedRecordingStatus {
    if (!this.currentSession) {
      return {
        isActive: false,
        sessionId: null,
        meetingId: null,
        microphoneActive: false,
        systemAudioActive: false,
        startedAt: null,
        duration: null,
        status: "idle",
      };
    }

    const micSession = sessionManager.getSessionBySource("microphone");
    const systemSession = sessionManager.getSessionBySource("system");

    return {
      isActive: true,
      sessionId: this.currentSession.sessionId,
      meetingId: this.currentSession.meetingId,
      microphoneActive: !!micSession,
      systemAudioActive: !!systemSession,
      startedAt: this.currentSession.startedAt,
      duration: Math.floor((Date.now() - this.currentSession.startedAt) / 1000),
      status: "recording",
    };
  }

  isActive(): boolean {
    return this.currentSession !== null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  // Audio level management
  updateMicrophoneLevel(level: number): void {
    this.microphoneLevel = Math.max(0, Math.min(100, level));
  }

  updateSystemAudioLevel(level: number): void {
    this.systemAudioLevel = Math.max(0, Math.min(100, level));
  }

  private startAudioLevelForwarding(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
    }

    // 60fps = ~16ms interval
    this.audioLevelInterval = setInterval(() => {
      if (this.floatingWindow) {
        this.floatingWindow.sendAudioLevels(this.microphoneLevel, this.systemAudioLevel);
      }
    }, 16);
  }

  private stopAudioLevelForwarding(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    this.microphoneLevel = 0;
    this.systemAudioLevel = 0;
  }

  // Floating window management
  private async launchFloatingWindow(): Promise<void> {
    if (this.floatingWindow) {
      this.floatingWindow.show();
      return;
    }

    this.floatingWindow = new FloatingWindowManager(this.store!);
    await this.floatingWindow.create();

    // Set up control callbacks
    this.floatingWindow.onStop(() => {
      this.stopUnifiedRecording();
    });

    this.floatingWindow.onClear(() => {
      if (this.floatingWindow) {
        this.floatingWindow.clearTranscript();
      }
    });

    this.floatingWindow.onTogglePosition(() => {
      if (this.floatingWindow) {
        this.floatingWindow.togglePosition();
      }
    });

    console.log("[UnifiedRecordingManager] Floating window launched");
  }

  private closeFloatingWindow(): void {
    if (this.floatingWindow) {
      this.floatingWindow.destroy();
      this.floatingWindow = null;
    }
  }

  // Send transcript update - routes through aggregator in unified mode
  sendTranscriptUpdate(data: TranscriptUpdateData): void {
    // In unified mode, route through aggregator for deduplication
    if (transcriptAggregator.isUnifiedMode()) {
      transcriptAggregator.ingest(data);
    } else if (this.floatingWindow) {
      // Legacy mode - send directly
      this.floatingWindow.sendTranscriptUpdate(data);
    }
  }

  getFloatingWindow(): FloatingWindowManager | null {
    return this.floatingWindow;
  }

  /**
   * Cleanup method for app shutdown
   */
  async cleanup(): Promise<void> {
    console.log("[UnifiedRecordingManager] Cleaning up...");

    // Stop any active recording
    if (this.currentSession) {
      await this.stopUnifiedRecording();
    }

    // Stop audio level forwarding
    this.stopAudioLevelForwarding();

    // Close floating window
    this.closeFloatingWindow();

    // Reset references
    this.mainWindow = null;
    this.store = null;

    console.log("[UnifiedRecordingManager] Cleanup complete");
  }
}

export const unifiedRecordingManager = UnifiedRecordingManager.getInstance();
export { UnifiedRecordingManager };
