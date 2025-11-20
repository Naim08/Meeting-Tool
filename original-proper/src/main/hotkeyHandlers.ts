import { globalShortcut, BrowserWindow } from "electron";
import Store from "electron-store";
import screenshot from "screenshot-desktop";
import { safeStoreSet } from "./index";
import { handleTranscribe } from "./audioRecorder";
import sharp from "sharp";
import { safeSendToRenderer } from "./utils/ipc";
import { unifiedRecordingManager } from "./services/UnifiedRecordingManager";
import { coachingManager } from "./services/CoachingManager";

const IS_OSX = process.platform === "darwin";

const OPACITY = {
  OPAQUE: 1.0,
  HALF: 0.5,
  CUSTOM: (value: number) => Math.max(0.1, Math.min(1.0, value / 100)),
};

async function handleScreengrabResize(img: Buffer) {
  const dimensions = await sharp(img).metadata();
  // Default to the original image buffer
  let resizedImage = img;

  // Check if dimensions are available
  if (dimensions.width && dimensions.height) {
    const targetSize = 1650;
    const longestSide = Math.max(dimensions.width, dimensions.height);

    // Only resize if the image is larger than the target size
    if (longestSide > targetSize) {
      // Determine resize options based on the longest side
      const resizeOptions: sharp.ResizeOptions = {};
      if (dimensions.width >= dimensions.height) {
        resizeOptions.width = targetSize; // Width is the longest side
      } else {
        resizeOptions.height = targetSize; // Height is the longest side
      }

      // Resize the image, preserving aspect ratio
      resizedImage = await sharp(img)
        .resize(resizeOptions) // sharp preserves aspect ratio when only one dimension is specified
        .jpeg({ quality: 70 })
        .toBuffer();
    }
  } else {
    console.error("Could not get image dimensions for resizing.");
  }

  return resizedImage;
}
// Helper function to calculate custom opacity
function getCustomOpacity(transparencyValue: number): number {
  return OPACITY.CUSTOM(transparencyValue);
}

// Helper function to check if opacity is opaque
function isOpaque(opacity: number): boolean {
  return Math.abs(opacity - OPACITY.OPAQUE) < 0.01;
}

// func enum
export enum KeyFunctions {
  screengrab = "screengrab",
  toggleSystemAudio = "toggleSystemAudio",
  toggleMicrophone = "toggleMicrophone",
  toggleUnifiedRecording = "toggleUnifiedRecording",
  endCoachingTimer = "endCoachingTimer",
  cancel = "cancel",
  resetChat = "resetChat",
  scrollUp = "scrollUp",
  scrollDown = "scrollDown",
  unminimize = "unminimize",
  toggleTransparency = "toggleTransparency",
  increaseOpacity = "increaseOpacity",
  decreaseOpacity = "decreaseOpacity",
  pasteToChat = "pasteToChat",
  moveWindowUp = "moveWindowUp",
  moveWindowDown = "moveWindowDown",
  moveWindowLeft = "moveWindowLeft",
  moveWindowRight = "moveWindowRight",
  submitInput = "submitInput",
}

// Define default hotkeys
export const defaultHotkeys: Record<string, string> = {
  [KeyFunctions.screengrab]: IS_OSX ? "Control+Esc" : "Control+1",
  [KeyFunctions.toggleSystemAudio]: IS_OSX
    ? "Super+Shift+A"
    : "Control+Shift+A",
  [KeyFunctions.toggleMicrophone]: IS_OSX ? "Super+Shift+M" : "Control+Shift+M",
  [KeyFunctions.toggleUnifiedRecording]: "Control+D",
  [KeyFunctions.endCoachingTimer]: "Control+E",
  [KeyFunctions.cancel]: IS_OSX ? "Shift+Esc" : "Shift+Esc",
  [KeyFunctions.resetChat]: "Home",
  [KeyFunctions.scrollUp]: "PageUp",
  [KeyFunctions.scrollDown]: "PageDown",
  [KeyFunctions.unminimize]: IS_OSX ? "Control+Shift+Esc" : "Control+Shift+U",
  [KeyFunctions.toggleTransparency]: IS_OSX ? "Control+G" : "Control+G",
  [KeyFunctions.increaseOpacity]: IS_OSX ? "Command+]" : "Control+]",
  [KeyFunctions.decreaseOpacity]: IS_OSX ? "Command+[" : "Control+[",
  [KeyFunctions.pasteToChat]: IS_OSX ? "Command+Shift+I" : "Control+Shift+I",
  [KeyFunctions.moveWindowUp]: IS_OSX ? "Command+Up" : "Control+Up",
  [KeyFunctions.moveWindowDown]: IS_OSX ? "Command+Down" : "Control+Down",
  [KeyFunctions.moveWindowLeft]: IS_OSX ? "Command+Left" : "Control+Left",
  [KeyFunctions.moveWindowRight]: IS_OSX ? "Command+Right" : "Control+Right",
  [KeyFunctions.submitInput]: IS_OSX ? "Command+Shift+O" : "Control+Shift+O",
};

