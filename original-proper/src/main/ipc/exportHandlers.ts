/**
 * IPC Handlers for Export functionality
 */

import { ipcMain, BrowserWindow, shell } from 'electron';
import {
  exportConversation,
  getExportDirectory,
  cleanupExportService,
  exportMeetingTranscription,
} from '../services/ExportService';
import { ExportRequest, ExportResult, MeetingExportRequest, MeetingExportResult } from '../../types/export';

/**
 * Setup export-related IPC handlers
 */
export function setupExportHandlers(mainWindow: BrowserWindow): void {
  // Handle export request
  ipcMain.handle(
    'export:request',
    async (_, request: ExportRequest): Promise<ExportResult> => {
      try {
        const result = await exportConversation(request, mainWindow);
        return result;
      } catch (error) {
        return {
          success: false,
          exportPath: '',
          markdownPath: '',
          assetCount: 0,
          failedAssets: [],
          timestamp: '',
          error: String(error),
        };
      }
    }
  );

  // Get export directory path
  ipcMain.handle('export:getDirectory', async (): Promise<string> => {
    return getExportDirectory();
  });

  // Open export directory in file manager
  ipcMain.handle('export:openDirectory', async (_, folderPath: string): Promise<boolean> => {
    try {
      await shell.openPath(folderPath);
      return true;
    } catch (error) {
      console.error('Failed to open directory:', error);
      return false;
    }
  });

  // Reveal file in file manager
  ipcMain.handle('export:revealInFinder', async (_, filePath: string): Promise<void> => {
    shell.showItemInFolder(filePath);
  });

  // Handle meeting transcription export
  ipcMain.handle(
    'export:meeting',
    async (_, request: MeetingExportRequest): Promise<MeetingExportResult> => {
      try {
        const result = await exportMeetingTranscription(request);
        return result;
      } catch (error) {
        return {
          success: false,
          exportPath: '',
          markdownPath: '',
          timestamp: '',
          error: String(error),
        };
      }
    }
  );
}

/**
 * Cleanup export handlers on app quit
 */
export function cleanupExportHandlers(): void {
  ipcMain.removeHandler('export:request');
  ipcMain.removeHandler('export:getDirectory');
  ipcMain.removeHandler('export:openDirectory');
  ipcMain.removeHandler('export:revealInFinder');
  ipcMain.removeHandler('export:meeting');
  cleanupExportService();
}
