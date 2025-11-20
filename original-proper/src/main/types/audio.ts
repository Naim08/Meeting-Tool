import type { BrowserWindow } from "electron";
import type Store from "electron-store";
import type { AssemblyAI, AudioEncoding } from "assemblyai";

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface TranscriptionConfig {
  sampleRate: number;
  encoding: AudioEncoding;
  // Speaker diarization options
  speakerLabels?: boolean;
  speakersExpected?: number;
}

export interface AudioProcessor {
  processAudio(samples: Float32Array): Int16Array;
  downmixStereoToMono(stereoSamples: Float32Array): Float32Array;
  downsample(samples: Float32Array, factor: number): Float32Array;
}

export interface AudioWriter {
  writeOriginalAudio(buffer: Buffer): Promise<void>;
  writeProcessedAudio(processedBuffers: Float32Array[]): Promise<void>;
}

export interface AudioRecorderDependencies {
  window: BrowserWindow;
  store: Store;
  assemblyClient: AssemblyAI;
  tempDir: string;
}

export interface TranscriptionService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  write(samples: Int16Array): Promise<void>;
  getWriter(): WritableStreamDefaultWriter<Int16Array>;
}
