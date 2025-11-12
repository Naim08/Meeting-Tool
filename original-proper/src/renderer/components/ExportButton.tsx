/**
 * Export Button Component
 * Provides UI for exporting conversations with progress and result feedback
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useExport } from '../hooks/useExport';
import { Download, FolderOpen, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  sessionId: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function ExportButton({
  sessionId,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className = '',
}: ExportButtonProps) {
  const {
    isExporting,
    progress,
    lastResult,
    exportConversation,
    openExportFolder,
    revealInFinder,
    clearResult,
  } = useExport();

  const [showResultDialog, setShowResultDialog] = useState(false);

  // Show result dialog when export completes
  useEffect(() => {
    if (lastResult && !isExporting) {
      setShowResultDialog(true);
    }
  }, [lastResult, isExporting]);

  // Listen for keyboard shortcut
  useEffect(() => {
    const handleShortcut = () => {
      if (!isExporting && sessionId && !disabled) {
        handleExport();
      }
    };

    window.addEventListener('export-shortcut-triggered', handleShortcut);
    return () => {
      window.removeEventListener('export-shortcut-triggered', handleShortcut);
    };
  }, [sessionId, isExporting, disabled]);

  const handleExport = async () => {
    if (!sessionId) {
      console.error('No session ID provided for export');
      return;
    }
    await exportConversation(sessionId, true);
  };

  const handleCloseDialog = () => {
    setShowResultDialog(false);
    clearResult();
  };

  const handleOpenFolder = () => {
    if (lastResult?.exportPath) {
      openExportFolder(lastResult.exportPath);
    }
  };

  const handleRevealFile = () => {
    if (lastResult?.markdownPath) {
      revealInFinder(lastResult.markdownPath);
    }
  };

  const buttonContent = isExporting ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {showLabel && (
        <span>
          {progress
            ? `Exporting ${progress.current}/${progress.total}...`
            : 'Exporting...'}
        </span>
      )}
    </>
  ) : (
    <>
      <Download className="h-4 w-4" />
      {showLabel && <span>Export</span>}
    </>
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={disabled || isExporting || !sessionId}
        className={className}
        title="Export conversation to Markdown (Cmd/Ctrl+Shift+E)"
      >
        {buttonContent}
      </Button>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {lastResult?.success ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Export Successful
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Export Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {lastResult?.success
                ? 'Your conversation has been exported successfully.'
                : lastResult?.error || 'An error occurred during export.'}
            </DialogDescription>
          </DialogHeader>

          {lastResult?.success && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-md text-sm font-mono break-all">
                {lastResult.exportPath}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Assets:</strong> {lastResult.assetCount} files exported
                </p>
                {lastResult.failedAssets.length > 0 && (
                  <div className="mt-2">
                    <p className="text-yellow-600 dark:text-yellow-500">
                      <strong>Warnings:</strong> {lastResult.failedAssets.length} assets
                      fell back to raw format
                    </p>
                    <ul className="list-disc list-inside text-xs mt-1 max-h-24 overflow-y-auto">
                      {lastResult.failedAssets.slice(0, 5).map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                      {lastResult.failedAssets.length > 5 && (
                        <li>...and {lastResult.failedAssets.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenFolder}
                  className="flex-1"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevealFile}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Show File
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="default" size="sm" onClick={handleCloseDialog}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Minimal export button for use in tight spaces
 */
export function ExportIconButton({
  sessionId,
  disabled = false,
  className = '',
}: Pick<ExportButtonProps, 'sessionId' | 'disabled' | 'className'>) {
  return (
    <ExportButton
      sessionId={sessionId}
      disabled={disabled}
      variant="ghost"
      size="icon"
      showLabel={false}
      className={className}
    />
  );
}