export function setupHotkeyHandlers(store: Store) {
  // Initialize default hotkeys if they don't exist
  Object.entries(defaultHotkeys).forEach(([func, hotkey]) => {
    if (!store.has(`hotkeys.${func}`)) {
      safeStoreSet(`hotkeys.${func}`, hotkey);
    }
  });

  const getHotKeyForPlatform = (func: KeyFunctions) => {
    return store.get(`hotkeys.${func}`) as string;
  };

  return { getHotKeyForPlatform, store };
}

export function registerHotkey(
  func: KeyFunctions,
  hotkey: string,
  window: BrowserWindow,
  store: Store
) {
  try {
    const success = globalShortcut.register(hotkey, () => {
      switch (func) {
        case KeyFunctions.toggleSystemAudio:
          handleToggleSystemAudio(window, store);
          break;
        case KeyFunctions.toggleMicrophone:
          handleToggleMicrophone(window);
          break;
        case KeyFunctions.toggleUnifiedRecording:
          handleToggleUnifiedRecording(window, store);
          break;
        case KeyFunctions.endCoachingTimer:
          handleEndCoachingTimer(window);
          break;
        case KeyFunctions.screengrab:
          handleScreengrab(window, store);
          break;
        case KeyFunctions.cancel:
          handleCancel(window);
          break;
        case KeyFunctions.resetChat:
          handleResetChat(window);
          break;
        case KeyFunctions.scrollUp:
          handleScroll(window, "up");
          break;
        case KeyFunctions.scrollDown:
          handleScroll(window, "down");
          break;
        case KeyFunctions.unminimize:
          handleUnminimize(window);
          break;
        case KeyFunctions.toggleTransparency:
          handleToggleTransparency(window);
          break;
        case KeyFunctions.increaseOpacity:
          handleIncreaseOpacity(window);
          break;
        case KeyFunctions.decreaseOpacity:
          handleDecreaseOpacity(window);
          break;
        case KeyFunctions.pasteToChat:
          handlePasteToChat(window);
          break;
        case KeyFunctions.moveWindowUp:
          handleMoveWindow(window, "up");
          break;
        case KeyFunctions.moveWindowDown:
          handleMoveWindow(window, "down");
          break;
        case KeyFunctions.moveWindowLeft:
          handleMoveWindow(window, "left");
          break;
        case KeyFunctions.moveWindowRight:
          handleMoveWindow(window, "right");
          break;
        case KeyFunctions.submitInput:
          handleSubmitInput(window);
          break;
      }
    });
    safeStoreSet(`hotkeys.${func}`, hotkey);

    if (!success) {
      console.error(`Failed to register hotkey: ${hotkey}`);
      // reset to default for this func
      safeStoreSet(`hotkeys.${func}`, defaultHotkeys[func]);
      registerHotkey(func, defaultHotkeys[func], window, store);
    }
  } catch (error) {
    console.error(`Error registering hotkey for ${func}:`, error);
    // reset to default for this func
    safeStoreSet(`hotkeys.${func}`, defaultHotkeys[func]);
    registerHotkey(func, defaultHotkeys[func], window, store);
  }
}

async function handleScreengrab(window: BrowserWindow, store: Store) {
  const selectedScreenId = store.get("selectedScreenId");
  console.log("Screengrab hotkey pressed", selectedScreenId);
  try {
    const options: any = {
      format: "jpg",
    };

    // Include screen option if a valid screen ID is selected
    if (selectedScreenId !== undefined && selectedScreenId !== null) {
      options.screen = selectedScreenId;
    }

    const img = await screenshot(options);
    const resizedImage = await handleScreengrabResize(img);
    const base64Image = `data:image/jpeg;base64,${resizedImage.toString("base64")}`;

    safeSendToRenderer(window, {
      type: "screenshot.upload",
      value: { thumbnailUrl: base64Image },
    });
  } catch (error) {
    console.error("Error capturing screen:", error);
    // Fallback to primary display if specified screen fails
    try {
      console.log("Falling back to primary display capture");
      const img = await screenshot({ format: "jpg" });
      const resizedImage = await handleScreengrabResize(img);
      const base64Image = `data:image/jpeg;base64,${resizedImage.toString("base64")}`;

      safeSendToRenderer(window, {
        type: "screenshot.upload",
        value: { thumbnailUrl: base64Image },
      });
    } catch (fallbackError) {
      console.error("Error in fallback screen capture:", fallbackError);
      return null;
    }
    return null;
  }
}

