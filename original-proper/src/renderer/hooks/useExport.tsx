/**
 * useExport Hook
 *
 * React hook for managing export functionality and progress tracking
 */

import { useState, useCallback, useEffect } from 'react';
import type { ExportProgress, ExportResult } from '../../types/export';

interface UseExportOptions {
  onSuccess?: (result: ExportResult) => void;
  onError?: (error: string) => void;
}

export function useExport(options?: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for progress updates
  useEffect(() => {
    if (!window.api?.export?.onProgress) return;

    const handleProgress = (progressData: ExportProgress) => {
      setProgress(progressData);
    };

    window.api.export.onProgress(handleProgress);

    return () => {
      if (window.api?.export?.offProgress) {
        window.api.export.offProgress(handleProgress);
      }
    };
  }, []);

  const exportConversation = useCallback(
    async (sessionId: string, type: 'conversation' | 'meeting' = 'conversation') => {
      if (!window.api?.export?.exportConversation) {
        const errMsg = 'Export functionality is not available';
        setError(errMsg);
        options?.onError?.(errMsg);
        return null;
      }

      setIsExporting(true);
      setError(null);
      setProgress(null);

      try {
        const result = await window.api.export.exportConversation({
          sessionId,
          type,
          options: {
            includeSystemPrompt: true,
            includeMetadata: true,
            preferSvg: true,
          },
        });

        if (result.success) {
          options?.onSuccess?.(result);
        } else {
          const errMsg = result.error || 'Export failed';
          setError(errMsg);
          options?.onError?.(errMsg);
        }

        return result;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errMsg);
        options?.onError?.(errMsg);
        return null;
      } finally {
        setIsExporting(false);
        // Clear progress after a delay
        setTimeout(() => setProgress(null), 3000);
      }
    },
    [options]
  );

  const openDirectory = useCallback(async (dirPath: string) => {
    if (!window.api?.export?.openDirectory) return;
    try {
      await window.api.export.openDirectory(dirPath);
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  }, []);

  const openFile = useCallback(async (filePath: string) => {
    if (!window.api?.export?.openFile) return;
    try {
      await window.api.export.openFile(filePath);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, []);

  return {
    exportConversation,
    openDirectory,
    openFile,
    isExporting,
    progress,
    error,
  };
}
