import { ipcMain } from "electron";
import { sessionManager } from "../services/TranscriptionRecorder";
import { getDb } from "../services/Database";

export function setupTranscriptionsHandlers() {
  ipcMain.handle(
    "transcriptions:startSession",
    async (
      _,
      source: "microphone" | "system",
      language: string,
      meetingId?: string
    ) => {
      return sessionManager.startSession(source, language, meetingId);
    }
  );

  ipcMain.handle(
    "transcriptions:addSegment",
    async (_, sessionId: string, segment: any) => {
      const recorder = sessionManager.getSession(sessionId);
      if (!recorder) {
        return;
      }
      recorder.addSegment(segment);
    }
  );

  ipcMain.handle(
    "transcriptions:addSpeakerSegment",
    async (_, sessionId: string, segment: any) => {
      const recorder = sessionManager.getSession(sessionId);
      if (!recorder) {
        return;
      }
      recorder.addSpeakerSegment(segment);
    }
  );

  ipcMain.handle(
    "transcriptions:endSession",
    async (_, sessionId: string) => {
      return sessionManager.endSession(sessionId);
    }
  );

  ipcMain.handle("transcriptions:getActiveSessions", async () => {
    return sessionManager.getActiveSessions();
  });

  ipcMain.handle(
    "transcriptions:getAll",
    async (_, limit = 50, offset = 0) => {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT * FROM transcriptions
        WHERE end_time IS NOT NULL
        ORDER BY start_time DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(limit, offset);
    }
  );

  ipcMain.handle("transcriptions:get", async (_, id: string) => {
    const db = getDb();
    const transcriptionStmt = db.prepare(
      "SELECT * FROM transcriptions WHERE id = ?"
    );
    const transcription = transcriptionStmt.get(id);
    if (!transcription) {
      return null;
    }

    const segmentsStmt = db.prepare(
      `
        SELECT * FROM transcription_segments
        WHERE transcription_id = ?
        ORDER BY created_at ASC
      `
    );
    const speakerStmt = db.prepare(
      `
        SELECT * FROM speaker_segments
        WHERE transcription_id = ?
        ORDER BY timestamp ASC
      `
    );

    return {
      ...transcription,
      segments: segmentsStmt.all(id),
      speakerSegments: speakerStmt.all(id),
    };
  });
}
