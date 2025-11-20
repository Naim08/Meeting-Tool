// Vitest setup file
import { vi } from 'vitest';

// Mock electron module before any imports
vi.mock('electron', () => import('./__mocks__/electron'));

// Mock electron-store
vi.mock('electron-store', () => {
  const MockStore = function(this: any) {
    this.get = vi.fn().mockReturnValue(undefined);
    this.set = vi.fn();
    this.delete = vi.fn();
    this.clear = vi.fn();
    this.has = vi.fn().mockReturnValue(false);
    this.onDidChange = vi.fn();
    this.store = {};
  };
  return { default: MockStore };
});

// Mock better-sqlite3
vi.mock('better-sqlite3', () => {
  const mockStatement = {
    run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
    get: vi.fn().mockReturnValue(undefined),
    all: vi.fn().mockReturnValue([]),
    pluck: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
  };

  return {
    default: vi.fn().mockImplementation(() => ({
      prepare: vi.fn().mockReturnValue(mockStatement),
      exec: vi.fn(),
      pragma: vi.fn(),
      close: vi.fn(),
      transaction: vi.fn((fn) => fn),
    })),
  };
});

// Mock uuid
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
  };
});
