/**
 * Hook for managing export functionality
 */

import { useState, useEffect, useCallback } from 'react';
import type { ExportRequest, ExportResult, ExportProgress } from '../../types/export';

interface UseExportReturn {
  isExporting: boolean;
  progress: ExportProgress | null;
  lastResult: ExportResult | null;
  exportConversation: (sessionId: string, includeAssets?: boolean) => Promise<ExportResult>;
  openExportFolder: (folderPath: string) => Promise<boolean>;
  revealInFinder: (filePath: string) => Promise<void>;
  clearResult: () => void;
}

export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  // Listen for progress updates
  useEffect(() => {
    if (!window.api?.export?.onProgress) {
      console.warn('Export API not available');
      return;
    }

    const cleanup = window.api.export.onProgress((progressUpdate: ExportProgress) => {
      setProgress(progressUpdate);
    });

    return cleanup;
  }, []);

  // Listen for keyboard shortcut trigger
  useEffect(() => {
    const handleShortcut = () => {
      // This will be handled by the component that uses this hook
      // by providing the current session ID
      window.dispatchEvent(new CustomEvent('export-shortcut-triggered'));
    };

    window.api?.on?.('export:shortcut-triggered', handleShortcut);

    return () => {
      window.api?.off?.('export:shortcut-triggered', handleShortcut);
    };
  }, []);

  const exportConversation = useCallback(
    async (sessionId: string, includeAssets = true): Promise<ExportResult> => {
      if (!window.api?.export?.request) {
        const errorResult: ExportResult = {
          success: false,
          exportPath: '',
          markdownPath: '',
          assetCount: 0,
          failedAssets: [],
          timestamp: '',
          error: 'Export API not available',
        };
        setLastResult(errorResult);
        return errorResult;
      }

      setIsExporting(true);
      setProgress(null);

      try {
        const request: ExportRequest = {
          sessionId,
          includeAssets,
        };

        const result = await window.api.export.request(request);
        setLastResult(result);
        return result;
      } catch (error) {
        const errorResult: ExportResult = {
          success: false,
          exportPath: '',
          markdownPath: '',
          assetCount: 0,
          failedAssets: [],
          timestamp: '',
          error: String(error),
        };
        setLastResult(errorResult);
        return errorResult;
      } finally {
        setIsExporting(false);
        setProgress(null);
      }
    },
    []
  );

  const openExportFolder = useCallback(async (folderPath: string): Promise<boolean> => {
    if (!window.api?.export?.openDirectory) {
      console.warn('Export API not available');
      return false;
    }

    return window.api.export.openDirectory(folderPath);
  }, []);

  const revealInFinder = useCallback(async (filePath: string): Promise<void> => {
    if (!window.api?.export?.revealInFinder) {
      console.warn('Export API not available');
      return;
    }

    await window.api.export.revealInFinder(filePath);
  }, []);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    isExporting,
    progress,
    lastResult,
    exportConversation,
    openExportFolder,
    revealInFinder,
    clearResult,
  };
}
