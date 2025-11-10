import { useState, useRef, useCallback } from "react";

interface TranscriptState {
  partial: string;
  final: string;
  transcriptions: string[];
}

interface TranscriptUI {
  partial: string;
  final: string;
}

// Reusable hook for managing a single transcription source's state
const useSingleTranscriptSource = () => {
  const transcriptRef = useRef<TranscriptState>({
    partial: "",
    final: "",
    transcriptions: [],
  });

  // Separate UI state for reactive updates
  const [transcriptUI, setTranscriptUI] = useState<TranscriptUI>({
    partial: "",
    final: "",
  });
  const [transcriptionsUI, setTranscriptionsUI] = useState<string[]>([]);

  const addTranscription = useCallback((text: string) => {
    // Avoid adding empty or duplicate final transcriptions
    if (text && !transcriptRef.current.transcriptions.includes(text)) {
      transcriptRef.current.transcriptions.push(text);
      setTranscriptionsUI([...transcriptRef.current.transcriptions]); // Update UI list
    }
  }, []);

  const updatePartial = useCallback((text: string) => {
    transcriptRef.current.partial = text;
    setTranscriptUI((prev) => ({ ...prev, partial: text }));
  }, []);

  const updateFinal = useCallback((text: string) => {
    transcriptRef.current.final = text;
    // Update UI: Set final text and clear partial display
    setTranscriptUI({ partial: "", final: text });
  }, []);

  // Resets the state for this transcription source
  const resetTranscription = useCallback(() => {
    transcriptRef.current = { partial: "", final: "", transcriptions: [] };
    setTranscriptUI({ partial: "", final: "" });
    setTranscriptionsUI([]);
  }, []);

  // Generic handler for incoming transcript data
  const handleTranscript = useCallback(
    (transcript: { isFinal?: boolean; type?: string; text: string }) => {
      if (!transcript?.text) return; // Ignore empty transcripts

      // Determine if the transcript is final (adapts to different message formats)
      const isFinal =
        transcript.isFinal ?? transcript.type !== "PartialTranscript";

      if (isFinal) {
        const finalText = transcript.text.trim();
        if (finalText) {
          // Only process non-empty final text
          updatePartial(""); // Clear partial text in ref and UI
          updateFinal(finalText); // Update last final text in ref and UI
          addTranscription(finalText); // Add to the list of final transcriptions
        }
      } else {
        updatePartial(transcript.text); // Update partial text in ref and UI
      }
    },
    [updatePartial, updateFinal, addTranscription]
  );

  // Gets the combined text of all final transcriptions or the current partial
  const getTranscriptionsText = useCallback(() => {
    const { transcriptions, partial } = transcriptRef.current;
    if (transcriptions.length > 0) {
      return transcriptions.join(" ").trim();
    }
    return partial.trim(); // Return partial if no final transcriptions exist
  }, []);

  // Checks if there's any transcription data (final or partial)
  const hasTranscriptions = useCallback(() => {
    const { transcriptions, partial } = transcriptRef.current;
    return transcriptions.length > 0 || !!partial.trim();
  }, []);

  return {
    transcriptUI, // State: Last partial/final text for UI
    transcriptionsUI, // State: List of final transcriptions for UI
    resetTranscription, // Action: Reset state
    handleTranscript, // Action: Process incoming transcript data
    getTranscriptionsText, // Getter: Get combined text
    hasTranscriptions, // Getter: Check if any text exists
  };
};

// Main hook combining microphone and system sources
export default function useTranscriptionManager() {
  const micManager = useSingleTranscriptSource();
  const systemManager = useSingleTranscriptSource();

  // Explicit handlers adapting to specific message formats if needed,
  // otherwise, could directly expose micManager.handleTranscript etc.
  const handleMicTranscript = useCallback(
    (transcript: { type: string; text: string }) => {
      micManager.handleTranscript(transcript);
    },
    [micManager.handleTranscript] // Dependency on the stable handleTranscript function
  );

  const handleSystemTranscript = useCallback(
    (transcript: { isFinal: boolean; text: string }) => {
      systemManager.handleTranscript(transcript);
    },
    [systemManager.handleTranscript] // Dependency on the stable handleTranscript function
  );

  return {
    // UI State
    micTranscriptUI: micManager.transcriptUI,
    systemTranscriptUI: systemManager.transcriptUI,
    micTranscriptionsUI: micManager.transcriptionsUI,
    systemTranscriptionsUI: systemManager.transcriptionsUI,

    // Actions
    resetMicTranscription: micManager.resetTranscription,
    resetSystemTranscription: systemManager.resetTranscription,
    handleMicTranscript,
    handleSystemTranscript,

    // Getters / Checks
    getMicTranscriptionsText: micManager.getTranscriptionsText,
    getSystemTranscriptionsText: systemManager.getTranscriptionsText,
    hasMicTranscriptions: micManager.hasTranscriptions,
    hasSystemTranscriptions: systemManager.hasTranscriptions,
  };
}
