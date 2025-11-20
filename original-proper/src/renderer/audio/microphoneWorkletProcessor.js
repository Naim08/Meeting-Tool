class MicrophoneWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.rmsUpdateCounter = 0;
    this.rmsUpdateInterval = 8; // Update RMS every 8 frames (~2.7ms at 48kHz)
    this.accumulatedRMS = 0;
    this.frameCount = 0;
  }

  // Calculate RMS (Root Mean Square) from audio samples
  calculateRMS(samples) {
    if (!samples || samples.length === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }

    // Return RMS scaled to 0-100 range
    return Math.sqrt(sumSquares / samples.length) * 100;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const samples = input[0];

      // Calculate RMS for this frame
      const frameRMS = this.calculateRMS(samples);
      this.accumulatedRMS += frameRMS;
      this.frameCount++;
      this.rmsUpdateCounter++;

      // Copy the chunk so the main thread receives an isolated buffer
      this.port.postMessage({
        type: "audio",
        samples: samples.slice(0),
      });

      // Send RMS update at reduced frequency for performance
      if (this.rmsUpdateCounter >= this.rmsUpdateInterval) {
        const averageRMS = this.accumulatedRMS / this.frameCount;
        this.port.postMessage({
          type: "rms",
          level: Math.min(100, averageRMS),
        });

        // Reset accumulators
        this.rmsUpdateCounter = 0;
        this.accumulatedRMS = 0;
        this.frameCount = 0;
      }
    }
    return true;
  }
}

registerProcessor("microphone-worklet", MicrophoneWorkletProcessor);
