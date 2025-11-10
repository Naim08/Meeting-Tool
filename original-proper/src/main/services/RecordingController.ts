import type { BrowserWindow } from "electron";
import type Store from "electron-store";
import { handleTranscribe } from "../audioRecorder";
import { safeStoreSet } from "../index";
import { safeSendToRenderer } from "../utils/ipc";

export async function setSystemAudioRecording(
  window: BrowserWindow,
  store: Store,
  enabled: boolean
) {
  const current = !!store.get("isAudioListenerEnabled", false);
  if (current === enabled) {
    return current;
  }

  handleTranscribe(window, store);
  return enabled;
}

export function setMicrophoneRecording(
  window: BrowserWindow,
  enabled: boolean,
  meetingId?: string
) {
  safeStoreSet("isMicrophoneEnabled", enabled);

  safeSendToRenderer(window, {
    type: "microphone.toggle",
    value: {
      enabled,
      meetingId,
    },
  });
}
