import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  systemPreferences,
  session,
  dialog,
} from "electron";
import { join } from "path";
// import * as Sentry from "@sentry/electron/main";
import Store from "electron-store";
import {
  registerHotkey,
  setupHotkeyHandlers,
  defaultHotkeys,
  KeyFunctions,
} from "./hotkeyHandlers";
import {
  setMicrophoneRecording,
  setSystemAudioRecording,
} from "./services/RecordingController";
import screenshot from "screenshot-desktop";
import {
  initializeDatabase,
  closeDatabase,
  isDatabaseInitialized,
} from "./services/Database";
import { setupTranscriptionsHandlers } from "./ipc/transcriptionsHandlers";
import { meetingSessionManager } from "./services/MeetingSessionManager";
import { setupMeetingHandlers } from "./ipc/meetingHandlers";
import { setupChatHistoryHandlers } from "./ipc/chatHistoryHandlers";
import { completeAllOpenChatSessions } from "./services/ChatHistoryService";

const IS_OSX = process.platform === "darwin";

// Sentry disabled for debugging
// if (app.isPackaged) {
//   Sentry.init({
//     dsn: "https://938a86a3ecee12af6ff6fc65bf63b358@o400583.ingest.us.sentry.io/4507034517176320",
//   });
// }

const is = {
  dev: !app.isPackaged,
};

const createConfigStore = () => {
  const storeConfig = {
    name: "config",
    clearInvalidConfig: true, // This will help prevent corruption
    cwd: app.getPath("userData"), // Explicitly set the storage location
    fileExtension: "json",
    serialize: (value) => JSON.stringify(value, null, 2),
    deserialize: JSON.parse,
    accessPropertiesByDotNotation: true,
    watch: false, // Disable file watching to prevent locks
    // Better Windows compatibility options
    beforeEachMigration: (store, context) => {
      // Optional logic before migrations
    },
    migrations: {
      // Add any migrations if needed
    },
  };

  try {
    return new Store(storeConfig);
  } catch (error) {
    // Log to Sentry
    // Sentry.captureException(error);

    // Attempt recovery by using a different filename
    try {
      // Don't try to clear the store here as it might be causing the error
      return new Store({
        ...storeConfig,
        name: "config-recovery",
      });
    } catch (retryError) {
      // Sentry.captureException(retryError);
      // If all else fails, create with in-memory defaults
      return new Store({
        ...storeConfig,
        name: "config-memory-only",
      });
    }
  }
};

// Replace the existing store initialization with:
const store = createConfigStore();
globalThis.transcriptionsEnabled = false;

