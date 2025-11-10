type Source = "microphone" | "system";

interface ActiveSession {
  sessionId: string;
  transcriptionId: string;
  source: Source;
  language: string;
  startTime: number;
  duration: number;
  wordCount: number;
  speakerCount: number;
  fullText: string;
}

class TranscriptionSessionManager {
  private activeSessions = new Map<Source, string>();

  async startSession(
    source: Source,
    language: string = "en",
    meetingId?: string
  ) {
    if (this.activeSessions.has(source)) {
      return this.activeSessions.get(source)!;
    }

    if (!window.api?.transcriptions?.startSession) {
      console.warn(
        "[TranscriptionSessionManager] transcriptions API not available; cannot start session."
      );
      return "";
    }

    const sessionId = await window.api.transcriptions.startSession(
      source,
      language,
      meetingId
    );
    this.activeSessions.set(source, sessionId);
    return sessionId;
  }

  async addSegment(
    source: Source,
    segment: {
      text: string;
      startTime?: number;
      endTime?: number;
      speaker?: number | string;
      confidence?: number;
      isFinal: boolean;
    }
  ) {
    if (!window.api?.transcriptions?.addSegment) {
      return;
    }

    const sessionId = this.activeSessions.get(source);
    if (!sessionId) {
      return;
    }

    if (!segment.isFinal) {
      return;
    }

    await window.api.transcriptions.addSegment(sessionId, {
      id: crypto.randomUUID(),
      text: segment.text,
      startTime: segment.startTime ?? Date.now(),
      endTime: segment.endTime ?? Date.now(),
      speaker: segment.speaker,
      confidence: segment.confidence ?? 0,
      isFinal: true,
    });
  }

  async addSpeakerSegment(
    source: Source,
    segment: {
      speaker: number | string;
      text: string;
      timestamp: number;
      confidence?: number;
      startTime?: number;
      endTime?: number;
    }
  ) {
    if (!window.api?.transcriptions?.addSpeakerSegment) {
      return;
    }

    const sessionId = this.activeSessions.get(source);
    if (!sessionId) {
      return;
    }

    await window.api.transcriptions.addSpeakerSegment(sessionId, {
      id: crypto.randomUUID(),
      ...segment,
    });
  }

  async endSession(source: Source) {
    if (!window.api?.transcriptions?.endSession) {
      return;
    }

    const sessionId = this.activeSessions.get(source);
    if (!sessionId) {
      return;
    }

    await window.api.transcriptions.endSession(sessionId);
    this.activeSessions.delete(source);
  }

  async endSessionById(sessionId: string) {
    if (!window.api?.transcriptions?.endSession) {
      return;
    }

    await window.api.transcriptions.endSession(sessionId);

    for (const [source, activeSessionId] of this.activeSessions.entries()) {
      if (activeSessionId === sessionId) {
        this.activeSessions.delete(source);
        break;
      }
    }
  }

  isRecording(source: Source) {
    return this.activeSessions.has(source);
  }

  getSessionId(source: Source) {
    return this.activeSessions.get(source);
  }

  async syncActiveSessions() {
    if (!window.api?.transcriptions?.getActiveSessions) {
      return;
    }

    const sessions: ActiveSession[] =
      await window.api.transcriptions.getActiveSessions();
    this.activeSessions.clear();
    sessions.forEach((session) => {
      this.activeSessions.set(session.source, session.sessionId);
    });
  }
}

export const transcriptionSessionManager = new TranscriptionSessionManager();
