import { useMemo, useState } from "react";
import { Mic, Monitor, Clock, Play, Square } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startMeeting, stopMeeting } from "./meetings-api";
import type { Meeting, SourceType } from "./types";

type ActiveMeetingViewProps = {
  activeMeeting: Meeting | null;
  refreshState: () => void | Promise<void>;
};

const SOURCE_OPTIONS: Array<{
  id: SourceType;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "microphone",
    label: "Microphone",
    description: "Capture your spoken audio",
    icon: Mic,
  },
  {
    id: "system",
    label: "System Audio",
    description: "Record computer playback",
    icon: Monitor,
  },
];

const formatStartedAt = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

export default function ActiveMeetingView({
  activeMeeting,
  refreshState,
}: ActiveMeetingViewProps) {
  const [preferences, setPreferences] = useState<Record<SourceType, boolean>>({
    microphone: true,
    system: true,
  });
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const selectedSources = useMemo(
    () =>
      SOURCE_OPTIONS.filter((option) => preferences[option.id]).map(
        (option) => option.id
      ),
    [preferences]
  );

  const handleTogglePreference = (source: SourceType) => {
    setPreferences((prev) => ({
      ...prev,
      [source]: !prev[source],
    }));
  };

  const handleStartMeeting = async () => {
    if (isStarting || selectedSources.length === 0) {
      return;
    }
    setIsStarting(true);
    try {
      await startMeeting({
        microphone: preferences.microphone,
        system: preferences.system,
      });
      await Promise.resolve(refreshState());
    } catch (error) {
      console.error("[Meetings] Failed to start meeting:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopMeeting = async () => {
    if (isStopping) {
      return;
    }
    setIsStopping(true);
    try {
      await stopMeeting();
      await Promise.resolve(refreshState());
    } catch (error) {
      console.error("[Meetings] Failed to stop meeting:", error);
    } finally {
      setIsStopping(false);
    }
  };

  if (!activeMeeting) {
    return (
      <div className="rounded-2xl border border-gray-700/60 bg-gray-900/80 p-6 shadow-xl">
        <div className="space-y-4">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
              Live Capture
            </p>
            <h2 className="text-xl font-semibold text-white">
              Start a New Meeting
            </h2>
            <p className="text-sm text-gray-400">
              Choose which audio sources to record before you begin.
            </p>
          </header>

          <div className="flex flex-wrap gap-3">
            {SOURCE_OPTIONS.map(({ id, label, description, icon: Icon }) => {
              const isSelected = preferences[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTogglePreference(id)}
                  className={[
                    "flex w-full max-w-xs items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow transition-colors md:w-auto",
                    isSelected
                      ? "border-blue-400/70 bg-blue-500/10 text-white"
                      : "border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-400/60 hover:text-white",
                  ].join(" ")}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900/80 text-blue-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs text-gray-400">{description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              You need at least one source enabled to start recording.
            </p>
            <Button
              size="lg"
              className="gap-2"
              disabled={isStarting || selectedSources.length === 0}
              onClick={handleStartMeeting}
            >
              {isStarting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Meeting
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-700/60 bg-gray-900/80 p-6 shadow-xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Recording
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {activeMeeting.title || "Active Meeting"}
            </h2>
            <p className="text-sm text-gray-400">
              Started {formatStartedAt(activeMeeting.startedAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={isStopping}
              onClick={handleStopMeeting}
            >
              {isStopping ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Ending…
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Stop Meeting
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {activeMeeting.sources.length > 0 ? (
            activeMeeting.sources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-200"
              >
                {source === "microphone" ? <Mic className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                {source === "microphone" ? "Microphone" : "System Audio"}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500">
              No audio sources enabled for this session.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
