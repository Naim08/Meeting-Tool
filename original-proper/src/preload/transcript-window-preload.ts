import { contextBridge, ipcRenderer } from "electron";

// Expose transcript window API to renderer
contextBridge.exposeInMainWorld("transcriptAPI", {
  // Control actions
  stop: () => ipcRenderer.invoke("transcript-window:stop"),
  clear: () => ipcRenderer.invoke("transcript-window:clear"),
  togglePosition: () => ipcRenderer.invoke("transcript-window:toggle-position"),
  minimize: () => ipcRenderer.invoke("transcript-window:minimize"),

  // Event listeners
  onAudioLevels: (callback: (data: { microphone: number; system: number }) => void) => {
    ipcRenderer.on("audio-levels", (_event, data) => callback(data));
  },

  onTranscriptUpdate: (
    callback: (data: {
      text: string;
      speaker?: string;
      source: "microphone" | "system";
      isFinal: boolean;
      timestamp: number;
      confidence?: number;
    }) => void
  ) => {
    ipcRenderer.on("transcript-update", (_event, data) => callback(data));
  },

  onClearTranscript: (callback: () => void) => {
    ipcRenderer.on("clear-transcript", () => callback());
  },

  onPositionChanged: (callback: (position: "top-left" | "top-right") => void) => {
    ipcRenderer.on("position-changed", (_event, position) => callback(position));
  },

  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("audio-levels");
    ipcRenderer.removeAllListeners("transcript-update");
    ipcRenderer.removeAllListeners("clear-transcript");
    ipcRenderer.removeAllListeners("position-changed");
  },
});

// Type declarations for the renderer
declare global {
  interface Window {
    transcriptAPI: {
      stop: () => Promise<void>;
      clear: () => Promise<void>;
      togglePosition: () => Promise<void>;
      minimize: () => Promise<void>;
      onAudioLevels: (callback: (data: { microphone: number; system: number }) => void) => void;
      onTranscriptUpdate: (
        callback: (data: {
          text: string;
          speaker?: string;
          source: "microphone" | "system";
          isFinal: boolean;
          timestamp: number;
          confidence?: number;
        }) => void
      ) => void;
      onClearTranscript: (callback: () => void) => void;
      onPositionChanged: (callback: (position: "top-left" | "top-right") => void) => void;
      removeAllListeners: () => void;
    };
  }
}
