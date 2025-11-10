import { AssemblyAI, RealtimeTranscript } from "assemblyai";
import { BrowserWindow } from "electron";
import { TranscriptionService, TranscriptionConfig } from "../types/audio";
import { TRANSCRIPTION_CONFIG } from "../config/audio";
import { sessionManager } from "./TranscriptionRecorder";

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

    this.transcriber =
      this.assemblyClient.realtime.transcriber(TRANSCRIPTION_CONFIG);
    this.audioStream = this.transcriber.stream();

    if (this.audioStream) {
      console.log("[Debug] Got AssemblyAI stream, getting writer");
      this.streamWriter = this.audioStream.getWriter();
    } else {
      throw new Error("Failed to get AssemblyAI stream");
    }

    await this.transcriber.connect();
    console.log("[Debug] Connected to AssemblyAI");

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

      this.window.webContents.send("message", {
        type: "transcription.update",
        value: {
          text: transcript.text,
          isFinal: transcript.message_type === "FinalTranscript",
        },
      });

      console.log(
        `${transcript.message_type === "FinalTranscript" ? "Final" : "Partial"}: ${
          transcript.text
        }`
      );

      if (transcript.message_type === "FinalTranscript") {
        try {
          const recorder = sessionManager.getSessionBySource("system");
          if (recorder) {
            const timestamp = Date.now();
            const speakerLabel = (transcript as any).speaker_label as
              | string
              | undefined;
            const confidence = (transcript as any).confidence as
              | number
              | undefined;
            recorder.addSegment({
              text: transcript.text,
              speaker: speakerLabel,
              confidence,
              startTime: timestamp,
              endTime: timestamp,
              isFinal: true,
            });

            if (speakerLabel) {
              recorder.addSpeakerSegment({
                speaker: speakerLabel,
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
