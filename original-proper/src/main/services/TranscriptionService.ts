import { AssemblyAI, RealtimeTranscript } from "assemblyai";
import { BrowserWindow } from "electron";
import { TranscriptionService, TranscriptionConfig } from "../types/audio";
import { TRANSCRIPTION_CONFIG } from "../config/audio";
import { sessionManager } from "./TranscriptionRecorder";
import { unifiedRecordingManager } from "./UnifiedRecordingManager";

export class AssemblyAITranscriptionService implements TranscriptionService {
  private transcriber: any;
  private assemblyClient: AssemblyAI;
  private window: BrowserWindow;
  private audioStream: WritableStream<Int16Array> | null = null;
  private streamWriter: WritableStreamDefaultWriter<Int16Array> | null = null;

  constructor(assemblyClient: AssemblyAI, window: BrowserWindow) {
    this.assemblyClient = assemblyClient;
    this.window = window;
  }

  public async connect(): Promise<void> {
    console.log("[Debug] Setting up AssemblyAI transcriber");

    // Build config with speaker diarization support
    const realtimeConfig: Record<string, unknown> = {
      sampleRate: TRANSCRIPTION_CONFIG.sampleRate,
      encoding: TRANSCRIPTION_CONFIG.encoding,
    };

    // Enable word-level timestamps for better speaker attribution
    if (TRANSCRIPTION_CONFIG.speakerLabels) {
      realtimeConfig.word_boost = [];
      console.log("[Debug] Speaker labels enabled for AssemblyAI realtime");
    }

    this.transcriber = this.assemblyClient.realtime.transcriber(realtimeConfig);
    this.audioStream = this.transcriber.stream();

    if (this.audioStream) {
      console.log("[Debug] Got AssemblyAI stream, getting writer");
      this.streamWriter = this.audioStream.getWriter();
    } else {
      throw new Error("Failed to get AssemblyAI stream");
    }

    await this.transcriber.connect();
    console.log("[Debug] Connected to AssemblyAI with speaker diarization");

    this.setupEventHandlers();
  }

  public async disconnect(): Promise<void> {
    if (this.streamWriter) {
      await this.streamWriter.close();
      this.streamWriter = null;
    }
    if (this.transcriber) {
      await this.transcriber.close();
    }
  }

  public async write(samples: Int16Array): Promise<void> {
    if (!this.streamWriter) {
      throw new Error("No stream writer available");
    }

    await this.streamWriter.write(samples);
  }

  public getWriter(): WritableStreamDefaultWriter<Int16Array> {
    if (!this.streamWriter) {
      throw new Error("No stream writer available");
    }
    return this.streamWriter;
  }

  private setupEventHandlers(): void {
    this.transcriber.on("open", ({ sessionId }: { sessionId: string }) => {
      console.log(`[Debug] AssemblyAI session opened with ID: ${sessionId}`);
    });

    this.transcriber.on("error", (error: Error) => {
      console.error("[Debug] AssemblyAI error:", error);
      this.window.webContents.send("message", {
        type: "transcription.error",
        value: error.message,
      });
    });

    this.transcriber.on("close", (code: number, reason: string) => {
      console.log("[Debug] AssemblyAI session closed:", code, reason);
    });

    this.transcriber.on("transcript", (transcript: RealtimeTranscript) => {
      if (!transcript.text) return;

      const isFinal = transcript.message_type === "FinalTranscript";
      const timestamp = Date.now();

      // Extract speaker information from transcript
      const speakerLabel = (transcript as any).speaker_label as string | undefined;
      const confidence = (transcript as any).confidence as number | undefined;
      const words = (transcript as any).words as Array<{
        text: string;
        start: number;
        end: number;
        speaker?: string;
        confidence?: number;
      }> | undefined;

      // Send to renderer with enhanced speaker info
      this.window.webContents.send("message", {
        type: "transcription.update",
        value: {
          text: transcript.text,
          isFinal,
          source: "system",
          speaker: speakerLabel || (words?.[0]?.speaker ? `Speaker ${words[0].speaker}` : undefined),
          confidence,
          timestamp,
          words: words?.map(w => ({
            text: w.text,
            speaker: w.speaker,
            start: w.start,
            end: w.end,
          })),
        },
      });

      console.log(
        `[System Audio] ${isFinal ? "Final" : "Partial"}: ${transcript.text}${
          speakerLabel ? ` (${speakerLabel})` : ""
        }`
      );

      // Send to floating window via unified recording manager
      if (unifiedRecordingManager.isActive()) {
        unifiedRecordingManager.sendTranscriptUpdate({
          text: transcript.text,
          speaker: speakerLabel || (words?.[0]?.speaker ? `Speaker ${words[0].speaker}` : undefined),
          source: "system",
          isFinal,
          timestamp,
          confidence,
          words: words?.map(w => ({
            text: w.text,
            speaker: w.speaker,
            start: w.start,
            end: w.end,
          })),
        });
      }

      if (isFinal) {
        try {
          const recorder = sessionManager.getSessionBySource("system");
          if (recorder) {
            // Determine speaker from words or label
            const detectedSpeaker = speakerLabel ||
              (words?.[0]?.speaker ? `Speaker ${words[0].speaker}` : undefined);

            recorder.addSegment({
              text: transcript.text,
              speaker: detectedSpeaker,
              confidence,
              startTime: timestamp,
              endTime: timestamp,
              isFinal: true,
            });

            if (detectedSpeaker) {
              recorder.addSpeakerSegment({
                speaker: detectedSpeaker,
                text: transcript.text,
                timestamp,
                confidence,
              });
            }
          }
        } catch (error) {
          console.error("[AssemblyAI] Failed to persist system transcript:", error);
        }
      }
    });
  }
}
