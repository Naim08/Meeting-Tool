import { useState } from "react";
import { Key, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { SectionHeader } from "./shared";
import { cn } from "@/lib/utils";

const APIKeySettings = ({
  openaiApiKey,
  anthropicApiKey,
  onOpenaiKeyChange,
  onAnthropicKeyChange,
  apiKeyValidity,
}) => {
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  const handleOpenaiKeyChange = (e) => {
    onOpenaiKeyChange(e.target.value);
  };

  const handleAnthropicKeyChange = (e) => {
    onAnthropicKeyChange(e.target.value);
  };

  const maskKey = (key) => {
    if (!key) return "";
    if (key.length <= 8) return "*".repeat(key.length);
    return (
      key.substring(0, 4) +
      "*".repeat(key.length - 8) +
      key.substring(key.length - 4)
    );
  };

  const getValidationIcon = (isValid, hasKey) => {
    if (!hasKey) return null;
    return isValid ? (
      <CheckCircle className="h-4 w-4 text-emerald-500" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    );
  };

  const getInputBorderClass = (isValid, hasKey) => {
    if (!hasKey) return "border-input";
    return isValid ? "border-emerald-500" : "border-destructive";
  };

  return (
    <section>
      <SectionHeader
        icon={Key}
        title="API Keys"
        description="Provide your own OpenAI and Anthropic API keys to use your own quota"
      />

      <div className="space-y-6">
        {/* OpenAI API Key */}
        <div className="space-y-2">
          <label
            htmlFor="openai-api-key"
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            OpenAI API Key
            {getValidationIcon(apiKeyValidity.openai, !!openaiApiKey)}
          </label>
          <div className="relative">
            <input
              type={showOpenaiKey ? "text" : "password"}
              id="openai-api-key"
              value={openaiApiKey}
              onChange={handleOpenaiKeyChange}
              placeholder="sk-..."
              className={cn(
                "w-full rounded-lg border px-3 py-2 pr-10 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                "bg-background/85 dark:bg-gray-800/60",
                getInputBorderClass(apiKeyValidity.openai, !!openaiApiKey)
              )}
            />
            <button
              type="button"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground transition-colors hover:text-foreground"
            >
              {showOpenaiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {openaiApiKey && !showOpenaiKey && (
            <p className="text-xs text-muted-foreground">
              Current key: {maskKey(openaiApiKey)}
            </p>
          )}
          {openaiApiKey && !apiKeyValidity.openai && (
            <p className="text-xs text-destructive/80">
              Invalid API key format. OpenAI keys should start with "sk-" and be
              at least 20 characters long.
            </p>
          )}
          {openaiApiKey && apiKeyValidity.openai && (
            <p className="text-xs text-emerald-500">API key format is valid.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80"
            >
              OpenAI Platform
            </a>
          </p>
        </div>

        {/* Anthropic API Key */}
        <div className="space-y-2">
          <label
            htmlFor="anthropic-api-key"
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            Anthropic API Key
            {getValidationIcon(apiKeyValidity.anthropic, !!anthropicApiKey)}
          </label>
          <div className="relative">
            <input
              type={showAnthropicKey ? "text" : "password"}
              id="anthropic-api-key"
              value={anthropicApiKey}
              onChange={handleAnthropicKeyChange}
              placeholder="sk-ant-..."
              className={cn(
                "w-full rounded-lg border px-3 py-2 pr-10 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                "bg-background/85 dark:bg-gray-800/60",
                getInputBorderClass(apiKeyValidity.anthropic, !!anthropicApiKey)
              )}
            />
            <button
              type="button"
              onClick={() => setShowAnthropicKey(!showAnthropicKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground transition-colors hover:text-foreground"
            >
              {showAnthropicKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {anthropicApiKey && !showAnthropicKey && (
            <p className="text-xs text-muted-foreground">
              Current key: {maskKey(anthropicApiKey)}
            </p>
          )}
          {anthropicApiKey && !apiKeyValidity.anthropic && (
            <p className="text-xs text-destructive/80">
              Invalid API key format. Anthropic keys should start with "sk-ant-"
              and be at least 20 characters long.
            </p>
          )}
          {anthropicApiKey && apiKeyValidity.anthropic && (
            <p className="text-xs text-emerald-500">API key format is valid.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80"
            >
              Anthropic Console
            </a>
          </p>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-primary-foreground transition-colors dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-100">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground dark:bg-blue-500">
                <span className="text-xs font-bold">i</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary dark:text-blue-200">
                How API Keys Work
              </h3>
              <div className="mt-2 text-sm text-primary/80 dark:text-blue-100">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    API keys are stored locally on your device and never saved
                    on our servers
                  </li>
                  <li>
                    When provided, your keys will be used instead of our shared
                    quota
                  </li>
                  <li>
                    You'll be charged directly by OpenAI/Anthropic for your
                    usage
                  </li>
                  <li>Leave empty to use the default shared service</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default APIKeySettings;
