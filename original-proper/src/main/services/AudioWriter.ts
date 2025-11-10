import { join } from "path";
import { writeFileSync } from "fs";
import * as wav from "wav";
import { AudioWriter, AudioConfig } from "../types/audio";
import {
  ORIGINAL_AUDIO_CONFIG,
  PROCESSED_AUDIO_CONFIG,
  FILE_PATHS,
} from "../config/audio";

export class WavAudioWriter implements AudioWriter {
  private tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
  }

  private floatToInt32(samples: Float32Array): Int32Array {
    const int32Samples = new Int32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      int32Samples[i] = Math.floor(sample * 0x7fffffff);
    }
    return int32Samples;
  }

  private async writeWavFile(
    samples: Int32Array,
    config: AudioConfig,
    filename: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const writer = new wav.Writer({
        channels: config.channels,
        sampleRate: config.sampleRate,
        bitDepth: config.bitDepth,
      });

      writer.on("data", (chunk) => chunks.push(chunk));
      writer.on("end", () => {
        try {
          const filepath = join(this.tempDir, filename);
          writeFileSync(filepath, Buffer.concat(chunks));
          console.log(`Saved audio to ${filepath}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      writer.on("error", reject);

      writer.write(Buffer.from(samples.buffer));
      writer.end();
    });
  }

  public async writeOriginalAudio(buffer: Buffer): Promise<void> {
    if (buffer.length === 0) {
      console.log("No original audio data to save");
      return;
    }

    const floatSamples = new Float32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.length / 4
    );
    const int32Samples = this.floatToInt32(floatSamples);

    await this.writeWavFile(
      int32Samples,
      ORIGINAL_AUDIO_CONFIG,
      FILE_PATHS.ORIGINAL_RECORDING
    );
  }

  public async writeProcessedAudio(
    processedBuffers: Float32Array[]
  ): Promise<void> {
    if (processedBuffers.length === 0) {
      console.log("No processed audio data to save");
      return;
    }

    // Concatenate all processed chunks
    const totalLength = processedBuffers.reduce(
      (sum, chunk) => sum + chunk.length,
      0
    );
    const processedSamples = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of processedBuffers) {
      processedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    const int32Samples = this.floatToInt32(processedSamples);

    await this.writeWavFile(
      int32Samples,
      PROCESSED_AUDIO_CONFIG,
      FILE_PATHS.PROCESSED_RECORDING
    );
  }
}
