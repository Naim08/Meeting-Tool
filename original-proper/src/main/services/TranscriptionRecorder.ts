import { randomUUID } from "crypto";
import { getDb } from "./Database";

export type TranscriptionSource = "microphone" | "system";

interface TranscriptionSegment {
  id?: string;
  text: string;
  startTime?: number;
  endTime?: number;
  speaker?: string | number;
  confidence?: number;
  isFinal: boolean;
}

interface SpeakerSegment {
  speaker: string | number;
  text: string;
  timestamp: number;
  confidence?: number;
  startTime?: number;
  endTime?: number;
}

export class TranscriptionRecorder {
  private readonly sessionId: string;
  private readonly transcriptionId: string;
  private readonly source: TranscriptionSource;
  private readonly language: string;
  private readonly meetingId?: string;
  private readonly startedAt: number;
  private fullText = "";
  private wordCount = 0;
  private speakerSet = new Set<string | number>();

  constructor(source: TranscriptionSource, language: string, meetingId?: string) {
    this.sessionId = randomUUID();
    this.transcriptionId = randomUUID();
    this.source = source;
    this.language = language;
    this.startedAt = Date.now();
    this.meetingId = meetingId;

    const db = getDb();
    const now = Date.now();

    const insertTranscription = db.prepare(`
      INSERT INTO transcriptions (
        id, session_id, meeting_id, source, language, start_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTranscription.run(
      this.transcriptionId,
      this.sessionId,
      meetingId ?? null,
      source,
      language,
      this.startedAt,
      now,
      now
    );

    const insertActive = db.prepare(`
      INSERT INTO active_sessions (
        session_id, transcription_id, meeting_id, source, language, started_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertActive.run(
      this.sessionId,
      this.transcriptionId,
      meetingId ?? null,
      source,
      language,
      this.startedAt,
      now
    );
  }

  getSessionId() {
    return this.sessionId;
  }

  getTranscriptionId() {
    return this.transcriptionId;
  }

  addSegment(segment: TranscriptionSegment) {
    const db = getDb();
    const id = segment.id ?? randomUUID();
    const createdAt = Date.now();

    const stmt = db.prepare(`
      INSERT INTO transcription_segments (
        id, transcription_id, meeting_id, text, start_time, end_time, speaker, confidence, is_final, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      this.transcriptionId,
      this.meetingId ?? null,
      segment.text,
      segment.startTime ?? null,
      segment.endTime ?? null,
      segment.speaker !== undefined ? String(segment.speaker) : null,
      segment.confidence ?? null,
      segment.isFinal ? 1 : 0,
      createdAt
    );

    if (segment.isFinal) {
      this.fullText = `${this.fullText} ${segment.text}`.trim();
      this.wordCount = this.fullText
        .split(/\s+/)
        .filter((word) => word.length > 0).length;

      const updateTranscription = db.prepare(`
        UPDATE transcriptions
        SET full_text = ?, word_count = ?, updated_at = ?
        WHERE id = ?
      `);
      updateTranscription.run(this.fullText, this.wordCount, createdAt, this.transcriptionId);
    }

    if (segment.speaker !== undefined) {
      this.speakerSet.add(segment.speaker);
    }

    const updateActive = db.prepare(`
      UPDATE active_sessions
      SET last_updated = ?
      WHERE session_id = ?
    `);
    updateActive.run(createdAt, this.sessionId);
  }

  addSpeakerSegment(segment: SpeakerSegment) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO speaker_segments (
        id, transcription_id, meeting_id, speaker, text, timestamp, confidence, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      randomUUID(),
      this.transcriptionId,
      this.meetingId ?? null,
      String(segment.speaker),
      segment.text,
      segment.timestamp,
      segment.confidence ?? null,
      segment.startTime ?? null,
      segment.endTime ?? null
    );

    this.speakerSet.add(segment.speaker);

    const updateSpeakerCount = db.prepare(`
      UPDATE transcriptions
      SET speaker_count = ?
      WHERE id = ?
    `);
    updateSpeakerCount.run(this.speakerSet.size, this.transcriptionId);
  }

  endSession() {
    const db = getDb();
    const endedAt = Date.now();
    const durationSeconds = Math.floor((endedAt - this.startedAt) / 1000);

    const avgConfidenceStmt = db.prepare(`
      SELECT AVG(confidence) AS avg_confidence
      FROM transcription_segments
      WHERE transcription_id = ? AND is_final = 1
    `);
    const result = avgConfidenceStmt.get(this.transcriptionId) as {
      avg_confidence?: number;
    };

    const updateTranscription = db.prepare(`
      UPDATE transcriptions
      SET end_time = ?, duration = ?, confidence = ?, speaker_count = ?, updated_at = ?
      WHERE id = ?
    `);
    updateTranscription.run(
      endedAt,
      durationSeconds,
      result?.avg_confidence ?? 0,
      this.speakerSet.size,
      endedAt,
      this.transcriptionId
    );

    const removeActive = db.prepare(`
      DELETE FROM active_sessions WHERE session_id = ?
    `);
    removeActive.run(this.sessionId);
  }

  getInfo() {
    return {
      sessionId: this.sessionId,
      transcriptionId: this.transcriptionId,
      meetingId: this.meetingId,
      source: this.source,
      language: this.language,
      startTime: this.startedAt,
      duration: Math.floor((Date.now() - this.startedAt) / 1000),
      wordCount: this.wordCount,
      speakerCount: this.speakerSet.size,
      fullText: this.fullText,
    };
  }
}

export class SessionManager {
  private sessions = new Map<string, TranscriptionRecorder>();
  private sourceIndex = new Map<TranscriptionSource, string>();

  startSession(
    source: TranscriptionSource,
    language: string,
    meetingId?: string
  ) {
    const existingSessionId = this.sourceIndex.get(source);
    if (existingSessionId) {
      return existingSessionId;
    }

    const recorder = new TranscriptionRecorder(source, language, meetingId);
    this.sessions.set(recorder.getSessionId(), recorder);
    this.sourceIndex.set(source, recorder.getSessionId());
    return recorder.getSessionId();
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  endSession(sessionId: string) {
    const recorder = this.sessions.get(sessionId);
    if (!recorder) {
      return null;
    }
    recorder.endSession();
    this.sessions.delete(sessionId);
    for (const [source, id] of this.sourceIndex.entries()) {
      if (id === sessionId) {
        this.sourceIndex.delete(source);
        break;
      }
    }
    return {
      sessionId,
      transcriptionId: recorder.getTranscriptionId(),
    };
  }

  getSessionBySource(source: TranscriptionSource) {
    const sessionId = this.sourceIndex.get(source);
    if (!sessionId) {
      return undefined;
    }
    return this.sessions.get(sessionId);
  }

  getActiveSessions() {
    return Array.from(this.sessions.values()).map((recorder) =>
      recorder.getInfo()
    );
  }
}

export const sessionManager = new SessionManager();