function handleCancel(window: BrowserWindow) {
  safeSendToRenderer(window, { type: "chat.stop" });
}

function handleResetChat(window: BrowserWindow) {
  safeSendToRenderer(window, { type: "chat.reset" });
}

function handleScroll(window: BrowserWindow, direction: "up" | "down") {
  safeSendToRenderer(window, { type: "chat.scroll", value: direction });
}

function handleUnminimize(window: BrowserWindow) {
  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
}

function handleToggleTransparency(window: BrowserWindow) {
  try {
    // Check if window exists and is not destroyed
    if (!window || window.isDestroyed()) {
      console.log("Window is not available or has been destroyed");
      return;
    }

    // Check current opacity and toggle between custom transparency and fully opaque
    const currentOpacity = window.getOpacity();
    const store = globalThis.store as Store | undefined;

    if (!store) {
      console.error("Store is not available");
      return;
    }

    const transparencyValue = store.get("transparencyValue", 50) as number;
    const customOpacity = getCustomOpacity(transparencyValue);

    // If current opacity is already at custom value, make it opaque
    // Otherwise, set it to the custom transparency value
    const isCurrentlyOpaque = isOpaque(currentOpacity);
    const newOpacity = isCurrentlyOpaque ? customOpacity : OPACITY.OPAQUE;

    // Make the window ignore mouse events (click-through) when transparent
    // When opacity is less than 1.0 (transparent mode), ignore mouse events
    // When opacity is 1.0 (opaque mode), capture mouse events normally
    if (isOpaque(newOpacity)) {
      window.setOpacity(newOpacity);
      window.setIgnoreMouseEvents(false);
      window.setAlwaysOnTop(false, "floating");
      window.moveTop();
      safeSendToRenderer(window, {
        type: "transparency.toggle",
        value: false,
      });
    } else {
      window.setOpacity(newOpacity);
      window.setIgnoreMouseEvents(true);
      window.setAlwaysOnTop(true, "floating");
      // bring the window to the front
      safeSendToRenderer(window, {
        type: "transparency.toggle",
        value: true,
      });
    }
  } catch (error) {
    console.error("Error toggling transparency:", error);
  }
}

function handleIncreaseOpacity(window: BrowserWindow) {
  try {
    if (!window || window.isDestroyed()) {
      console.log("Window is not available or has been destroyed");
      return;
    }

    const currentOpacity = window.getOpacity();
    const newOpacity = Math.min(1.0, currentOpacity + 0.1);
    window.setOpacity(newOpacity);
    
    console.log(`Opacity increased to ${newOpacity.toFixed(2)}`);
    
    // If reaching full opacity, ensure mouse events are enabled
    if (isOpaque(newOpacity)) {
      window.setIgnoreMouseEvents(false);
      safeSendToRenderer(window, {
        type: "transparency.toggle",
        value: false,
      });
    }
  } catch (error) {
    console.error("Error increasing opacity:", error);
  }
}

function handleDecreaseOpacity(window: BrowserWindow) {
  try {
    if (!window || window.isDestroyed()) {
      console.log("Window is not available or has been destroyed");
      return;
    }

    const currentOpacity = window.getOpacity();
    const newOpacity = Math.max(0.1, currentOpacity - 0.1);
    window.setOpacity(newOpacity);
    
    console.log(`Opacity decreased to ${newOpacity.toFixed(2)}`);
    
    // If becoming transparent, enable click-through
    if (!isOpaque(newOpacity)) {
      window.setIgnoreMouseEvents(true);
      safeSendToRenderer(window, {
        type: "transparency.toggle",
        value: true,
      });
    }
  } catch (error) {
    console.error("Error decreasing opacity:", error);
  }
}

function handlePasteToChat(window: BrowserWindow) {
  try {
    if (!window || window.isDestroyed()) {
      console.log("Window is not available or has been destroyed");
      return;
    }

    const { clipboard } = require("electron");
    const clipboardText = clipboard.readText();
    
    if (!clipboardText || clipboardText.trim() === "") {
      console.log("Clipboard is empty");
      return;
    }

    console.log(`Pasting clipboard content to chat: ${clipboardText.substring(0, 50)}...`);
    
    // Send clipboard content to renderer
    safeSendToRenderer(window, {
      type: "clipboard.paste",
      value: clipboardText,
    });
    
    // Bring window to front and focus it
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
  } catch (error) {
    console.error("Error pasting to chat:", error);
  }
}

