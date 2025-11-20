/**
 * Audio Level Calculator Utility
 * Provides RMS (Root Mean Square) calculation for audio level visualization
 */

export interface AudioLevelResult {
  rms: number;
  peak: number;
  db: number;
}

export interface AudioLevelAccumulator {
  rmsSum: number;
  frameCount: number;
  peakLevel: number;
}

/**
 * Calculate RMS (Root Mean Square) from audio samples
 * Returns value scaled to 0-100 range for visualization
 */
export function calculateRMS(samples: Float32Array | number[]): number {
  if (!samples || samples.length === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] ?? 0;
    sumSquares += sample * sample;
  }

  // Return RMS scaled to 0-100 range
  return Math.sqrt(sumSquares / samples.length) * 100;
}

/**
 * Calculate peak level from audio samples
 * Returns the maximum absolute sample value scaled to 0-100
 */
export function calculatePeak(samples: Float32Array | number[]): number {
  if (!samples || samples.length === 0) return 0;

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const absValue = Math.abs(samples[i] ?? 0);
    if (absValue > peak) {
      peak = absValue;
    }
  }

  return peak * 100;
}

/**
 * Convert linear amplitude to decibels
 * Clamps to -60dB minimum to avoid -Infinity
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -60;
  const db = 20 * Math.log10(linear);
  return Math.max(-60, db);
}

/**
 * Calculate comprehensive audio level metrics
 */
export function calculateAudioLevel(samples: Float32Array | number[]): AudioLevelResult {
  const rms = calculateRMS(samples);
  const peak = calculatePeak(samples);
  const db = linearToDb(rms / 100);

  return { rms, peak, db };
}

/**
 * Create an accumulator for averaging RMS over multiple frames
 */
export function createAccumulator(): AudioLevelAccumulator {
  return {
    rmsSum: 0,
    frameCount: 0,
    peakLevel: 0,
  };
}

/**
 * Add a frame's RMS to the accumulator
 */
export function accumulateFrame(
  accumulator: AudioLevelAccumulator,
  samples: Float32Array | number[]
): void {
  const level = calculateAudioLevel(samples);
  accumulator.rmsSum += level.rms;
  accumulator.frameCount++;
  if (level.peak > accumulator.peakLevel) {
    accumulator.peakLevel = level.peak;
  }
}

/**
 * Get the average RMS from the accumulator and reset it
 */
export function flushAccumulator(accumulator: AudioLevelAccumulator): AudioLevelResult {
  if (accumulator.frameCount === 0) {
    return { rms: 0, peak: 0, db: -60 };
  }

  const avgRms = accumulator.rmsSum / accumulator.frameCount;
  const result: AudioLevelResult = {
    rms: avgRms,
    peak: accumulator.peakLevel,
    db: linearToDb(avgRms / 100),
  };

  // Reset accumulator
  accumulator.rmsSum = 0;
  accumulator.frameCount = 0;
  accumulator.peakLevel = 0;

  return result;
}

/**
 * Smooth audio level transitions for visualization
 * Uses exponential moving average
 */
export function smoothLevel(
  currentLevel: number,
  targetLevel: number,
  smoothingFactor: number = 0.2
): number {
  return currentLevel + (targetLevel - currentLevel) * smoothingFactor;
}

/**
 * Clamp a value between min and max
 */
export function clampLevel(value: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, value));
}
