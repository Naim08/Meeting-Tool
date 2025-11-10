import { Mic, Speaker } from "lucide-react";

export type Source = "microphone" | "system";

export interface SourceMeta {
  label: string;
  icon: typeof Mic;
  color: string;
}

// Using more modern/subtle colors
export const SOURCE_META: Record<Source, SourceMeta> = {
  microphone: {
    label: "Microphone",
    icon: Mic,
    color: "text-blue-400",
  },
  system: {
    label: "System Audio",
    icon: Speaker,
    color: "text-teal-400",
  },
};

// Keep the formatting functions, they are good.
export const formatDateTime = (
  value: number,
  options: Intl.DateTimeFormatOptions = {}
) => {
  const normalized = normalizeTimestamp(value);
  if (normalized === null) {
    return "";
  }
  return new Date(normalized).toLocaleString([], options);
};

const normalizeTimestamp = (value?: number | null) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value < 1e12) {
    // Value is probably in seconds
    return value * 1000;
  }
  return value;
};

export const formatTimestamp = (
  value?: number | null,
  options: Intl.DateTimeFormatOptions = {}
) => {
  const normalized = normalizeTimestamp(value);
  if (normalized === null) {
    return "";
  }
  try {
    return new Date(normalized).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      ...options,
    });
  } catch (error) {
    console.error("[formatTimestamp] Failed to format timestamp", value, error);
    return "";
  }
};

export const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "0s";
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  }

  return `${secs}s`;
};

// Types from meetingHelpers can be reused and extended here.
// I will copy them from the file I read.
export interface MeetingSegmentDetail {
  id: string;
  text: string;
  startTime?: number | null;
  endTime?: number | null;
  speaker?: string | number | null;
  confidence?: number | null;
}

export interface MeetingTranscriptionDetail {
  id: string;
  sessionId?: string;
  meetingId?: string | null;
  source: Source;
  language?: string;
  startTime: number;
  endTime?: number | null;
  duration?: number | null;
  wordCount?: number;
  speakerCount?: number;
  confidence?: number | null;
  fullText?: string;
  segments: MeetingSegmentDetail[];
}

export interface MeetingDetail {
  id: string;
  title?: string | null;
  startedAt: number;
  endedAt?: number | null;
  duration?: number | null;
  wordCount?: number;
  notes?: string | null;
  transcriptions: MeetingTranscriptionDetail[];
}

export interface MeetingListItem {
  id: string;
  title: string | null;
  startedAt: number;
  endedAt?: number | null;
  duration: number;
  wordCount: number;
  sources: string[];
  isActive: boolean;
}
