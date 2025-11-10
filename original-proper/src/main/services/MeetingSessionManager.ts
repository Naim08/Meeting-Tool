import { randomUUID } from "crypto";
import type { BrowserWindow } from "electron";
import Store from "electron-store";
import { getDb } from "./Database";
import {
  sessionManager,
  TranscriptionSource,
} from "./TranscriptionRecorder";
import {
  setMicrophoneRecording,
  setSystemAudioRecording,
} from "./RecordingController";
import { safeSendToRenderer } from "../utils/ipc";

interface MeetingConfig {
  mic: boolean;
  system: boolean;
  language?: string;
  title?: string;
}

interface ActiveMeetingSourceState {
  enabled: boolean;
  sessionId?: string;
}

interface ActiveMeetingState {
  id: string;
  startedAt: number;
  title?: string;
  language: string;
  sources: Record<TranscriptionSource, ActiveMeetingSourceState>;
}

export class MeetingSessionManager {
  private window: BrowserWindow | null = null;
  private store: Store | null = null;
  private activeMeeting: ActiveMeetingState | null = null;

  initialize(window: BrowserWindow, store: Store) {
    this.window = window;
    this.store = store;
  }

  getActiveMeeting() {
    if (!this.activeMeeting) {
      return null;
    }

    return {
      id: this.activeMeeting.id,
      startedAt: this.activeMeeting.startedAt,
      title: this.activeMeeting.title,
      language: this.activeMeeting.language,
      sources: this.activeMeeting.sources,
    };
  }

  async getRecentMeetings(limit = 20, offset = 0) {
    const db = getDb();
    const stmt = db.prepare(
      `
        SELECT
          m.*,
          COALESCE(SUM(t.word_count), 0) AS aggregated_word_count,
          GROUP_CONCAT(DISTINCT t.source) AS sources,
          MAX(t.end_time) AS last_transcription_end
        FROM meeting_sessions m
        LEFT JOIN transcriptions t ON t.meeting_id = m.id
        GROUP BY m.id
        ORDER BY m.started_at DESC
        LIMIT ? OFFSET ?
      `
    );
    return stmt.all(limit, offset);
  }

  async getMeetingDetails(meetingId: string) {
    const db = getDb();

    const meetingStmt = db.prepare(
      `SELECT * FROM meeting_sessions WHERE id = ?`
    );
    const meeting = meetingStmt.get(meetingId) as
      | {
          id: string;
          title?: string;
          started_at: number;
          ended_at?: number;
          duration?: number;
          word_count?: number;
          notes?: string;
          created_at: number;
          updated_at: number;
        }
      | undefined;

    if (!meeting) {
      return null;
    }

    const transcriptionsStmt = db.prepare(
      `SELECT * FROM transcriptions WHERE meeting_id = ? ORDER BY start_time ASC`
    );
    const transcriptions = transcriptionsStmt.all(meetingId) as Array<
      Record<string, any>
    >;

    const segmentsStmt = db.prepare(
      `SELECT * FROM transcription_segments WHERE meeting_id = ? ORDER BY start_time ASC, created_at ASC`
    );
    const segments = segmentsStmt.all(meetingId) as Array<Record<string, any>>;

    const segmentsByTranscription = new Map<string, Array<Record<string, any>>>();
    for (const segment of segments) {
      const list = segmentsByTranscription.get(segment.transcription_id) ?? [];
      list.push(segment);
      segmentsByTranscription.set(segment.transcription_id, list);
    }

    return {
      id: meeting.id,
      title: meeting.title ?? null,
      startedAt: meeting.started_at,
      endedAt: meeting.ended_at ?? null,
      duration: meeting.duration ?? null,
      wordCount: meeting.word_count ?? 0,
      notes: meeting.notes ?? null,
      transcriptions: transcriptions.map((row) => {
        const mappedSegments = (segmentsByTranscription.get(row.id) ?? []).map(
          (segment) => ({
            id: segment.id,
            text: segment.text,
            startTime: segment.start_time ?? null,
            endTime: segment.end_time ?? null,
            speaker: segment.speaker ?? null,
            confidence: segment.confidence ?? null,
          })
        );

        return {
          id: row.id,
          sessionId: row.session_id,
          meetingId: row.meeting_id ?? null,
          source: row.source as TranscriptionSource,
          language: row.language ?? "en",
          startTime: row.start_time,
          endTime: row.end_time ?? null,
          duration: row.duration ?? null,
          wordCount: row.word_count ?? 0,
          speakerCount: row.speaker_count ?? 0,
          confidence: row.confidence ?? null,
          fullText: row.full_text ?? "",
          segments: mappedSegments,
        };
      }),
    };
  }

