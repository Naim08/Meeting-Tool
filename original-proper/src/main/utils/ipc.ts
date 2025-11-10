import { BrowserWindow } from "electron";

/**
 * Safely sends a message to the renderer process.
 * Checks if the window and webContents are still valid before sending.
 * This prevents "Render frame was disposed" errors.
 */
export function safeSendToRenderer(window: BrowserWindow, message: any): void {
  try {
    // Check if window exists and is not destroyed
    if (!window || window.isDestroyed()) {
      console.log("[IPC] Window is destroyed, skipping message send");
      return;
    }

    // Check if webContents exists and is not destroyed
    if (!window.webContents || window.webContents.isDestroyed()) {
      console.log("[IPC] WebContents is destroyed, skipping message send");
      return;
    }

    // Try to send the message
    window.webContents.send("message", message);
  } catch (error) {
    // Silently catch "Render frame was disposed" errors - they're expected during shutdown
    if (error instanceof Error && error.message.includes("Render frame was disposed")) {
      console.log("[IPC] Render frame disposed, message not sent (this is normal during shutdown)");
    } else {
      console.error("[IPC] Error sending message to renderer:", error);
    }
  }
}
