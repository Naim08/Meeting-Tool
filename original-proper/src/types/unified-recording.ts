/**
 * Type definitions for the Unified Audio Recording System
 */

// Recording status and state types
export type RecordingStatus = "idle" | "starting" | "recording" | "stopping" | "stopped" | "error";
export type AudioSource = "microphone" | "system";
export type SpeakerRole = "interviewer" | "interviewee" | "unknown";

// Unified recording session configuration
export interface UnifiedRecordingConfig {
  meetingId?: string;
  language?: string;
  enableDiarization?: boolean;
  speakersExpected?: number;
}

// Status of the unified recording
export interface UnifiedRecordingStatus {
  isActive: boolean;
  sessionId: string | null;
  meetingId: string | null;
  microphoneActive: boolean;
  systemAudioActive: boolean;
  startedAt: number | null;
  duration: number | null;
  status: RecordingStatus;
}

// Unified session stored in database
export interface UnifiedSession {
  id: string;
  sessionId: string;
  meetingId: string | null;
  microphoneTranscriptionId: string | null;
  systemAudioTranscriptionId: string | null;
  speakerMapping: string | null;
  startedAt: number;
  endedAt: number | null;
  status: "active" | "stopped" | "submitted";
  createdAt: number;
  updatedAt: number;
}

// Speaker mapping result
export interface SpeakerMapping {
  [originalLabel: string]: SpeakerRole;
}

export interface SpeakerMappingResult {
  microphoneMapping: SpeakerMapping;
  systemAudioMapping: SpeakerMapping;
  confidence: number;
  analysisDetails: {
    microphoneSpeakers: string[];
    systemAudioSpeakers: string[];
    overlapDetected: boolean;
    echoDetected: boolean;
    totalSegments: number;
  };
}

// Transcript segment for diarization
export interface TranscriptSegment {
  id?: string;
  transcriptionId: string;
  text: string;
  speaker: string | null;
  startTime: number | null;
  endTime: number | null;
  confidence: number | null;
  isFinal: boolean;
  source: AudioSource;
}

// Speaker segment for database
export interface SpeakerSegment {
  id?: string;
  transcriptionId: string;
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number | null;
  startTime: number | null;
  endTime: number | null;
}

// Audio level data for visualization
export interface AudioLevelData {
  microphone: number;
  system: number;
  timestamp: number;
}

// Transcript update sent to floating window
export interface TranscriptUpdateData {
  text: string;
  speaker?: string;
  source: AudioSource;
  isFinal: boolean;
  timestamp: number;
  confidence?: number;
  words?: Array<{
    text: string;
    speaker?: string;
    start: number;
    end: number;
  }>;
}

// Floating window position
export type WindowPosition = "top-left" | "top-right";

// Floating window configuration
export interface FloatingWindowConfig {
  width: number;
  height: number;
  position: WindowPosition;
  alwaysOnTop: boolean;
  opacity: number;
}

// Events emitted by the unified recording system
export interface UnifiedRecordingEvents {
  "unified-recording.started": {
    sessionId: string;
    meetingId: string;
    startedAt: number;
  };
  "unified-recording.stopped": {
    sessionId: string;
    meetingId: string;
    endedAt: number;
    duration: number;
    speakerMapping: SpeakerMappingResult | null;
  };
  "unified-recording.error": {
    sessionId: string | null;
    error: string;
    code: string;
  };
  "audio-levels": AudioLevelData;
  "transcript-update": TranscriptUpdateData;
}

// IPC channel names for unified recording
export const UNIFIED_RECORDING_CHANNELS = {
  START: "unified-recording:start",
  STOP: "unified-recording:stop",
  STATUS: "unified-recording:status",
  MIC_LEVEL: "microphone-audio-level",
  SYSTEM_LEVEL: "system-audio-level",
  TRANSCRIPT_UPDATE: "transcript-update",
  AUDIO_LEVELS: "audio-levels",
} as const;

// Database table name
export const UNIFIED_TRANSCRIPTIONS_TABLE = "unified_transcriptions";

// Default configuration values
export const DEFAULT_UNIFIED_CONFIG: Required<UnifiedRecordingConfig> = {
  meetingId: "",
  language: "en",
  enableDiarization: true,
  speakersExpected: 2,
};

export const DEFAULT_FLOATING_WINDOW_CONFIG: FloatingWindowConfig = {
  width: 400,
  height: 600,
  position: "top-right",
  alwaysOnTop: true,
  opacity: 1.0,
};
