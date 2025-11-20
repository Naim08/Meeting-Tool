import { BrowserWindow, screen, ipcMain } from "electron";
import { join } from "path";
import Store from "electron-store";
import { app } from "electron";

export type WindowPosition = "top-left" | "top-right";

export interface TranscriptUpdateData {
  text: string;
  speaker?: string;
  source: "microphone" | "system";
  isFinal: boolean;
  timestamp: number;
  confidence?: number;
}

export class TranscriptFloatingWindow {
  private window: BrowserWindow | null = null;
  private store: Store;
  private position: WindowPosition;

  // Callbacks for window controls
  private stopCallback: (() => void) | null = null;
  private clearCallback: (() => void) | null = null;
  private togglePositionCallback: (() => void) | null = null;

  constructor(store: Store) {
    this.store = store;
    this.position = (store.get("transcriptWindowPosition") as WindowPosition) || "top-right";
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // Handle control actions from the floating window
    ipcMain.handle("transcript-window:stop", () => {
      if (this.stopCallback) this.stopCallback();
    });

    ipcMain.handle("transcript-window:clear", () => {
      if (this.clearCallback) this.clearCallback();
    });

    ipcMain.handle("transcript-window:toggle-position", () => {
      if (this.togglePositionCallback) this.togglePositionCallback();
    });

    ipcMain.handle("transcript-window:minimize", () => {
      if (this.window) {
        this.window.minimize();
      }
    });
  }

  async create(): Promise<void> {
    if (this.window) {
      this.window.show();
      return;
    }

    // Calculate window position based on preference
    const { x, y } = this.calculateWindowPosition();

    this.window = new BrowserWindow({
      width: 400,
      height: 600,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: true,
      minimizable: true,
      maximizable: false,
      closable: false, // Only close via controller
      skipTaskbar: true,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, "../preload/transcript-window-preload.js"),
      },
    });

    // Load the transcript window HTML
    const htmlPath = app.isPackaged
      ? join(process.resourcesPath, "transcript-window/index.html")
      : join(app.getAppPath(), "src/renderer/transcript-window/index.html");

    await this.window.loadFile(htmlPath);

    // Enable dragging from the header
    this.window.on("move", () => {
      // Window was manually moved, save position preference
      if (this.window) {
        const bounds = this.window.getBounds();
        const display = screen.getPrimaryDisplay();
        const midpoint = display.workArea.width / 2;

        // Update position preference based on where window was moved
        const newPosition = bounds.x < midpoint ? "top-left" : "top-right";
        if (newPosition !== this.position) {
          this.position = newPosition;
          this.store.set("transcriptWindowPosition", this.position);
        }
      }
    });

    // Handle window close
    this.window.on("closed", () => {
      this.window = null;
    });

    console.log("[TranscriptFloatingWindow] Window created");
  }

  private calculateWindowPosition(): { x: number; y: number } {
    const display = screen.getPrimaryDisplay();
    const workArea = display.workArea;
    const windowWidth = 400;
    const windowHeight = 600;
    const padding = 20;

    let x: number;
    const y = workArea.y + padding;

    if (this.position === "top-left") {
      x = workArea.x + padding;
    } else {
      x = workArea.x + workArea.width - windowWidth - padding;
    }

    return { x, y };
  }

  togglePosition(): void {
    this.position = this.position === "top-left" ? "top-right" : "top-left";
    this.store.set("transcriptWindowPosition", this.position);

    if (this.window) {
      const { x, y } = this.calculateWindowPosition();
      this.window.setPosition(x, y, true);

      // Notify the window of position change
      this.window.webContents.send("position-changed", this.position);
    }

    console.log(`[TranscriptFloatingWindow] Position toggled to: ${this.position}`);
  }

  show(): void {
    if (this.window) {
      this.window.show();
      this.window.focus();
    }
  }

  hide(): void {
    if (this.window) {
      this.window.hide();
    }
  }

  destroy(): void {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }

  isVisible(): boolean {
    return this.window?.isVisible() || false;
  }

  // Send audio levels to the window for waveform visualization
  sendAudioLevels(microphoneLevel: number, systemAudioLevel: number): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("audio-levels", {
        microphone: microphoneLevel,
        system: systemAudioLevel,
      });
    }
  }

  // Send transcript update to the window
  sendTranscriptUpdate(data: TranscriptUpdateData): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("transcript-update", data);
    }
  }

  // Clear transcript buffer in the window
  clearTranscript(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("clear-transcript");
    }
  }

  // Register callbacks for window controls
  onStop(callback: () => void): void {
    this.stopCallback = callback;
  }

  onClear(callback: () => void): void {
    this.clearCallback = callback;
  }

  onTogglePosition(callback: () => void): void {
    this.togglePositionCallback = callback;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  getPosition(): WindowPosition {
    return this.position;
  }
}