function handleMoveWindow(
  window: BrowserWindow,
  direction: "up" | "down" | "left" | "right"
) {
  if (!window || window.isDestroyed()) {
    console.log("Window is not available or has been destroyed");
    return;
  }
  // Get current window position and screen size
  const [currentX, currentY] = window.getPosition();
  const windowSize = window.getSize();
  const width = windowSize[0];
  const height = windowSize[1];

  // Get primary display size to calculate movement distance (1/10th of screen)
  const { width: screenWidth, height: screenHeight } =
    require("electron").screen.getPrimaryDisplay().workAreaSize;
  const moveX = Math.round(screenWidth / 4);
  const moveY = Math.round(screenHeight / 4);

  // Calculate new position based on direction
  let newX = currentX;
  let newY = currentY;

  switch (direction) {
    case "up":
      newY = Math.max(0, currentY - moveY); // Prevent moving above screen
      break;
    case "down":
      newY = Math.min(screenHeight - height, currentY + moveY); // Prevent moving below screen
      break;
    case "left":
      newX = Math.max(0, currentX - moveX); // Prevent moving off left edge
      break;
    case "right":
      newX = Math.min(screenWidth - width, currentX + moveX); // Prevent moving off right edge
      break;
  }

  // Set new position
  window.setPosition(newX, newY);
}

// Handler for submitting input (Command+Shift+O)
function handleSubmitInput(window: BrowserWindow) {
  if (!window || window.isDestroyed()) {
    console.log("Window is not available or has been destroyed");
    return;
  }
  // Send message to renderer to submit the input
  safeSendToRenderer(window, {
    type: "input.submit",
  });
}

function handleToggleSystemAudio(window: BrowserWindow, store: Store) {
  console.log("[HotkeyHandlers] System audio hotkey pressed!");

  // Guard: Block during unified mode to prevent parallel streams
  if (unifiedRecordingManager.isActive()) {
    console.log("[HotkeyHandlers] Blocked - unified recording active, use Control+D to stop");
    safeSendToRenderer(window, {
      type: "toast.show",
      value: {
        message: "Unified recording active. Use Control+D to stop.",
        type: "warning",
      },
    });
    return;
  }

  const isEnabled = !!store.get("isAudioListenerEnabled", false);
  const nextState = !isEnabled;
  console.log(`[HotkeyHandlers] isEnabled: ${isEnabled}, nextState: ${nextState}`);
  handleTranscribe(window, store);
}

function handleToggleMicrophone(window: BrowserWindow) {
  // Guard: Block during unified mode to prevent parallel streams
  if (unifiedRecordingManager.isActive()) {
    console.log("[HotkeyHandlers] Blocked - unified recording active, use Control+D to stop");
    safeSendToRenderer(window, {
      type: "toast.show",
      value: {
        message: "Unified recording active. Use Control+D to stop.",
        type: "warning",
      },
    });
    return;
  }

  const store = globalThis.store as Store | undefined;
  const current = !!store?.get("isMicrophoneEnabled", false);
  const nextState = !current;

  safeStoreSet("isMicrophoneEnabled", nextState);

  safeSendToRenderer(window, {
    type: "microphone.toggle",
    value: nextState,
  });
}

function handleEndCoachingTimer(window: BrowserWindow) {
  console.log("[HotkeyHandlers] Control+E pressed - ending coaching timer");

  if (!unifiedRecordingManager.isActive()) {
    console.log("[HotkeyHandlers] No active unified recording, ignoring");
    return;
  }

  // End coaching timer via hotkey
  coachingManager.endViaHotkey();

  safeSendToRenderer(window, {
    type: "toast.show",
    value: {
      message: "Answer timer ended",
      type: "info",
    },
  });
}

async function handleToggleUnifiedRecording(window: BrowserWindow, store: Store) {
  console.log("[HotkeyHandlers] Control+D pressed - toggling unified recording");

  // Initialize the controller if not already done
  if (!unifiedRecordingManager.isActive()) {
    unifiedRecordingManager.initialize(window, store);
  }

  const isActive = unifiedRecordingManager.isActive();

  if (isActive) {
    // Stop unified recording
    console.log("[HotkeyHandlers] Stopping unified recording");
    const success = await unifiedRecordingManager.stopUnifiedRecording();
    if (success) {
      console.log("[HotkeyHandlers] Unified recording stopped successfully");
    } else {
      console.error("[HotkeyHandlers] Failed to stop unified recording");
    }
  } else {
    // Start unified recording
    console.log("[HotkeyHandlers] Starting unified recording");
    const sessionId = await unifiedRecordingManager.startUnifiedRecording();
    if (sessionId) {
      console.log(`[HotkeyHandlers] Unified recording started: ${sessionId}`);
    } else {
      console.error("[HotkeyHandlers] Failed to start unified recording");
    }
  }
}

// Export the handleToggleTransparency function
export { handleToggleTransparency };
