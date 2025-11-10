class MicrophoneWorkletProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      // Copy the chunk so the main thread receives an isolated buffer
      this.port.postMessage(input[0].slice(0));
    }
    return true;
  }
}

registerProcessor("microphone-worklet", MicrophoneWorkletProcessor);
