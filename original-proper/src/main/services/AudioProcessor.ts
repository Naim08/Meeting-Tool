import { AudioProcessor } from "../types/audio";

export class DefaultAudioProcessor implements AudioProcessor {
  private floatToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = Math.round(sample * 32767);
    }
    return int16Array;
  }

  public processAudio(samples: Float32Array): Int16Array {
    return this.floatToInt16(samples);
  }

  public downmixStereoToMono(stereoSamples: Float32Array): Float32Array {
    const monoLength = stereoSamples.length / 2;
    const monoSamples = new Float32Array(monoLength);

    for (let i = 0; i < monoLength; i++) {
      monoSamples[i] = (stereoSamples[i * 2] + stereoSamples[i * 2 + 1]) / 2;
    }

    return monoSamples;
  }

  public downsample(samples: Float32Array, factor: number): Float32Array {
    const downsampledLength = Math.floor(samples.length / factor);
    const downsampledSamples = new Float32Array(downsampledLength);

    for (let i = 0; i < downsampledLength; i++) {
      downsampledSamples[i] = samples[i * factor];
    }

    return downsampledSamples;
  }
}