  async startMeeting(config: MeetingConfig) {
    if (this.activeMeeting) {
      return this.activeMeeting.id;
    }

    if (!this.window || !this.store) {
      throw new Error("MeetingSessionManager not initialized with window/store");
    }

    const meetingId = randomUUID();
    const now = Date.now();
    const language = config.language ?? "en";

    const db = getDb();
    const insertMeeting = db.prepare(`
      INSERT INTO meeting_sessions (
        id, title, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);
    insertMeeting.run(meetingId, config.title ?? null, now, now, now);

    this.activeMeeting = {
      id: meetingId,
      startedAt: now,
      title: config.title,
      language,
      sources: {
        microphone: { enabled: false },
        system: { enabled: false },
      },
    };

    if (config.mic) {
      await this.enableSource("microphone", true);
    }
    if (config.system) {
      await this.enableSource("system", true);
    }

    return meetingId;
  }

  async stopMeeting() {
    if (!this.activeMeeting) {
      return;
    }

    await this.enableSource("microphone", false);
    await this.enableSource("system", false);

    const meetingId = this.activeMeeting.id;
    const endedAt = Date.now();
    const db = getDb();

    const aggregateStmt = db.prepare(`
      SELECT
        SUM(word_count) AS total_words,
        MIN(start_time) AS started_at,
        MAX(end_time) AS ended_at
      FROM transcriptions
      WHERE meeting_id = ?
    `);
    const aggregate = aggregateStmt.get(meetingId) as {
      total_words?: number;
      started_at?: number;
      ended_at?: number;
    };

    const durationSeconds =
      aggregate?.started_at && aggregate?.ended_at
        ? Math.max(
            0,
            Math.floor((aggregate.ended_at - aggregate.started_at) / 1000)
          )
        : Math.floor((endedAt - this.activeMeeting.startedAt) / 1000);

    const updateMeeting = db.prepare(`
      UPDATE meeting_sessions
      SET ended_at = ?, duration = ?, word_count = ?, updated_at = ?
      WHERE id = ?
    `);
    updateMeeting.run(
      endedAt,
      durationSeconds,
      aggregate?.total_words ?? 0,
      endedAt,
      meetingId
    );

    this.activeMeeting = null;
  }

  async enableSource(source: TranscriptionSource, enabled: boolean) {
    if (!this.activeMeeting) {
      throw new Error("No active meeting to toggle source");
    }
    if (!this.window || !this.store) {
      throw new Error("MeetingSessionManager not initialized with window/store");
    }

    const sourceState = this.activeMeeting.sources[source];

    if (enabled && sourceState.enabled) {
      return;
    }
    if (!enabled && !sourceState.enabled) {
      return;
    }

    if (enabled) {
      const sessionId = sessionManager.startSession(
        source,
        this.activeMeeting.language,
        this.activeMeeting.id
      );
      sourceState.sessionId = sessionId;

      if (source === "system") {
        await setSystemAudioRecording(this.window, this.store, true);
      } else if (source === "microphone") {
        setMicrophoneRecording(this.window, true, this.activeMeeting.id);
      }
    } else {
      if (source === "system") {
        await setSystemAudioRecording(this.window, this.store, false);
      } else if (source === "microphone") {
        setMicrophoneRecording(this.window, false, this.activeMeeting.id);
      }

      if (sourceState.sessionId) {
        sessionManager.endSession(sourceState.sessionId);
        sourceState.sessionId = undefined;
      }
    }

    sourceState.enabled = enabled;
    this.notifyRendererSourceState(source, enabled);
  }

  private notifyRendererSourceState(
    source: TranscriptionSource,
    enabled: boolean
  ) {
    if (!this.window) {
      return;
    }

    safeSendToRenderer(this.window, {
      type: "meeting.source.toggle",
      value: {
        source,
        enabled,
        meetingId: this.activeMeeting?.id ?? null,
      },
    });
  }
}

export const meetingSessionManager = new MeetingSessionManager();
