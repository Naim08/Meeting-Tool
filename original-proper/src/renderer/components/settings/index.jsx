import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Bot } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import useLocalStorage from "../../hooks/use-local-storage";
import { SettingsHeader, SettingsTabs } from "./shared";
import HotkeyEditor from "./HotkeyEditor";
import TransparencySettings from "./TransparencySettings";
import DockIconSettings from "./DockIconSettings";
import AIModelSettings from "./AIModelSettings";
import CustomInstructionsSettings from "./CustomInstructionsSettings";
import APIKeySettings from "./APIKeySettings";
import ThemeSettings from "./ThemeSettings";

// API key validation functions
const validateOpenAIKey = (key) => {
  if (!key) return false;
  return key.startsWith("sk-") && key.length >= 20;
};

const validateAnthropicKey = (key) => {
  if (!key) return false;
  return key.startsWith("sk-ant-") && key.length >= 20;
};

// Main Settings component
const Settings = ({
  audioInputDevices,
  selectedAudioDevice,
  setSelectedAudioDevice,
  session,
  supabase,
  updateLink,
  resetChatSessions,
}) => {
  const [model, setModel] = useLocalStorage("aiModel", "");
  const [comparisonEnabled, setComparisonEnabled] = useLocalStorage(
    "aiComparisonEnabled",
    false
  );
  const [primaryModel, setPrimaryModel] = useLocalStorage(
    "aiModelPrimary",
    ""
  );
  const [secondaryModel, setSecondaryModel] = useLocalStorage(
    "aiModelSecondary",
    ""
  );
  const [activeTab, setActiveTab] = useState("general");

  // API Key state management
  const [openaiApiKey, setOpenaiApiKey] = useLocalStorage("openaiApiKey", "");
  const [anthropicApiKey, setAnthropicApiKey] = useLocalStorage(
    "anthropicApiKey",
    ""
  );

  // API Key validity state
  const [apiKeyValidity, setApiKeyValidity] = useState({
    openai: validateOpenAIKey(openaiApiKey),
    anthropic: validateAnthropicKey(anthropicApiKey),
  });

  // Update validity when keys change from localStorage
  useEffect(() => {
    setApiKeyValidity({
      openai: validateOpenAIKey(openaiApiKey),
      anthropic: validateAnthropicKey(anthropicApiKey),
    });
  }, [openaiApiKey, anthropicApiKey]);

  // Update validity when keys change
  const handleOpenaiKeyChange = (key) => {
    setOpenaiApiKey(key);
    setApiKeyValidity((prev) => ({
      ...prev,
      openai: validateOpenAIKey(key),
    }));
  };

  const handleAnthropicKeyChange = (key) => {
    setAnthropicApiKey(key);
    setApiKeyValidity((prev) => ({
      ...prev,
      anthropic: validateAnthropicKey(key),
    }));
  };

  const isOSX = window?.api?.isOSX();

  const tabs = [
    {
      id: "general",
      label: "General",
      icon: <SettingsIcon className="h-4 w-4 mr-2" />,
    },
    { id: "ai", label: "AI Model", icon: <Bot className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-y-auto bg-gradient-to-b from-background via-background to-background text-foreground transition-colors dark:from-gray-900 dark:to-gray-950">
      <div className="mx-auto w-full max-w-4xl px-6 py-8 lg:py-10">
        {/* Header with update notification */}
        <SettingsHeader updateLink={updateLink} />

        {/* Tabs */}
        <SettingsTabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Tab content */}
        <div className="space-y-8">
          {activeTab === "ai" && (
            <div className="space-y-8 animate-in fade-in-50 duration-300">
              <AIModelSettings
                model={model}
                setModel={setModel}
                resetChatSessions={resetChatSessions}
                apiKeyValidity={apiKeyValidity}
                comparisonEnabled={comparisonEnabled}
                setComparisonEnabled={setComparisonEnabled}
                primaryModel={primaryModel}
                setPrimaryModel={setPrimaryModel}
                secondaryModel={secondaryModel}
                setSecondaryModel={setSecondaryModel}
              />

              <Separator className="bg-border/60 dark:bg-gray-800" />

              <APIKeySettings
                openaiApiKey={openaiApiKey}
                anthropicApiKey={anthropicApiKey}
                onOpenaiKeyChange={handleOpenaiKeyChange}
                onAnthropicKeyChange={handleAnthropicKeyChange}
                apiKeyValidity={apiKeyValidity}
              />

              <Separator className="bg-border/60 dark:bg-gray-800" />

              <CustomInstructionsSettings
                comparisonEnabled={comparisonEnabled}
              />
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-8 animate-in fade-in-50 duration-300">
              <ThemeSettings />

              <Separator className="bg-border/60 dark:bg-gray-800" />

              <HotkeyEditor />

              <Separator className="bg-border/60 dark:bg-gray-800" />

              <TransparencySettings />

              {isOSX && (
                <>
                  <Separator className="bg-border/60 dark:bg-gray-800" />
                  <DockIconSettings />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
export { DEFAULT_SCREENSHOT_MESSAGE } from './CustomInstructionsSettings';
