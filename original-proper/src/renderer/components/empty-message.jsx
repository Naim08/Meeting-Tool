import { useState, useEffect } from "react";
import AuthUI from "./AuthUI";
import { formatHotkey, HOTKEY_DESCRIPTIONS } from "../lib/utils";
import { Mic, Settings, Monitor, Compass } from "lucide-react";

function EmptyMessage({ session, supabase, getDisplayMedia, setScreenOpen }) {
  const [hotkeys, setHotkeys] = useState({});
  const isOSX = window?.api?.isOSX();

  useEffect(() => {
    const loadHotkeys = async () => {
      const currentHotkeys = await window.api.getHotkeys();
      setHotkeys(currentHotkeys);
    };
    loadHotkeys();
  }, []);

  return (
    <div className="flex flex-col justify-center min-h-[600px] px-8 mt-8">
      <div className="max-w-4xl my-auto mx-auto w-full rounded-xl border border-border/60 bg-card/90 p-4 text-foreground shadow-xl transition-colors dark:border-white/10 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 sm:p-6">
        {/* Setup Options - Horizontal Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Microphone Setup - Compact */}
          <div className="flex-1 rounded-lg border border-border/60 bg-muted/70 p-4 transition-colors dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center">
              <Mic className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Audio Setup</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Configure your default microphone device.
            </p>
            {isOSX && (
              <button
                onClick={() => {
                  window.api.openAudioSettings();
                }}
                className="flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <Settings className="mr-2 h-4 w-4" />
                Open Audio Settings
              </button>
            )}
          </div>

          {/* Screen Share Setup - Compact */}
          <div className="flex-1 rounded-lg border border-border/60 bg-muted/70 p-4 transition-colors dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center">
              <Monitor className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Screen Sharing</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Select a screen to share for your interview.
            </p>
            <button
              onClick={() => {
                getDisplayMedia();
                setScreenOpen(true);
              }}
              className="flex w-full items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition hover:bg-secondary/80"
            >
              <Monitor className="mr-2 h-4 w-4" />
              Select Screen Share
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Section - Full Width */}
        <div className="rounded-lg border border-border/60 bg-card/90 p-4 transition-colors dark:border-zinc-700/60 dark:bg-zinc-800/30">
          <div className="mb-3 flex items-center">
            <Compass className="mr-2 h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>

          <div className="h-full overflow-y-auto pr-1">
            <table className="w-full border-collapse">
              <tbody>
                {Object.entries(hotkeys).map(([func, hotkey]) => (
                  <tr
                    key={func}
                    className="border-b border-border/40 transition-colors hover:bg-muted/60 dark:border-zinc-700/60"
                  >
                    <td className="py-1.5 pl-2 text-sm text-muted-foreground">
                      {HOTKEY_DESCRIPTIONS[func]}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {formatHotkey(hotkey)
                          .split("+")
                          .map((key, index) => (
                            <span
                              key={index}
                              className="rounded border border-border/50 bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground shadow-sm dark:border-zinc-600 dark:bg-zinc-700/50"
                            >
                              {key.trim()}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="mt-4 text-center">
          <p className="bg-gradient-to-r from-primary/60 via-primary to-primary/60 bg-clip-text text-lg font-semibold text-transparent">
            Good luck with your interview!
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmptyMessage;
