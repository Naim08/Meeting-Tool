import { useState } from "react";
import { Download, Check, AlertCircle, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface MeetingExportButtonProps {
  meetingId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function MeetingExportButton({
  meetingId,
  variant = "default",
  size = "default",
}: MeetingExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    exportPath: string;
    markdownPath: string;
    error?: string;
  } | null>(null);

  const handleExport = async () => {
    if (!window.api?.export?.meeting) {
      console.error("Meeting export API not available");
      return;
    }

    setIsExporting(true);

    try {
      const exportResult = await window.api.export.meeting({
        meetingId,
        includeTimestamps: true,
      });

      setResult(exportResult);
      setShowResult(true);
    } catch (error) {
      setResult({
        success: false,
        exportPath: "",
        markdownPath: "",
        error: error instanceof Error ? error.message : "Export failed",
      });
      setShowResult(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenFolder = async () => {
    if (result?.exportPath && window.api?.export?.openDirectory) {
      await window.api.export.openDirectory(result.exportPath);
    }
  };

  const handleRevealFile = async () => {
    if (result?.markdownPath && window.api?.export?.revealInFinder) {
      await window.api.export.revealInFinder(result.markdownPath);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={isExporting}
        title="Export transcription to Markdown"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {size !== "icon" && (
          <span className="ml-2">
            {isExporting ? "Exporting..." : "Export"}
          </span>
        )}
      </Button>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.success ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Export Complete
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Export Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {result?.success ? (
                <>
                  Your meeting transcription has been exported successfully.
                  <br />
                  <br />
                  <code className="block rounded bg-muted p-2 text-xs">
                    {result.exportPath}
                  </code>
                </>
              ) : (
                <span className="text-red-600">
                  {result?.error || "An unknown error occurred"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {result?.success && (
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFolder}
                className="flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Open Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevealFile}
                className="flex items-center gap-2"
              >
                Reveal File
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
