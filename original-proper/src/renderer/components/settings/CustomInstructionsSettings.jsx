import { useEffect, useRef } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import useLocalStorage from "../../hooks/use-local-storage";
import { SectionHeader } from "./shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";

export const DEFAULT_SCREENSHOT_MESSAGE =
  "Can you try to provide a solution to the problem that's described in the image?";

const CustomInstructionsSettings = ({ comparisonEnabled = false }) => {
  const [systemPrompt, setSystemPrompt] = useLocalStorage("systemPrompt", "");
  const [primarySystemPrompt, setPrimarySystemPrompt] = useLocalStorage(
    "systemPromptPrimary",
    ""
  );
  const [secondarySystemPrompt, setSecondarySystemPrompt] = useLocalStorage(
    "systemPromptSecondary",
    ""
  );
  const [skipSystemPrompt, setSkipSystemPrompt] = useLocalStorage(
    "skipSystemPrompt",
    false
  );
  const [defaultScreenshotMessage, setDefaultScreenshotMessage] =
    useLocalStorage("defaultScreenshotMessage", DEFAULT_SCREENSHOT_MESSAGE);
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage(
    "selectedLanguage",
    "en"
  );
  const prevComparison = useRef(false);

  useEffect(() => {
    const wasEnabled = prevComparison.current;
    if (comparisonEnabled && !wasEnabled) {
      if (!primarySystemPrompt && systemPrompt) {
        setPrimarySystemPrompt(systemPrompt);
      }
      if (!secondarySystemPrompt && systemPrompt) {
        setSecondarySystemPrompt(systemPrompt);
      }
    } else if (!comparisonEnabled && wasEnabled) {
      if (primarySystemPrompt && primarySystemPrompt !== systemPrompt) {
        setSystemPrompt(primarySystemPrompt);
      }
    }
    prevComparison.current = comparisonEnabled;
  }, [
    comparisonEnabled,
    primarySystemPrompt,
    secondarySystemPrompt,
    setPrimarySystemPrompt,
    setSecondarySystemPrompt,
    setSystemPrompt,
    systemPrompt,
  ]);

  const handleReset = () => {
    localStorage.removeItem("systemPrompt");
    localStorage.removeItem("systemPromptPrimary");
    localStorage.removeItem("systemPromptSecondary");
    localStorage.removeItem("skipSystemPrompt");
    localStorage.removeItem("defaultScreenshotMessage");
    localStorage.removeItem("selectedLanguage");
    setSystemPrompt("");
    setPrimarySystemPrompt("");
    setSecondarySystemPrompt("");
    setSkipSystemPrompt(false);
    setDefaultScreenshotMessage(DEFAULT_SCREENSHOT_MESSAGE);
    setSelectedLanguage("en");
  };

  return (
    <section>
      <SectionHeader icon={MessageSquare} title="Custom Instructions" />

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center">
            <label
              htmlFor="default-screenshot-message"
              className="block text-sm font-medium text-foreground"
            >
              Default message for screenshots
            </label>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Used to instruct the AI when you send a screenshot
          </p>
          <input
            type="text"
            id="default-screenshot-message"
            name="defaultScreenshotMessage"
            value={defaultScreenshotMessage}
            onChange={(e) => setDefaultScreenshotMessage(e.target.value)}
            className="flex w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800/50"
            placeholder="Enter your default screenshot message"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center">
            <label
              htmlFor="transcription-language"
              className="block text-sm font-medium text-foreground"
            >
              Transcription Language
            </label>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Select the language for speech-to-text transcription
          </p>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full border border-input bg-background/80 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background dark:border-gray-700 dark:bg-gray-800/60">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent className="border border-input bg-background text-foreground dark:border-gray-700 dark:bg-gray-800">
              <SelectItem value="bg">Bulgarian</SelectItem>
              <SelectItem value="ca">Catalan</SelectItem>
              <SelectItem value="zh">Chinese (Mandarin, Simplified)</SelectItem>
              <SelectItem value="zh-TW">
                Chinese (Mandarin, Traditional)
              </SelectItem>
              <SelectItem value="zh-HK">
                Chinese (Cantonese, Traditional)
              </SelectItem>
              <SelectItem value="cs">Czech</SelectItem>
              <SelectItem value="da">Danish</SelectItem>
              <SelectItem value="nl">Dutch</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="et">Estonian</SelectItem>
              <SelectItem value="fi">Finnish</SelectItem>
              <SelectItem value="nl-BE">Flemish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="de-CH">German (Switzerland)</SelectItem>
              <SelectItem value="el">Greek</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
              <SelectItem value="hu">Hungarian</SelectItem>
              <SelectItem value="id">Indonesian</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
              <SelectItem value="lv">Latvian</SelectItem>
              <SelectItem value="lt">Lithuanian</SelectItem>
              <SelectItem value="ms">Malay</SelectItem>
              <SelectItem value="no">Norwegian</SelectItem>
              <SelectItem value="pl">Polish</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ro">Romanian</SelectItem>
              <SelectItem value="ru">Russian</SelectItem>
              <SelectItem value="sk">Slovak</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="sv">Swedish</SelectItem>
              <SelectItem value="th">Thai</SelectItem>
              <SelectItem value="tr">Turkish</SelectItem>
              <SelectItem value="uk">Ukrainian</SelectItem>
              <SelectItem value="vi">Vietnamese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-2 flex items-center">
            <label className="block text-sm font-medium text-foreground">
              How would you like the AI to respond?
            </label>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            These instructions will be appended to our default system prompt
          </p>

          {comparisonEnabled ? (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="custom-system-prompt-primary"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Primary assistant
                </label>
                <textarea
                  className="flex min-h-[120px] w-full resize-y rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/50"
                  placeholder="Clarify objectives first, then offer structured solutions. Keep replies concise."
                  id="custom-system-prompt-primary"
                  value={primarySystemPrompt}
                  onChange={(e) => {
                    setPrimarySystemPrompt(e.target.value);
                    setSystemPrompt(e.target.value);
                  }}
                ></textarea>
              </div>
              <div>
                <label
                  htmlFor="custom-system-prompt-secondary"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Secondary assistant
                </label>
                <textarea
                  className="flex min-h-[120px] w-full resize-y rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/50"
                  placeholder="Adopt a contrasting persona or methodology to compare answers."
                  id="custom-system-prompt-secondary"
                  value={secondarySystemPrompt}
                  onChange={(e) => setSecondarySystemPrompt(e.target.value)}
                ></textarea>
              </div>
            </div>
          ) : (
            <textarea
              className="flex min-h-[120px] w-full resize-y rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/50"
              placeholder="Use structured markdown when possible. Be verbose but concise. Provide answers in bullet form without fluff."
              id="custom-system-prompt"
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setPrimarySystemPrompt(e.target.value);
              }}
            ></textarea>
          )}

          <div className="mt-3 mb-4 flex items-center">
            <div className="relative flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="skip-system-prompt"
                  type="checkbox"
                  checked={skipSystemPrompt}
                  onChange={(e) => setSkipSystemPrompt(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div className="ml-2 text-sm leading-6">
                <label htmlFor="skip-system-prompt" className="text-foreground">
                  Skip default system prompt
                </label>
                <p className="text-xs text-muted-foreground">
                  Only use this if you're familiar with prompt engineering
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleReset}
          variant="outline"
          className="flex items-center gap-2 border-border hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Reset custom instructions
        </Button>
      </div>
    </section>
  );
};

export default CustomInstructionsSettings;
