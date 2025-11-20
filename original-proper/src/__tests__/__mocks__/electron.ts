// Mock for Electron module in Vitest tests
import { vi } from 'vitest';

export const app = {
  isPackaged: false,
  whenReady: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  quit: vi.fn(),
  getPath: vi.fn().mockReturnValue('/tmp'),
  getName: vi.fn().mockReturnValue('test-app'),
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  requestSingleInstanceLock: vi.fn().mockReturnValue(true),
  setLoginItemSettings: vi.fn(),
  dock: {
    hide: vi.fn(),
    show: vi.fn(),
    setIcon: vi.fn(),
  },
};

export const BrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn().mockResolvedValue(undefined),
  loadFile: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  once: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn().mockReturnValue(false),
  webContents: {
    send: vi.fn(),
    on: vi.fn(),
    openDevTools: vi.fn(),
    setWindowOpenHandler: vi.fn(),
  },
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
  setHiddenInMissionControl: vi.fn(),
  setBounds: vi.fn(),
  getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
  setPosition: vi.fn(),
  getPosition: vi.fn().mockReturnValue([0, 0]),
  minimize: vi.fn(),
  maximize: vi.fn(),
  unmaximize: vi.fn(),
  isMaximized: vi.fn().mockReturnValue(false),
  isMinimized: vi.fn().mockReturnValue(false),
  setSkipTaskbar: vi.fn(),
}));

export const ipcMain = {
  on: vi.fn(),
  once: vi.fn(),
  handle: vi.fn(),
  removeHandler: vi.fn(),
  removeAllListeners: vi.fn(),
};

export const ipcRenderer = {
  on: vi.fn(),
  once: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
};

export const shell = {
  openExternal: vi.fn().mockResolvedValue(undefined),
  openPath: vi.fn().mockResolvedValue(''),
  showItemInFolder: vi.fn(),
};

export const dialog = {
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
  showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '' }),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  showErrorBox: vi.fn(),
};

export const nativeTheme = {
  shouldUseDarkColors: false,
  themeSource: 'system',
  on: vi.fn(),
};

export const screen = {
  getPrimaryDisplay: vi.fn().mockReturnValue({
    workAreaSize: { width: 1920, height: 1080 },
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  }),
  getAllDisplays: vi.fn().mockReturnValue([]),
};

export const globalShortcut = {
  register: vi.fn().mockReturnValue(true),
  unregister: vi.fn(),
  unregisterAll: vi.fn(),
  isRegistered: vi.fn().mockReturnValue(false),
};

export const systemPreferences = {
  getMediaAccessStatus: vi.fn().mockReturnValue('granted'),
  askForMediaAccess: vi.fn().mockResolvedValue(true),
  isTrustedAccessibilityClient: vi.fn().mockReturnValue(true),
};

export const contextBridge = {
  exposeInMainWorld: vi.fn(),
};

export const Menu = {
  buildFromTemplate: vi.fn().mockReturnValue({}),
  setApplicationMenu: vi.fn(),
};

export const Tray = vi.fn().mockImplementation(() => ({
  setContextMenu: vi.fn(),
  setToolTip: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
}));

export const powerMonitor = {
  on: vi.fn(),
  getSystemIdleTime: vi.fn().mockReturnValue(0),
};

export const clipboard = {
  writeText: vi.fn(),
  readText: vi.fn().mockReturnValue(''),
};

export const session = {
  defaultSession: {
    webRequest: {
      onBeforeSendHeaders: vi.fn(),
    },
    clearStorageData: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
  },
};

export default {
  app,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  shell,
  dialog,
  nativeTheme,
  screen,
  globalShortcut,
  systemPreferences,
  contextBridge,
  Menu,
  Tray,
  powerMonitor,
  clipboard,
  session,
};