// Add a helper function for safely writing to the store
export function safeStoreSet(key, value) {
  try {
    store.set(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to write ${key} to config:`, error);
    // Sentry.captureException(error);

    // Try an alternative approach for Windows
    if (process.platform === "win32") {
      try {
        // Give a small delay to allow any file locks to clear
        setTimeout(() => {
          try {
            store.set(key, value);
          } catch (retryError) {
            console.error(`Retry failed for ${key}:`, retryError);
            // Sentry.captureException(retryError);
          }
        }, 100);
      } catch (e) {
        // Already logged the first error
      }
    }
    return false;
  }
}

// Make store globally accessible
globalThis.store = store;
safeStoreSet("isMicrophoneEnabled", false);

// Move hotkey-related functions to a separate file (hotkeyHandlers.ts)
const { getHotKeyForPlatform } = setupHotkeyHandlers(store);

let window;

// Electron main process setup

function createWindow() {
  globalShortcut.unregisterAll();

  // Create the browser window.
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1024,
    height: 1024,
    minWidth: 600,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    skipTaskbar: true,
    backgroundColor: "black",
    titleBarStyle: "default",
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: !app.isPackaged,
    },
    x: 100, // Start at a visible position
    y: 100,
  };

  if (IS_OSX) {
    windowOptions.type = "panel";
    windowOptions.hasShadow = false;
  }

  const mainWindow = new BrowserWindow(windowOptions);
  meetingSessionManager.initialize(mainWindow, store);

  // Register global keyboard listeners
  Object.values(KeyFunctions).forEach((func) => {
    registerHotkey(func, getHotKeyForPlatform(func), mainWindow, store);
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  // Configure overlay behaviour across platforms
  mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  mainWindow.setContentProtection(true);
  mainWindow.setSkipTaskbar(true);

  if (IS_OSX) {
    mainWindow.setHiddenInMissionControl(true);
    try {
      mainWindow.setWindowButtonVisibility(false);
    } catch (error) {
      console.warn("Failed to hide window buttons:", error);
    }
    mainWindow.setHasShadow(false);
    mainWindow.setFullScreenable(false);
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}`);
  } else {
    mainWindow.loadFile(`${join(__dirname, "../renderer/index.html")}`);
  }

  const filter = {
    urls: ["http://localhost/interviewSolverCallback*"],
  };

  mainWindow?.webContents?.session?.webRequest.onBeforeRequest(
    filter,
    async ({ url }) => {
      try {
        // Replace hash with query string for easier parsing
        const parsedUrl = url.replace(
          "http://localhost/interviewSolverCallback#",
          "http://localhost/interviewSolverCallback?"
        );
        const urlParts = new URL(parsedUrl);

        // Extract tokens
        const access_token = urlParts.searchParams.get("access_token");
        const refresh_token = urlParts.searchParams.get("refresh_token");

        // For stripe redirects we handle differently
        const isStripeRedirect =
          urlParts.searchParams.get("stripe_redirect") === "true";

        if (isStripeRedirect) {
          mainWindow.close();
          let newWindow = createWindow();
          window = newWindow;
          return mainWindow;
        }

        if (!access_token || !refresh_token) {
          throw new Error("Missing tokens in callback URL");
        }

        // Close the auth window
        mainWindow.close();

        // Create a new window
        let newWindow = createWindow();
        meetingSessionManager.initialize(newWindow, store);
        newWindow.once("ready-to-show", () => {
          newWindow.webContents.send("message", {
            type: "auth.callback",
            value: { access_token, refresh_token },
          });
        });

        // Update the global window reference
        window = newWindow;
      } catch (error) {
        console.error("Error processing auth callback:", error);
        // Handle error (e.g., show error message to user)
      }
    }
  );

  return mainWindow;
}

let isDockIconVisible = false;

function toggleDockIcon() {
  if (IS_OSX) {
    if (isDockIconVisible) {
      app.dock.hide();
      isDockIconVisible = false;
    } else {
      app.dock.show();
      isDockIconVisible = true;
    }
  }
}

