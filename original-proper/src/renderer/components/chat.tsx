import { PaperPlaneRight } from "@phosphor-icons/react";
import { useEffect } from "react";
import MessageList from "@/components/message-list";
import EmptyMessage from "@/components/empty-message";
import TranscriptionDisplay from "@/components/TranscriptionDisplay";

const formatLabel = (label: string | null | undefined, fallback: string) => {
  if (!label) {
    return fallback;
  }
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export default function ChatInterface({
  chatContainerRef,
  primaryMessages,
  secondaryMessages,
  comparisonEnabled,
  primaryModelLabel,
  secondaryModelLabel,
  isLoading,
  isPrimaryLoading,
  isSecondaryLoading,
  supabase,
  session,
  getDisplayMedia,
  setScreenOpen,
  error,
  secondaryError,
  parseError,
  input,
  handleInputChange,
  stop,
  handleSubmit,
  subscription,
  trialEnded,
  trialMessageCount,
  micTranscript,
  systemTranscript,
  micTranscriptions,
  systemTranscriptions,
  showMicTranscript,
  showSystemTranscript,
}) {
  const hasMessages =
    primaryMessages.length > 0 ||
    (comparisonEnabled && secondaryMessages.length > 0);

  const primaryLabel = formatLabel(primaryModelLabel, "Primary model");
  const secondaryLabel = formatLabel(secondaryModelLabel, "Secondary model");

  const isNearBottom = () => {
    if (!chatContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  useEffect(() => {
    if (
      chatContainerRef.current &&
      primaryMessages.length > 0 &&
      isNearBottom()
    ) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [primaryMessages, secondaryMessages, comparisonEnabled, chatContainerRef]);

  useEffect(() => {
    if (
      chatContainerRef.current &&
      !isLoading &&
      primaryMessages.length > 0 &&
      isNearBottom()
    ) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [
    isLoading,
    chatContainerRef,
    primaryMessages.length,
    secondaryMessages.length,
    comparisonEnabled,
  ]);

  const renderLoadingMessage = () => {
    if (!comparisonEnabled) {
      return isLoading ? "Assistant is thinking..." : null;
    }

    const loadingTexts: string[] = [];
    if (isPrimaryLoading) {
      loadingTexts.push(`${primaryLabel} is responding…`);
    }
    if (isSecondaryLoading) {
      loadingTexts.push(`${secondaryLabel} is responding…`);
    }
    return loadingTexts.length ? loadingTexts.join(" · ") : null;
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground transition-colors">
      <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        {hasMessages ? (
          comparisonEnabled ? (
            <div className="mx-auto flex w-full flex-col gap-8 px-8 pb-4 lg:px-8">
              <div className="grid gap-6 md:grid-cols-2 md:items-stretch md:[&>*]:min-h-full md:[&>*]:h-full">
                <div className="flex h-full min-h-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {primaryLabel}
                    </p>
                    {isPrimaryLoading && (
                      <span className="text-xs text-muted-foreground">
                        Responding…
                      </span>
                    )}
                  </div>
                  <MessageList
                    messages={primaryMessages}
                    className="flex-1"
                    alignEnd
                  />
                </div>
                <div className="flex h-full min-h-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {secondaryLabel}
                    </p>
                    {isSecondaryLoading && (
                      <span className="text-xs text-muted-foreground">
                        Responding…
                      </span>
                    )}
                  </div>
                  <MessageList
                    messages={secondaryMessages}
                    className="flex-1"
                    alignEnd
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full flex-col gap-8 px-8 pb-4 lg:px-8">
              <MessageList messages={primaryMessages} />
            </div>
          )
        ) : (
          <EmptyMessage
            supabase={supabase}
            session={session}
            getDisplayMedia={getDisplayMedia}
            setScreenOpen={setScreenOpen}
          />
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/90 dark:shadow-none sm:px-8">
        <form
          onSubmit={(e) => {
            stop();
            handleSubmit(e);
          }}
          className="mx-auto w-full max-w-6xl"
        >
          {error && (
            <div className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2">
              <p className="font-sans text-sm text-destructive">
                {!comparisonEnabled
                  ? parseError(error)
                  : `${primaryLabel}: ${parseError(error)}`}
              </p>
            </div>
          )}
          {comparisonEnabled && secondaryError && (
            <div className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2">
              <p className="font-sans text-sm text-destructive">
                {`${secondaryLabel}: ${parseError(secondaryError)}`}
              </p>
            </div>
          )}
          <div className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {renderLoadingMessage() && (
              <p className="text-xs text-muted-foreground">
                {renderLoadingMessage()}
              </p>
            )}
            <TranscriptionDisplay
              micTranscript={micTranscript}
              systemTranscript={systemTranscript}
              micTranscriptions={micTranscriptions}
              systemTranscriptions={systemTranscriptions}
              showMic={showMicTranscript}
              showSystem={showSystemTranscript}
            />
          </div>
          <div className="relative">
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-sans text-foreground shadow-sm transition-[box-shadow,border-color] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
              value={input}
              onChange={handleInputChange}
              aria-label="ask a question"
              placeholder="Ask a question..."
            />
            <button
              type="submit"
              aria-label="send"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary transition-colors hover:text-primary/80 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted-foreground"
              disabled={!input}
            >
              <PaperPlaneRight size="1em" />
            </button>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <div className="flex items-center gap-1">
              {!subscription && !trialEnded && (
                <div className="font-sans text-xs text-muted-foreground">
                  Free messages left: {trialMessageCount}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
