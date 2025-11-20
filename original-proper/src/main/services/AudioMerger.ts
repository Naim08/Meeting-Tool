/**
 * AudioMerger - Merges multiple audio streams into a single output
 * Used for combining microphone and system audio in unified recording
 */

import { Transform, Readable, PassThrough } from "stream";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { app } from "electron";

export interface AudioStreamConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface MergeOptions {
  microphoneGain: number;
  systemAudioGain: number;
  outputSampleRate: number;
  outputChannels: number;
}

export interface AudioChunk {
  source: "microphone" | "system";
  samples: Float32Array;
  timestamp: number;
}

export interface MergedAudioResult {
  filePath: string;
  duration: number;
  sampleRate: number;
  channels: number;
}

const DEFAULT_MERGE_OPTIONS: MergeOptions = {
  microphoneGain: 1.0,
  systemAudioGain: 0.8,
  outputSampleRate: 16000,
  outputChannels: 2, // Stereo: mic on left, system on right
};

export class AudioMerger {
  private microphoneBuffer: Float32Array[] = [];
  private systemBuffer: Float32Array[] = [];
  private mergedBuffer: Float32Array[] = [];
  private options: MergeOptions;
  private isRecording: boolean = false;
  private startTime: number = 0;
  private outputDir: string;

  constructor(options: Partial<MergeOptions> = {}) {
    this.options = { ...DEFAULT_MERGE_OPTIONS, ...options };
    this.outputDir = join(app.getPath("userData"), "recordings");

    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Start recording and merging
   */
  start(): void {
    this.microphoneBuffer = [];
    this.systemBuffer = [];
    this.mergedBuffer = [];
    this.isRecording = true;
    this.startTime = Date.now();
    console.log("[AudioMerger] Started recording");
  }

  /**
   * Stop recording and return merged result
   */
  stop(): MergedAudioResult | null {
    if (!this.isRecording) {
      return null;
    }

    this.isRecording = false;
    const duration = (Date.now() - this.startTime) / 1000;

    // Merge buffered audio
    const merged = this.mergeBuffers();
    if (!merged || merged.length === 0) {
      console.log("[AudioMerger] No audio to merge");
      return null;
    }

    // Write to WAV file
    const filename = `unified_${Date.now()}.wav`;
    const filePath = join(this.outputDir, filename);

    try {
      this.writeWavFile(filePath, merged, this.options.outputSampleRate, this.options.outputChannels);
      console.log(`[AudioMerger] Wrote merged audio to: ${filePath}`);

      return {
        filePath,
        duration,
        sampleRate: this.options.outputSampleRate,
        channels: this.options.outputChannels,
      };
    } catch (error) {
      console.error("[AudioMerger] Failed to write WAV file:", error);
      return null;
    }
  }

  /**
   * Add microphone audio chunk
   */
  addMicrophoneChunk(samples: Float32Array): void {
    if (!this.isRecording) return;
    this.microphoneBuffer.push(samples.slice(0));
  }

  /**
   * Add system audio chunk
   */
  addSystemChunk(samples: Float32Array): void {
    if (!this.isRecording) return;
    this.systemBuffer.push(samples.slice(0));
  }

  /**
   * Merge microphone and system audio buffers
   * Creates stereo output: left = microphone, right = system
   */
  merge(): Float32Array {
    const micSamples = this.flattenBuffer(this.microphoneBuffer);
    const systemSamples = this.flattenBuffer(this.systemBuffer);

    // Determine output length (longest of the two)
    const maxLength = Math.max(micSamples.length, systemSamples.length);

    if (maxLength === 0) {
      return new Float32Array(0);
    }

    // Create stereo interleaved output
    const stereoOutput = new Float32Array(maxLength * 2);

    for (let i = 0; i < maxLength; i++) {
      // Left channel: microphone (with gain)
      const micSample = i < micSamples.length ? micSamples[i] : 0;
      stereoOutput[i * 2] = this.clamp(micSample * this.options.microphoneGain);

      // Right channel: system audio (with gain)
      const systemSample = i < systemSamples.length ? systemSamples[i] : 0;
      stereoOutput[i * 2 + 1] = this.clamp(systemSample * this.options.systemAudioGain);
    }

    return stereoOutput;
  }

  /**
   * Create a mixed mono output (both sources combined)
   */
  mergeMono(): Float32Array {
    const micSamples = this.flattenBuffer(this.microphoneBuffer);
    const systemSamples = this.flattenBuffer(this.systemBuffer);

    const maxLength = Math.max(micSamples.length, systemSamples.length);

    if (maxLength === 0) {
      return new Float32Array(0);
    }

    const monoOutput = new Float32Array(maxLength);

    for (let i = 0; i < maxLength; i++) {
      const micSample = i < micSamples.length ? micSamples[i] * this.options.microphoneGain : 0;
      const systemSample = i < systemSamples.length ? systemSamples[i] * this.options.systemAudioGain : 0;

      // Mix both sources (average with slight boost)
      monoOutput[i] = this.clamp((micSample + systemSample) * 0.6);
    }

    return monoOutput;
  }

  /**
   * Internal merge for stop() method
   */
  private mergeBuffers(): Float32Array {
    if (this.options.outputChannels === 1) {
      return this.mergeMono();
    }
    return this.merge();
  }

  /**
   * Flatten array of Float32Arrays into single array
   */
  private flattenBuffer(buffer: Float32Array[]): Float32Array {
    if (buffer.length === 0) {
      return new Float32Array(0);
    }

    const totalLength = buffer.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Float32Array(totalLength);

    let offset = 0;
    for (const chunk of buffer) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Clamp sample value to valid range
   */
  private clamp(value: number): number {
    return Math.max(-1, Math.min(1, value));
  }

  /**
   * Write audio data to WAV file
   */
  private writeWavFile(
    filePath: string,
    samples: Float32Array,
    sampleRate: number,
    channels: number
  ): void {
    const bytesPerSample = 2; // 16-bit PCM
    const dataSize = samples.length * bytesPerSample;
    const headerSize = 44;
    const fileSize = headerSize + dataSize;

    const buffer = Buffer.alloc(fileSize);

    // RIFF header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write("WAVE", 8);

    // fmt chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // byte rate
    buffer.writeUInt16LE(channels * bytesPerSample, 32); // block align
    buffer.writeUInt16LE(bytesPerSample * 8, 34); // bits per sample

    // data chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Convert float samples to 16-bit PCM
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      buffer.writeInt16LE(Math.round(intSample), 44 + i * 2);
    }

    writeFileSync(filePath, buffer);
  }

  /**
   * Get current buffer sizes (for monitoring)
   */
  getBufferStats(): { microphoneChunks: number; systemChunks: number; isRecording: boolean } {
    return {
      microphoneChunks: this.microphoneBuffer.length,
      systemChunks: this.systemBuffer.length,
      isRecording: this.isRecording,
    };
  }

  /**
   * Clear all buffers
   */
  clear(): void {
    this.microphoneBuffer = [];
    this.systemBuffer = [];
    this.mergedBuffer = [];
  }

  /**
   * Set gain levels
   */
  setGains(microphoneGain: number, systemAudioGain: number): void {
    this.options.microphoneGain = Math.max(0, Math.min(2, microphoneGain));
    this.options.systemAudioGain = Math.max(0, Math.min(2, systemAudioGain));
  }
}

// Export singleton instance
export const audioMerger = new AudioMerger();
