/**
 * E2E Smoke Test for Export Feature
 * Tests the complete export flow with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ChatSessionWithMessages } from '../types/chat-history';

// Mock Electron modules before importing the export service
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return os.tmpdir();
      }
      return os.tmpdir();
    }),
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    quit: vi.fn(),
    getName: vi.fn().mockReturnValue('test-app'),
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    setLoginItemSettings: vi.fn(),
    dock: {
      hide: vi.fn(),
      show: vi.fn(),
      setIcon: vi.fn(),
    },
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    isDestroyed: () => false,
    webContents: {
      isDestroyed: () => false,
      send: vi.fn(),
      executeJavaScript: vi.fn().mockResolvedValue({
        svg: '<svg><text>Mock SVG</text></svg>',
        error: null,
      }),
      once: vi.fn(),
      on: vi.fn(),
      capturePage: vi.fn().mockResolvedValue({
        toPNG: () => Buffer.from('mock png'),
      }),
      openDevTools: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    },
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setVisibleOnAllWorkspaces: vi.fn(),
    setBounds: vi.fn(),
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
  })),
  ipcMain: {
    on: vi.fn(),
    once: vi.fn(),
    handle: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
    openPath: vi.fn().mockResolvedValue(''),
    showItemInFolder: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '' }),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: vi.fn(),
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    themeSource: 'system',
    on: vi.fn(),
  },
  screen: {
    getPrimaryDisplay: vi.fn().mockReturnValue({
      workAreaSize: { width: 1920, height: 1080 },
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
    getAllDisplays: vi.fn().mockReturnValue([]),
  },
  globalShortcut: {
    register: vi.fn().mockReturnValue(true),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
    isRegistered: vi.fn().mockReturnValue(false),
  },
  systemPreferences: {
    getMediaAccessStatus: vi.fn().mockReturnValue('granted'),
    askForMediaAccess: vi.fn().mockResolvedValue(true),
    isTrustedAccessibilityClient: vi.fn().mockReturnValue(true),
  },
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({}),
    setApplicationMenu: vi.fn(),
  },
  Tray: vi.fn().mockImplementation(() => ({
    setContextMenu: vi.fn(),
    setToolTip: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  })),
  powerMonitor: {
    on: vi.fn(),
    getSystemIdleTime: vi.fn().mockReturnValue(0),
  },
  session: {
    defaultSession: {
      webRequest: {
        onBeforeSendHeaders: vi.fn(),
      },
      clearStorageData: vi.fn().mockResolvedValue(undefined),
      clearCache: vi.fn().mockResolvedValue(undefined),
      setPermissionRequestHandler: vi.fn(),
    },
  },
}));

// Mock database functions
vi.mock('../main/services/Database', () => ({
  isDatabaseInitialized: vi.fn().mockReturnValue(true),
  getDb: vi.fn(),
}));

// Mock ChatHistoryService
vi.mock('../main/services/ChatHistoryService', () => ({
  getChatSession: vi.fn(),
}));

// Mock asset renderer to avoid BrowserWindow complexity
vi.mock('../main/utils/assetRenderer', () => ({
  renderAsset: vi.fn().mockImplementation(async (request: any, outputDir: string) => {
    // Simulate successful rendering
    const filename = `msg-${request.messageIndex}-${request.type}-${request.blockIndex}.svg`;
    const relativePath = `assets/${filename}`;
    const absolutePath = path.join(outputDir, relativePath);

    // Write a mock SVG file
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, '<svg><text>Mock</text></svg>', 'utf-8');

    return {
      success: true,
      path: relativePath,
      absolutePath,
      format: 'svg',
      fallbackToRaw: false,
    };
  }),
  cleanupAssetRenderer: vi.fn(),
  initAssetRenderer: vi.fn().mockResolvedValue(undefined),
}));

// Now import the service after mocks are set up
import { exportConversation, serializeToMarkdown, getExportDirectory } from '../main/services/ExportService';
import { getChatSession } from '../main/services/ChatHistoryService';

describe('Export E2E Smoke Test', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create a temporary directory for test exports
    tempDir = path.join(os.tmpdir(), `export-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Update the mock to use our temp directory
    const { app } = await import('electron');
    vi.mocked(app.getPath).mockImplementation((name: string) => {
      if (name === 'userData') {
        return tempDir;
      }
      return tempDir;
    });
  });

  afterAll(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up exports directory after each test
    const exportsDir = path.join(tempDir, 'exports');
    try {
      const entries = await fs.readdir(exportsDir);
      for (const entry of entries) {
        await fs.rm(path.join(exportsDir, entry), { recursive: true, force: true });
      }
    } catch {
      // Directory might not exist
    }
  });

  it('should export a 3-message conversation with mermaid and katex blocks', async () => {
    // Create mock conversation with 3 messages
    const mockSession: ChatSessionWithMessages = {
      session: {
        id: 'test-session-123',
        title: 'Test Conversation',
        startedAt: Date.now() - 3600000, // 1 hour ago
        endedAt: null,
        messageCount: 3,
        model: 'gpt-4',
        systemPromptHash: null,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now(),
      },
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-session-123',
          role: 'user',
          content: `Draw a flowchart:
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\``,
          rawJson: null,
          tokens: null,
          attachmentMeta: null,
          createdAt: Date.now() - 3500000,
        },
        {
          id: 'msg-2',
          sessionId: 'test-session-123',
          role: 'assistant',
          content: `Here's the quadratic formula: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

And inline: the discriminant is $b^2 - 4ac$.`,
          rawJson: null,
          tokens: null,
          attachmentMeta: null,
          createdAt: Date.now() - 3400000,
        },
        {
          id: 'msg-3',
          sessionId: 'test-session-123',
          role: 'user',
          content: 'Thanks for the explanation!',
          rawJson: null,
          tokens: null,
          attachmentMeta: null,
          createdAt: Date.now() - 3300000,
        },
      ],
    };

    // Mock getChatSession to return our test data
    vi.mocked(getChatSession).mockReturnValue(mockSession);

    // Invoke export
    const result = await exportConversation({
      sessionId: 'test-session-123',
      includeAssets: true,
    });

    // Verify export succeeded
    expect(result.success).toBe(true);
    expect(result.exportPath).toBeTruthy();
    expect(result.markdownPath).toBeTruthy();
    expect(result.timestamp).toBeTruthy();

    // Verify conversation.md exists
    const mdExists = await fs.access(result.markdownPath).then(() => true).catch(() => false);
    expect(mdExists).toBe(true);

    // Verify export directory exists
    const exportDirExists = await fs.access(result.exportPath).then(() => true).catch(() => false);
    expect(exportDirExists).toBe(true);

    // Verify assets directory exists
    const assetsDir = path.join(result.exportPath, 'assets');
    const assetsDirExists = await fs.access(assetsDir).then(() => true).catch(() => false);
    expect(assetsDirExists).toBe(true);

    // Verify asset files exist
    expect(result.assetCount).toBeGreaterThan(0);
    const assetFiles = await fs.readdir(assetsDir);
    expect(assetFiles.length).toBeGreaterThan(0);

    // Read and verify markdown content
    const mdContent = await fs.readFile(result.markdownPath, 'utf-8');

    // Check header information
    expect(mdContent).toContain('# Conversation Export');
    expect(mdContent).toContain('**Title:** Test Conversation');
    expect(mdContent).toContain('**Messages:** 3');
    expect(mdContent).toContain('**Model:** gpt-4');

    // Check message headers
    expect(mdContent).toContain('## User');
    expect(mdContent).toContain('## Assistant');

    // Verify relative links exist in markdown
    const assetRefs = mdContent.match(/!\[.*?\]\((assets\/.*?)\)/g) || [];
    expect(assetRefs.length).toBeGreaterThan(0);

    // Verify each referenced asset file exists
    for (const ref of assetRefs) {
      const match = ref.match(/assets\/[^)]+/);
      if (match) {
        const assetPath = path.join(result.exportPath, match[0]);
        const assetExists = await fs.access(assetPath).then(() => true).catch(() => false);
        expect(assetExists).toBe(true);
      }
    }

    // Check that mermaid and katex content was processed
    expect(mdContent).toContain('![Diagram]');
    expect(mdContent).toContain('![Math]');

    // Verify plain text message is included
    expect(mdContent).toContain('Thanks for the explanation!');
  });

  it('should handle export without assets', async () => {
    const mockSession: ChatSessionWithMessages = {
      session: {
        id: 'test-simple',
        title: 'Simple Chat',
        startedAt: Date.now(),
        endedAt: null,
        messageCount: 1,
        model: null,
        systemPromptHash: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-simple',
          role: 'user',
          content: 'Hello world',
          rawJson: null,
          tokens: null,
          attachmentMeta: null,
          createdAt: Date.now(),
        },
      ],
    };

    vi.mocked(getChatSession).mockReturnValue(mockSession);

    const result = await exportConversation({
      sessionId: 'test-simple',
      includeAssets: false,
    });

    expect(result.success).toBe(true);
    expect(result.assetCount).toBe(0);

    const mdContent = await fs.readFile(result.markdownPath, 'utf-8');
    expect(mdContent).toContain('Hello world');
    expect(mdContent).not.toContain('![Diagram]');
  });

  it('should handle non-existent session', async () => {
    vi.mocked(getChatSession).mockReturnValue(null);

    const result = await exportConversation({
      sessionId: 'non-existent',
      includeAssets: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Session not found');
  });

  it('should create unique export folders', async () => {
    const mockSession: ChatSessionWithMessages = {
      session: {
        id: 'test-unique',
        title: 'Unique Test',
        startedAt: Date.now(),
        endedAt: null,
        messageCount: 1,
        model: null,
        systemPromptHash: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-unique',
          role: 'user',
          content: 'Test message',
          rawJson: null,
          tokens: null,
          attachmentMeta: null,
          createdAt: Date.now(),
        },
      ],
    };

    vi.mocked(getChatSession).mockReturnValue(mockSession);

    // Export twice with a small delay to ensure different timestamps
    const result1 = await exportConversation({
      sessionId: 'test-unique',
      includeAssets: false,
    });

    // Wait 5ms to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 5));

    const result2 = await exportConversation({
      sessionId: 'test-unique',
      includeAssets: false,
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Should have different export paths (different timestamps)
    expect(result1.exportPath).not.toBe(result2.exportPath);
    expect(result1.timestamp).not.toBe(result2.timestamp);
  });

  it('should handle failed asset renders gracefully', async () => {
    // Mock asset renderer to fail
    const { renderAsset } = await import('../main/utils/assetRenderer');
    vi.mocked(renderAsset).mockResolvedValueOnce({
      success: false,
      format: 'svg',
      error: 'Failed to render mermaid',
      fallbackToRaw: true,
    });

    const mockSession: ChatSessionWithMessages = {
      session: {
        id: 'test-fail',
        title: 'Fail Test',
        startedAt: Date.now(),
        endedAt: null,
        messageCount: 1,
        model: null,
        systemPromptHash: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-fail',
          role: 'user',
          content: '```mermaid\ninvalid syntax\n```',
          rawJson: null,
          tokens: null,
          attachmentMeta: null,
          createdAt: Date.now(),
        },
      ],
    };

    vi.mocked(getChatSession).mockReturnValue(mockSession);

    const result = await exportConversation({
      sessionId: 'test-fail',
      includeAssets: true,
    });

    // Export should still succeed
    expect(result.success).toBe(true);

    // But should have failed assets logged
    expect(result.failedAssets.length).toBeGreaterThan(0);
    expect(result.failedAssets[0]).toContain('Mermaid');

    // Markdown should contain raw block as fallback
    const mdContent = await fs.readFile(result.markdownPath, 'utf-8');
    expect(mdContent).toContain('```mermaid');
    expect(mdContent).toContain('invalid syntax');
  });

  it('should generate correct relative paths for markdown viewer', async () => {
    const mockSession: ChatSessionWithMessages = {
      session: {
        id: 'test-paths',
        title: 'Path Test',
        startedAt: Date.now(),
        endedAt: null,
        messageCount: 1,
        model: null,
        systemPromptHash: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-paths',
          role: 'user',
          content: '```mermaid\ngraph TD\nA-->B\n```',
          rawJson: null,
          tokens: null,
          attachmentMeta: null,
          createdAt: Date.now(),
        },
      ],
    };

    vi.mocked(getChatSession).mockReturnValue(mockSession);

    const result = await exportConversation({
      sessionId: 'test-paths',
      includeAssets: true,
    });

    expect(result.success).toBe(true);

    const mdContent = await fs.readFile(result.markdownPath, 'utf-8');

    // Check that paths are relative (not absolute)
    const assetRefs = mdContent.match(/!\[.*?\]\(([^)]+)\)/g) || [];
    for (const ref of assetRefs) {
      // Should not contain absolute path indicators
      expect(ref).not.toContain('/Users/');
      expect(ref).not.toContain('C:\\');

      // Should start with assets/
      expect(ref).toContain('assets/');
    }

    // Verify the markdown file can reference assets from its location
    const mdDir = path.dirname(result.markdownPath);
    const match = mdContent.match(/!\[.*?\]\((assets\/[^)]+)\)/);
    if (match) {
      const relativeAssetPath = match[1];
      const absoluteAssetPath = path.join(mdDir, relativeAssetPath);
      const exists = await fs.access(absoluteAssetPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });
});
