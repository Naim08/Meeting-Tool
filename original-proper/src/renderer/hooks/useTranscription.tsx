import { useRef, useState, useEffect, useCallback } from "react";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { getTranscriptionOptions } from "../config/deepgram";
import { getServerRoot } from "../lib/utils";
import { transcriptionSessionManager } from "@/services/TranscriptionSessionManager";

const AUDIO_CHUNK_DURATION_MS = 250;
const WORKLET_MODULE_URL = new URL(
  "../audio/microphoneWorkletProcessor.js",
  import.meta.url
);

const fetchDeepgramKey = async () => {
  try {
    const response = await fetch(`${getServerRoot()}/api/keys`, {
      method: "POST",
      body: "{}",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch Deepgram key:", error);
  }
};

const expireDeepgramKey = async (keyId: string) => {
  try {
    const response = await fetch(`${getServerRoot()}/api/keys`, {
      method: "POST",
      body: JSON.stringify({ keyId }),
    });
    return response.json();
  } catch (error) {
    console.error("Failed to expire Deepgram key:", error);
  }
};

const useTranscription = () => {
  const deepgramKeyId = useRef(null);
  const deepgramLive = useRef(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef =
    useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<number[]>([]);
  const samplesPerChunkRef = useRef<number>(0);
  const isDeepgramReadyRef = useRef(false);
  const [isMicrophoneRecording, setIsMicrophoneRecording] = useState(false);
  const [isMicrophoneRecordingLoading, setIsMicrophoneRecordingLoading] =
    useState(false);
  const [transcript, setTranscript] = useState({});

  const resetAudioPipelineState = useCallback(() => {
    audioQueueRef.current = [];
    samplesPerChunkRef.current = 0;
    isDeepgramReadyRef.current = false;
  }, []);

  const stopAudioPipeline = useCallback(async () => {
    try {
      audioWorkletRef.current?.port?.postMessage({ type: "stop" });
    } catch (error) {
      console.error("[useTranscription] Error signalling worklet stop:", error);
    }

    if (audioWorkletRef.current) {
      try {
        audioWorkletRef.current.port.onmessage = null;
        audioWorkletRef.current.disconnect();
      } catch (error) {
        console.error("[useTranscription] Error disconnecting worklet:", error);
      }
      audioWorkletRef.current = null;
    }

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch (error) {
        console.error("[useTranscription] Error disconnecting source:", error);
      }
      audioSourceRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (error) {
        console.error("[useTranscription] Error closing audio context:", error);
      }
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("[useTranscription] Error stopping media tracks:", error);
      }
      mediaStreamRef.current = null;
    }

    resetAudioPipelineState();
  }, [resetAudioPipelineState]);

  const flushQueuedAudio = useCallback(() => {
    if (!isDeepgramReadyRef.current) {
      return;
    }

    const samplesPerChunk = samplesPerChunkRef.current;
    if (!samplesPerChunk || samplesPerChunk <= 0) {
      return;
    }

    const queuedSamples = audioQueueRef.current;
    while (queuedSamples.length >= samplesPerChunk) {
      const chunk = queuedSamples.splice(0, samplesPerChunk);
      const pcmBuffer = new Int16Array(chunk.length);

      for (let i = 0; i < chunk.length; i++) {
        // Clamp to [-1, 1] and convert to 16-bit PCM
        const sample = Math.max(-1, Math.min(1, chunk[i] ?? 0));
        pcmBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      try {
        if (
          deepgramLive.current &&
          typeof deepgramLive.current.getReadyState === "function" &&
          deepgramLive.current.getReadyState() === 1
        ) {
          deepgramLive.current.send(pcmBuffer.buffer);
        }
      } catch (error) {
        console.error("[useTranscription] Error sending audio chunk:", error);
      }
    }
  }, []);

  const appendAudioSamples = useCallback(
    (chunk: Float32Array) => {
      if (!chunk || !chunk.length) {
        return;
      }

      const queuedSamples = audioQueueRef.current;
      for (let i = 0; i < chunk.length; i++) {
        queuedSamples.push(chunk[i]);
      }

      flushQueuedAudio();

      const samplesPerChunk = samplesPerChunkRef.current || 0;
      const maxBufferedSamples = samplesPerChunk * 8; // Allow up to ~2 seconds buffered
      if (maxBufferedSamples > 0 && queuedSamples.length > maxBufferedSamples) {
        // Drop the oldest samples to prevent unbounded growth if Deepgram is slow
        queuedSamples.splice(0, queuedSamples.length - maxBufferedSamples);
      }
    },
    [flushQueuedAudio]
  );

  const setupAudioPipeline = useCallback(
    async (stream: MediaStream) => {
      resetAudioPipelineState();

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const sampleRate = audioContext.sampleRate;
      samplesPerChunkRef.current = Math.max(
        1,
        Math.round((sampleRate / 1000) * AUDIO_CHUNK_DURATION_MS)
      );

      try {
        await audioContext.audioWorklet.addModule(WORKLET_MODULE_URL.href);
      } catch (error) {
        console.error(
          "[useTranscription] Failed to load audio worklet module:",
          error
        );
        throw error;
      }

      const source = audioContext.createMediaStreamSource(stream);
      audioSourceRef.current = source;

      const workletNode = new AudioWorkletNode(
        audioContext,
        "microphone-worklet",
        {
          numberOfInputs: 1,
          numberOfOutputs: 0,
          channelCount: 1,
        }
      );
      audioWorkletRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const { data } = event;

        // Handle new message format with type field
        if (data && typeof data === "object" && "type" in data) {
          if (data.type === "audio" && data.samples instanceof Float32Array) {
            appendAudioSamples(data.samples);
          } else if (data.type === "rms" && typeof data.level === "number") {
            // Send RMS level to main process for unified recording
            try {
              window.api?.send?.("microphone-audio-level", data.level);
            } catch (error) {
              // Silently ignore if API not available
            }
          }
        } else if (data instanceof Float32Array) {
          // Backward compatibility: handle raw Float32Array
          appendAudioSamples(data);
        }
      };

      source.connect(workletNode);

      // Keep the context suspended until the Deepgram connection is ready
      if (audioContext.state === "running") {
        try {
          await audioContext.suspend();
        } catch (error) {
          console.warn(
            "[useTranscription] Unable to suspend audio context before start:",
            error
          );
        }
      }

      return sampleRate;
    },
    [appendAudioSamples, resetAudioPipelineState]
  );

  const startTranscription = async () => {
    console.log("[useTranscription] startTranscription called");
    setIsMicrophoneRecordingLoading(true);

    try {
      console.log("[useTranscription] Fetching Deepgram key...");
      const { key, api_key_id } = await fetchDeepgramKey();
      console.log("[useTranscription] Deepgram key received");
      deepgramKeyId.current = api_key_id;
      if (isMicrophoneRecording) {
        endTranscription();
        return;
      }
      // Get the selected language from localStorage and parse it
      let selectedLanguage = "en";
      const storedLanguage = localStorage.getItem("selectedLanguage");

      if (storedLanguage) {
        try {
          selectedLanguage = JSON.parse(storedLanguage);
          console.log("Parsed language:", selectedLanguage);
        } catch (e) {
          console.error("Error parsing language from localStorage:", e);
        }
      }
      setIsMicrophoneRecordingLoading(true);
      console.log("[useTranscription] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      console.log("[useTranscription] Microphone access granted");
      mediaStreamRef.current = stream;

      const sampleRate = await setupAudioPipeline(stream);
      console.log(
        `[useTranscription] Audio pipeline ready with sample rate: ${sampleRate}`
      );

      const deepgram = createClient(key);
      const options = getTranscriptionOptions(selectedLanguage, sampleRate);

      deepgramLive.current = deepgram.listen.live(options);

      // Set up event handlers for the Deepgram connection
      deepgramLive.current.on("open", async () => {
        console.log("Deepgram connection established");
        isDeepgramReadyRef.current = true;
        setIsMicrophoneRecordingLoading(false);

        try {
          if (audioContextRef.current?.state !== "running") {
            await audioContextRef.current?.resume();
          }
        } catch (error) {
          console.error(
            "[useTranscription] Failed to resume audio context:",
            error
          );
        }

        setIsMicrophoneRecording(true);
        flushQueuedAudio();
      });

      // Handle transcription results
      deepgramLive.current.on(
        LiveTranscriptionEvents.Transcript,
        (transcription) => {
          try {
            // Check if we have a valid transcription
            if (transcription?.channel?.alternatives?.[0]) {
              const alternative = transcription.channel.alternatives[0];
              const isFinal = transcription.is_final;

              // Set the transcript state
              setTranscript({
                text: alternative.transcript,
                type: isFinal ? "FinalTranscript" : "PartialTranscript",
              });

              if (isFinal && transcriptionSessionManager.isRecording("microphone")) {
                const words = alternative.words || [];
                const start =
                  typeof transcription.start === "number"
                    ? Math.floor(transcription.start * 1000)
                    : Date.now();
                const end =
                  typeof transcription.duration === "number"
                    ? start + Math.floor(transcription.duration * 1000)
                    : Date.now();

                transcriptionSessionManager
                  .addSegment("microphone", {
                    text: alternative.transcript,
                    speaker: words[0]?.speaker,
                    confidence: alternative.confidence,
                    startTime: start,
                    endTime: end,
                    isFinal: true,
                  })
                  .catch((error) =>
                    console.error(
                      "[useTranscription] Failed to persist mic segment:",
                      error
                    )
                  );
              }
            }
          } catch (e) {
            console.error("Error processing transcription:", e);
          }
        }
      );
      deepgramLive.current.on(
        LiveTranscriptionEvents.SpeechStarted,
        (event) => {
          console.log(
            "Speech started:",
            event?.channel?.alternatives?.[0]?.transcript
          );
        }
      );
      deepgramLive.current.on(
        LiveTranscriptionEvents.UtteranceEnd,
        (utterance) => {
          if (!transcriptionSessionManager.isRecording("microphone")) {
            return;
          }
          try {
            const alternative = utterance?.channel?.alternatives?.[0];
            if (!alternative) {
              return;
            }
            const words = alternative.words || [];
            const speaker = words[0]?.speaker ?? 0;
            transcriptionSessionManager
              .addSpeakerSegment("microphone", {
                speaker,
                text: alternative.transcript,
                timestamp: Date.now(),
                confidence: alternative.confidence,
                startTime:
                  words[0]?.start !== undefined
                    ? Math.floor(words[0].start * 1000)
                    : undefined,
                endTime:
                  words.length > 0 && words[words.length - 1]?.end !== undefined
                    ? Math.floor(words[words.length - 1].end * 1000)
                    : undefined,
              })
              .catch((error) =>
                console.error(
                  "[useTranscription] Failed to persist mic speaker segment:",
                  error
                )
              );
          } catch (error) {
            console.error(
              "[useTranscription] Error processing utterance event:",
              error
            );
          }
        }
      );
      // Handle errors
      deepgramLive.current.on(LiveTranscriptionEvents.Error, (error) => {
        console.error("Deepgram error:", error);
        setIsMicrophoneRecordingLoading(false);
        isDeepgramReadyRef.current = false;
        endTranscription();
      });

      // Handle connection close
      deepgramLive.current.on(LiveTranscriptionEvents.Close, (event) => {
        console.log("Deepgram connection closed:", event);
        deepgramLive.current = null;
        setIsMicrophoneRecordingLoading(false);
        isDeepgramReadyRef.current = false;
        stopAudioPipeline().catch((pipelineError) =>
          console.error(
            "[useTranscription] Error while stopping audio pipeline:",
            pipelineError
          )
        );
      });

      console.log("[useTranscription] Transcription setup complete");
    } catch (error) {
      console.error("[useTranscription] Failed to start transcription:", error);
      console.error("[useTranscription] Error details:", error);
      setIsMicrophoneRecordingLoading(false);
      endTranscription();
    }
  };

  const endTranscription = async () => {
    try {
      isDeepgramReadyRef.current = false;
      setIsMicrophoneRecording(false);

      // Close Deepgram connection
      if (deepgramLive.current) {
        deepgramLive.current.finish();
        deepgramLive.current = null;
      }

      // Stop recording
      await stopAudioPipeline();
    } catch (error) {
      console.error("Failed to end transcription:", error);
    } finally {
      if (deepgramKeyId.current) {
        await expireDeepgramKey(deepgramKeyId.current);
        deepgramKeyId.current = null;
      }
      setIsMicrophoneRecording(false);
      setIsMicrophoneRecordingLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      // Clean up on component unmount
      if (deepgramLive.current) {
        deepgramLive.current.finish();
        deepgramLive.current = null;
      }

      stopAudioPipeline().catch((error) =>
        console.error(
          "[useTranscription] Error during unmount audio pipeline cleanup:",
          error
        )
      );
    };
  }, [stopAudioPipeline]);

  return [
    isMicrophoneRecording,
    isMicrophoneRecordingLoading,
    transcript,
    startTranscription,
    endTranscription,
  ];
};

export default useTranscription;
