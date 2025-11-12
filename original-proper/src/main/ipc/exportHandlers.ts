/**
 * IPC Handlers for Export Functionality
 *
 * Exposes export services to the renderer process via IPC
 */

import { ipcMain, shell } from 'electron';
import { getExportService } from '../services/ExportService';
import type { ExportRequest, ExportResult, ExportProgress } from '../../types/export';

export function registerExportHandlers(): void {
  /**
   * Handle export request
   */
  ipcMain.handle('export:request', async (event, request: ExportRequest): Promise<ExportResult> => {
    console.log('[IPC] Export request received:', request.sessionId, 'type:', request.type);

    const exportService = getExportService();

    // Listen for progress events and forward to renderer
    const progressHandler = (progress: ExportProgress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('export:progress', progress);
      }
    };

    exportService.on('progress', progressHandler);

    try {
      // Route to appropriate export method based on type
      const result = request.type === 'meeting'
        ? await exportService.exportMeeting(request)
        : await exportService.exportConversation(request);

      console.log('[IPC] Export completed:', result.success);
      return result;
    } finally {
      exportService.removeListener('progress', progressHandler);
    }
  });

  /**
   * Open export directory in file explorer
   */
  ipcMain.handle('export:openDirectory', async (event, dirPath: string): Promise<void> => {
    try {
      await shell.openPath(dirPath);
    } catch (error) {
      console.error('[IPC] Failed to open directory:', error);
      throw error;
    }
  });

  /**
   * Open markdown file in default viewer
   */
  ipcMain.handle('export:openFile', async (event, filePath: string): Promise<void> => {
    try {
      await shell.openPath(filePath);
    } catch (error) {
      console.error('[IPC] Failed to open file:', error);
      throw error;
    }
  });

  console.log('[IPC] Export handlers registered');
}

export function unregisterExportHandlers(): void {
  ipcMain.removeHandler('export:request');
  ipcMain.removeHandler('export:openDirectory');
  ipcMain.removeHandler('export:openFile');
  console.log('[IPC] Export handlers unregistered');
}
