import { randomUUID } from "crypto";
import { BrowserWindow } from "electron";
import Store from "electron-store";

import { getDb } from "./Database";
import { sessionManager, TranscriptionSource } from "./TranscriptionRecorder";
import { SpeakerMapper } from "./SpeakerMapper";
import { TranscriptFloatingWindow } from "./TranscriptFloatingWindow";
import { safeSendToRenderer } from "../utils/ipc";
import { handleTranscribe } from "../audioRecorder";

export interface UnifiedRecordingStatus {
  isActive: boolean;
  sessionId: string | null;
  meetingId: string | null;
  microphoneActive: boolean;
  systemAudioActive: boolean;
  startedAt: number | null;
  duration: number | null;
}

export interface UnifiedRecordingConfig {
  meetingId?: string;
  language?: string;
}

interface UnifiedSession {
  id: string;
  sessionId: string;
  meetingId: string;
  microphoneTranscriptionId: string | null;
  systemAudioTranscriptionId: string | null;
  startedAt: number;
  status: "active" | "stopped" | "submitted";
}

class UnifiedRecordingController {
  private static instance: UnifiedRecordingController | null = null;
  private currentSession: UnifiedSession | null = null;
  private floatingWindow: TranscriptFloatingWindow | null = null;
  private mainWindow: BrowserWindow | null = null;
  private store: Store | null = null;
  private speakerMapper: SpeakerMapper;

  // Audio level tracking for 60fps updates
  private microphoneLevel: number = 0;
  private systemAudioLevel: number = 0;
  private audioLevelInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.speakerMapper = new SpeakerMapper();
  }

  static getInstance(): UnifiedRecordingController {
    if (!UnifiedRecordingController.instance) {
      UnifiedRecordingController.instance = new UnifiedRecordingController();
    }
    return UnifiedRecordingController.instance;
  }

  initialize(mainWindow: BrowserWindow, store: Store): void {
    this.mainWindow = mainWindow;
    this.store = store;
    console.log("[UnifiedRecordingController] Initialized");
  }

  async startUnifiedRecording(config: UnifiedRecordingConfig = {}): Promise<string | null> {
    if (this.currentSession) {
      console.log("[UnifiedRecordingController] Session already active");
      return this.currentSession.sessionId;
    }

    if (!this.mainWindow || !this.store) {
      console.error("[UnifiedRecordingController] Not initialized");
      return null;
    }

    try {
      const meetingId = config.meetingId || `meeting-${Date.now()}`;
      const language = config.language || "en";
      const sessionId = randomUUID();
      const now = Date.now();

      console.log(`[UnifiedRecordingController] Starting unified recording: ${sessionId}`);

      // Create unified transcription record
      const db = getDb();
      const id = randomUUID();

      const insertUnified = db.prepare(`
        INSERT INTO unified_transcriptions (
          id, session_id, meeting_id, started_at, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertUnified.run(id, sessionId, meetingId, now, "active", now, now);

      // Start microphone session
      const micSessionId = sessionManager.startSession("microphone", language, meetingId);
      const micRecorder = sessionManager.getSession(micSessionId);

      // Start system audio recording
      handleTranscribe(this.mainWindow, this.store);
      const systemSessionId = sessionManager.startSession("system", language, meetingId);
      const systemRecorder = sessionManager.getSession(systemSessionId);

      // Update unified transcription with transcription IDs
      const updateUnified = db.prepare(`
        UPDATE unified_transcriptions
        SET microphone_transcription_id = ?, system_audio_transcription_id = ?, updated_at = ?
        WHERE session_id = ?
      `);
      updateUnified.run(
        micRecorder?.getTranscriptionId() || null,
        systemRecorder?.getTranscriptionId() || null,
        now,
        sessionId
      );

      this.currentSession = {
        id,
        sessionId,
        meetingId,
        microphoneTranscriptionId: micRecorder?.getTranscriptionId() || null,
        systemAudioTranscriptionId: systemRecorder?.getTranscriptionId() || null,
        startedAt: now,
        status: "active",
      };

      // Launch floating transcript window
      await this.launchFloatingWindow();

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

      console.log(`[UnifiedRecordingController] Unified recording started: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error("[UnifiedRecordingController] Failed to start:", error);
      return null;
    }
  }

  async stopUnifiedRecording(): Promise<boolean> {
    if (!this.currentSession) {
      console.log("[UnifiedRecordingController] No active session to stop");
      return false;
    }

    if (!this.mainWindow || !this.store) {
      console.error("[UnifiedRecordingController] Not initialized");
      return false;
    }

    try {
      const { sessionId, meetingId, microphoneTranscriptionId, systemAudioTranscriptionId } =
        this.currentSession;
      const now = Date.now();

      console.log(`[UnifiedRecordingController] Stopping unified recording: ${sessionId}`);

      // Stop audio level forwarding
      this.stopAudioLevelForwarding();

      // Stop microphone recording via IPC
      this.mainWindow.webContents.send("message", {
        type: "microphone.stop",
        value: null,
      });

      // Stop system audio recording
      handleTranscribe(this.mainWindow, this.store);

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

        console.log(`[UnifiedRecordingController] Speaker mapping generated:`, mapping);
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
      console.log(`[UnifiedRecordingController] Unified recording stopped`);
      return true;
    } catch (error) {
      console.error("[UnifiedRecordingController] Failed to stop:", error);
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

    this.floatingWindow = new TranscriptFloatingWindow(this.store!);
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

    console.log("[UnifiedRecordingController] Floating window launched");
  }

  private closeFloatingWindow(): void {
    if (this.floatingWindow) {
      this.floatingWindow.destroy();
      this.floatingWindow = null;
    }
  }

  // Send transcript update to floating window
  sendTranscriptUpdate(data: {
    text: string;
    speaker?: string;
    source: "microphone" | "system";
    isFinal: boolean;
    timestamp: number;
    confidence?: number;
  }): void {
    if (this.floatingWindow) {
      this.floatingWindow.sendTranscriptUpdate(data);
    }
  }

  getFloatingWindow(): TranscriptFloatingWindow | null {
    return this.floatingWindow;
  }
}

export const unifiedRecordingController = UnifiedRecordingController.getInstance();
