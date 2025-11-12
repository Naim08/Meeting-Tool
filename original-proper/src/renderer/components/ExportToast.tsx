/**
 * ExportToast Component
 *
 * Displays export progress and results as a toast notification
 */

import { Download, CheckCircle, XCircle, FolderOpen, FileText } from 'lucide-react';
import type { ExportProgress } from '../../types/export';

interface ExportToastProps {
  progress: ExportProgress | null;
  error: string | null;
  exportPath?: string;
  conversationPath?: string;
  onOpenDirectory?: () => void;
  onOpenFile?: () => void;
  onClose?: () => void;
}

export function ExportToast({
  progress,
  error,
  exportPath,
  conversationPath,
  onOpenDirectory,
  onOpenFile,
  onClose,
}: ExportToastProps) {
  if (!progress && !error) return null;

  const isComplete = progress?.stage === 'complete';
  const hasError = Boolean(error);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 animate-in slide-in-from-bottom-5">
      <div
        className={`rounded-xl border shadow-lg backdrop-blur-sm ${
          hasError
            ? 'border-destructive/40 bg-destructive/10'
            : isComplete
            ? 'border-green-500/40 bg-green-500/10'
            : 'border-border/60 bg-card/95'
        }`}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {hasError ? (
                <div className="rounded-full bg-destructive/20 p-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              ) : isComplete ? (
                <div className="rounded-full bg-green-500/20 p-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ) : (
                <div className="rounded-full bg-primary/20 p-2">
                  <Download className="h-5 w-5 text-primary animate-bounce" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground">
                  {hasError
                    ? 'Export Failed'
                    : isComplete
                    ? 'Export Complete!'
                    : 'Exporting Conversation...'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {hasError ? error : progress?.message || 'Processing...'}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {!hasError && !isComplete && progress && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.assetsTotal && progress.assetsTotal > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Rendered {progress.assetsRendered || 0} / {progress.assetsTotal} assets
                </p>
              )}
            </div>
          )}

          {/* Success Actions */}
          {isComplete && exportPath && (
            <div className="mt-3 flex gap-2">
              {onOpenDirectory && (
                <button
                  onClick={onOpenDirectory}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                >
                  <FolderOpen className="h-4 w-4" />
                  Open Folder
                </button>
              )}
              {onOpenFile && conversationPath && (
                <button
                  onClick={onOpenFile}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
                >
                  <FileText className="h-4 w-4" />
                  Open File
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
