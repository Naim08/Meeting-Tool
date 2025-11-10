import React from "react";

interface TranscriptionDisplayProps {
  micTranscript: {
    partial: string;
    final: string;
  };
  systemTranscript: {
    partial: string;
    final: string;
  };
  micTranscriptions: string[];
  systemTranscriptions: string[];
  showMic: boolean;
  showSystem: boolean;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  micTranscript,
  systemTranscript,
  micTranscriptions,
  systemTranscriptions,
  showMic,
  showSystem,
}) => {
  return (
    <div className="flex w-full flex-col gap-2 text-xs text-muted-foreground">
      {/* Microphone Transcription */}
      {showMic && (micTranscript.partial || micTranscriptions.length > 0) && (
        <div className="rounded-lg border border-border/60 bg-muted/80 p-2 transition-colors dark:border-zinc-800/80 dark:bg-zinc-800/50">
          <div className="mb-1 flex items-center">
            <div className="mr-2 h-3 w-3 rounded-full bg-blue-500"></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Microphone
            </span>
          </div>
          <div className="space-y-0.5 text-foreground">
            {micTranscriptions.map((text, index) => (
              <p key={`mic-${index}`}>{text}</p>
            ))}
            {micTranscript.partial && (
              <p className="italic text-muted-foreground">
                {micTranscript.partial}
              </p>
            )}
          </div>
        </div>
      )}

      {/* System Audio Transcription */}
      {showSystem && (systemTranscript.partial || systemTranscriptions.length > 0) && (
        <div className="rounded-lg border border-border/60 bg-muted/80 p-2 transition-colors dark:border-zinc-800/80 dark:bg-zinc-800/50">
          <div className="mb-1 flex items-center">
            <div className="mr-2 h-3 w-3 rounded-full bg-emerald-500"></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              System Audio
            </span>
          </div>
          <div className="space-y-0.5 text-foreground">
            {systemTranscriptions.map((text, index) => (
              <p key={`sys-${index}`}>{text}</p>
            ))}
            {systemTranscript.partial && (
              <p className="italic text-muted-foreground">
                {systemTranscript.partial}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;
