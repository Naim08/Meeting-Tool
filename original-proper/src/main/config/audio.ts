import { AudioConfig, TranscriptionConfig } from "../types/audio";
import type { AudioEncoding } from "assemblyai";

export const ORIGINAL_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 48000,
  channels: 2,
  bitDepth: 32,
};

export const PROCESSED_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 32,
};

export const TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  sampleRate: 16000,
  encoding: "pcm_s16le" as AudioEncoding,
  // Speaker diarization options for unified recording
  speakerLabels: true,
  speakersExpected: 2, // Interviewer + Interviewee
};

export const FILE_PATHS = {
  ORIGINAL_RECORDING: "original_recording.wav",
  PROCESSED_RECORDING: "processed_recording.wav",
};
