export type SourceType = "microphone" | "system";

export type Meeting = {
  id: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  wordCount: number;
  sources: SourceType[];
  isActive: boolean;
};
