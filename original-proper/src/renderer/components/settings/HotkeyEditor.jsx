import { useState, useEffect } from "react";
import { Keyboard, Save, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatHotkey, HOTKEY_DESCRIPTIONS } from "../../lib/utils";
import { SectionHeader } from "./shared";

const HotkeyEditor = () => {
  const [hotkeys, setHotkeys] = useState({});
  const [editingHotkey, setEditingHotkey] = useState(null);
  const [tempHotkey, setTempHotkey] = useState("");
  const [hotkeyError, setHotkeyError] = useState("");
  const isOSX = window?.api?.isOSX();

  const loadHotkeys = async () => {
    const currentHotkeys = await window.api.getHotkeys();
    setHotkeys(currentHotkeys);
  };

  useEffect(() => {
    loadHotkeys();
  }, []);

  useEffect(() => {
    if (editingHotkey) return;
    loadHotkeys();
  }, [editingHotkey]);

  useEffect(() => {
    if (editingHotkey) {
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [editingHotkey]);

  const startEditingHotkey = (func) => {
    setEditingHotkey(func);
    setTempHotkey(hotkeys[func]);
    setHotkeyError("");
  };

  const handleKeyDown = (e) => {
    e.preventDefault();

    // Ignore standalone modifier keys
    if (["Control", "Alt", "Shift", "Meta", "Command"].includes(e.key)) {
      return;
    }

    const modifiers = [];
    if (e.ctrlKey) modifiers.push("Control");
    if (e.metaKey) modifiers.push(isOSX ? "Command" : "Super");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");

    // Handle special keys
    let key = e.key;

    // Map special keys to their Electron accelerator names
    const keyMap = {
      " ": "Space",
      ArrowUp: "Up",
      ArrowDown: "Down",
      ArrowLeft: "Left",
      ArrowRight: "Right",
      Escape: "Esc",
    };

    if (keyMap[key]) {
      key = keyMap[key];
    } else if (key.length === 1) {
      // For single character keys, use uppercase
      key = key.toUpperCase();
    }

    // Ensure at least one modifier is used (except for function keys and special keys)
    const isFunctionKey = /^F\d+$/.test(key);
    const isSpecialKey = [
      "Esc",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Insert",
      "Delete",
      "Up",
      "Down",
      "Left",
      "Right",
    ].includes(key);

    if (modifiers.length === 0 && !isFunctionKey && !isSpecialKey) {
      setHotkeyError("Hotkey must include at least one modifier key");
      return;
    }

    setHotkeyError("");
    const keyCombo = [...modifiers, key].join("+");
    setTempHotkey(keyCombo);
  };

  const saveHotkey = async (func) => {
    if (hotkeyError) {
      return;
    }

    if (!tempHotkey) {
      setHotkeyError("Please press a valid key combination");
      return;
    }

    try {
      await window.api.updateHotkey(func, tempHotkey);
      setEditingHotkey(null);
      setHotkeyError("");
    } catch (error) {
      console.error("Failed to update hotkey:", error);
      setHotkeyError(
        "Failed to set hotkey. It may be in use by another application."
      );
    }
  };

  const handleResetHotkeys = async () => {
    try {
      const defaultHotkeys = await window.api.resetHotkeys();
      setHotkeys(defaultHotkeys);
    } catch (error) {
      console.error("Failed to reset hotkeys:", error);
    }
  };

  return (
    <section>
      <SectionHeader
        icon={Keyboard}
        title="Hotkeys"
        description="Customize your global hotkeys for quick access"
      />

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card/95 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex w-full flex-row bg-muted/60 p-4 text-xs font-bold uppercase text-muted-foreground dark:bg-gray-800/80">
          <div className="w-1/3">Function</div>
          <div className="w-1/3">Key</div>
          <div className="w-1/3">Action</div>
        </div>

        {Object.entries(hotkeys).map(([func, hotkey], index) => (
          <div
            key={func}
            className={`flex flex-row items-center p-4 text-sm transition-colors ${
              index % 2 === 0 ? "bg-muted/40" : "bg-background"
            } hover:bg-muted/70 dark:hover:bg-gray-800/60`}
          >
            <div className="w-1/3 text-foreground">
              {HOTKEY_DESCRIPTIONS[func]}
            </div>
            <div className="w-1/3">
              {editingHotkey === func ? (
                <div className="flex flex-col">
                  <div
                    className={`rounded-md border px-3 py-1.5 font-mono text-sm shadow-sm ${
                      hotkeyError
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {tempHotkey || "Press keys..."}
                  </div>
                  {hotkeyError && (
                    <div className="mt-1 text-xs text-destructive">
                      {hotkeyError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="inline-block rounded-md border border-border bg-muted/80 px-3 py-1.5 font-mono text-sm text-muted-foreground">
                  {formatHotkey(hotkey)}
                </div>
              )}
            </div>
            <div className="w-1/3">
              {editingHotkey === func ? (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveHotkey(func)}
                    className="flex items-center gap-1 text-emerald-600 hover:bg-muted hover:text-emerald-500"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingHotkey(null)}
                    className="flex items-center gap-1 text-destructive hover:bg-muted hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEditingHotkey(func)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          onClick={handleResetHotkeys}
          className="flex items-center gap-2 border-border hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Reset to Default Hotkeys
        </Button>
      </div>
    </section>
  );
};

export default HotkeyEditor;