// Refactor the app.whenReady() callback
app.whenReady().then(() => {
  try {
    initializeDatabase();
    setupTranscriptionsHandlers();
    setupMeetingHandlers();
    setupChatHistoryHandlers();
    globalThis.transcriptionsEnabled = true;
    console.log("[Main] Transcriptions database initialized.");
  } catch (error) {
    console.error("[Main] Failed to initialize database:", error);
    dialog.showErrorBox(
      "Transcriptions Disabled",
      [
        "The local transcription database could not be initialized.",
        error instanceof Error ? error.message : String(error),
        "",
        "Live transcriptions will be unavailable until the database issue is resolved.",
      ].join("\n")
    );
  }

  // Set up permission handler for media devices (microphone/camera)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[Main] Permission request: ${permission}`);
    const allowedPermissions = ['media', 'mediaKeySystem', 'microphone'];
    if (allowedPermissions.includes(permission)) {
      console.log(`[Main] Granting permission: ${permission}`);
      callback(true);
    } else {
      console.log(`[Main] Denying permission: ${permission}`);
      callback(false);
    }
  });

  // Add this near the start of your app initialization in src/main/index.ts
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
      // Someone tried to run a second instance, we should focus our window.
      if (window) {
        if (window.isMinimized()) window.restore();
        window.focus();
      }
    });
  }

  // Register title bar IPC listeners

  window = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Refactor hotkey-related IPC handlers
  ipcMain.handle(
    "electronMain:updateHotkey",
    (_, func: KeyFunctions, newHotkey: string) => {
      globalShortcut.unregister(getHotKeyForPlatform(func));
      registerHotkey(func, newHotkey, window, store);
    }
  );

  ipcMain.handle("transcriptions:isEnabled", () => {
    return globalThis.transcriptionsEnabled ?? false;
  });

  ipcMain.handle(
    "transcriptions:setRecording",
    async (_event, source: "microphone" | "system", enabled: boolean) => {
      if (!window) {
        console.warn("[Main] No renderer window available for recording toggle.");
        return false;
      }

      try {
        if (source === "system") {
          await setSystemAudioRecording(window, store, enabled);
          return enabled;
        }

        if (source === "microphone") {
          setMicrophoneRecording(window, enabled);
          return enabled;
        }

        console.warn(`[Main] Unknown recording source: ${source}`);
        return false;
      } catch (error) {
        console.error("[Main] Failed to toggle recording state:", error);
        return false;
      }
    }
  );

  ipcMain.handle("electronMain:getHotkeys", () => {
    return Object.fromEntries(
      Object.values(KeyFunctions).map((func) => [
        func,
        getHotKeyForPlatform(func),
      ])
    );
  });

  ipcMain.handle("electronMain:resetHotkeys", () => {
    globalShortcut.unregisterAll();
    Object.entries(defaultHotkeys).forEach(([func, hotkey]) => {
      registerHotkey(func as KeyFunctions, hotkey, window, store);
    });
    return defaultHotkeys;
  });

  // Add this IPC handler
  ipcMain.handle("electronMain:toggleDockIcon", () => {
    return toggleDockIcon();
  });

  // Transparency value handlers
  ipcMain.handle("electronMain:getTransparencyValue", () => {
    const value = store.get("transparencyValue", 50);
    return value;
  });

  ipcMain.handle("electronMain:updateTransparencyValue", (_, value) => {
    console.log(`Setting transparency value: ${value}`);
    safeStoreSet("transparencyValue", value);
    return value;
  });

  // Add these handlers back
  ipcMain.handle("electronMain:isProd", () => !process.env.IS_DEV);
  ipcMain.handle("electronMain:getVersion", () => app.getVersion());
  ipcMain.handle(
    "electronMain:getScreenAccess",
    () =>
      !IS_OSX || systemPreferences.getMediaAccessStatus("screen") === "granted"
  );

  ipcMain.handle("electronMain:openScreenSecurity", () => {
    if (IS_OSX) {
      try {
        shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        );
      } catch (error) {
        console.error(error);
      }
    }
  });

  ipcMain.on("electronMain:screen:setSource", (_, source) => {
    safeStoreSet("selectedScreenId", source);
  });

  ipcMain.handle("electronMain:screen:getSources", async () => {
    try {
      // Get the list of displays
      const displays = await screenshot.listDisplays();
      // Take screenshots of all displays
      const screenshots = await Promise.all(
        displays.map(async (display) => {
          const img = await screenshot({ screen: display.id, format: "png" });
          // Convert buffer to data URL
          const base64Image = `data:image/png;base64,${img.toString("base64")}`;

          return {
            id: display.id,
            name: display.name || `Display ${display.id}`,
            thumbnailURL: base64Image,
            display_id: display.id,
          };
        })
      );

      return screenshots;
    } catch (error) {
      console.error("Error getting screen sources:", error);
      return [];
    }
  });

  ipcMain.handle("electronMain:audio:openSystemPreferences", () => {
    if (IS_OSX) {
      try {
        shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.sound"
        );
      } catch (error) {
        console.error(error);
      }
    }
  });

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
  if (isDatabaseInitialized()) {
    try {
      completeAllOpenChatSessions();
    } catch (error) {
      console.error("[Main] Failed to complete open chat sessions:", error);
    }
    closeDatabase();
  }
});

process.on("uncaughtException", (error) => {
  // log to sentry
  console.error("Uncaught exception:", error);
  // Sentry.captureException(error);
});

process.on("unhandledRejection", (error) => {
  // log to sentry
  console.error("Unhandled rejection:", error);
  // Sentry.captureException(error);
});
