import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import MessageList from "@/components/message-list";
import type {
  ChatMessageRecord,
  ChatSessionRecord,
  ChatSessionWithMessages,
} from "../../../types/chat-history";

const formatTimestamp = (value: number | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatDuration = (session: ChatSessionRecord) => {
  if (!session.endedAt) return "In progress";
  const durationMs = session.endedAt - session.startedAt;
  if (durationMs <= 0) return "Less than a minute";
  const minutes = Math.floor(durationMs / 60000);
  if (minutes < 1) {
    const seconds = Math.floor(durationMs / 1000);
    return `${seconds}s`;
  }
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

export default function ChatHistoryView() {
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [selectedSession, setSelectedSession] =
    useState<ChatSessionWithMessages | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!window.api?.chatHistory?.listSessions) {
      setError("Chat history is unavailable in this build.");
      setIsLoadingSessions(false);
      return;
    }
    setIsLoadingSessions(true);
    setError(null);
    try {
      const result = await window.api.chatHistory.listSessions({
        limit: 50,
        offset: 0,
      });
      setSessions(result ?? []);
    } catch (err) {
      console.error("[Renderer] Failed to load chat sessions:", err);
      setError("Unable to load chat history.");
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (!window.api?.chatHistory?.getSession) {
        return;
      }
      setIsLoadingDetails(true);
      setError(null);
      try {
        const fullSession =
          (await window.api.chatHistory.getSession(sessionId)) ?? null;
        setSelectedSession(fullSession);
      } catch (err) {
        console.error("[Renderer] Failed to load chat session details:", err);
        setError("Unable to load conversation details.");
      } finally {
        setIsLoadingDetails(false);
      }
    },
    []
  );

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  }, [sessions]);

  const messages = selectedSession?.messages ?? [];
  const isDetailMode = Boolean(selectedSession);

  const formattedMessages = useMemo(() => {
    if (!messages.length) return [];
    return messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => {
        let attachmentMeta: unknown = undefined;
        if (message.attachmentMeta) {
          try {
            attachmentMeta = JSON.parse(message.attachmentMeta);
          } catch (err) {
            console.warn("[Renderer] Failed to parse attachment meta", err);
          }
        }
        let rawMeta: unknown = undefined;
        if (message.rawJson) {
          try {
            rawMeta = JSON.parse(message.rawJson);
          } catch (err) {
            console.warn("[Renderer] Failed to parse message rawJson", err);
          }
        }
        const combinedData: Record<string, unknown> = {};
        if (attachmentMeta && typeof attachmentMeta === "object") {
          Object.assign(combinedData, attachmentMeta as Record<string, unknown>);
        }
        if (rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)) {
          const metaRecord = rawMeta as Record<string, unknown>;
          if (metaRecord.comparisonSlot) {
            combinedData.comparisonSlot = metaRecord.comparisonSlot;
          }
          if (metaRecord.comparisonLabel) {
            combinedData.comparisonLabel = metaRecord.comparisonLabel;
          } else if (metaRecord.modelId) {
            combinedData.comparisonLabel = metaRecord.modelId;
          }
          if (metaRecord.modelId) {
            combinedData.comparisonModelId = metaRecord.modelId;
          }
        }
        return {
          id: message.id,
          role: message.role,
          content: message.content,
          data:
            Object.keys(combinedData).length > 0 ? combinedData : undefined,
        };
      });
  }, [messages]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!window.api?.chatHistory?.deleteSession) {
        return;
      }
      setDeletingSessionId(sessionId);
      setError(null);
      try {
        await window.api.chatHistory.deleteSession(sessionId);
        if (selectedSession?.session.id === sessionId) {
          setSelectedSession(null);
        }
        await loadSessions();
      } catch (err) {
        console.error("[Renderer] Failed to delete chat session:", err);
        setError("Unable to delete conversation.");
      } finally {
        setDeletingSessionId(null);
      }
    },
    [loadSessions, selectedSession?.session.id]
  );

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-y-auto bg-gradient-to-b from-background via-background to-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            {isDetailMode && (
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                ← Back
              </button>
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Chat History</h1>
              <p className="text-sm text-muted-foreground">
                Review previous assistant conversations and pick up where you left off.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div
          className={`flex flex-1 flex-col gap-6 ${
            isDetailMode
              ? ""
              : "lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start"
          }`}
        >
          {!isDetailMode && (
            <aside className="space-y-4">
              <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Conversations
              </h2>
              <button
                type="button"
                onClick={() => loadSessions()}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-2">
              {isLoadingSessions ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/80 text-sm text-muted-foreground">
                  Loading chat history…
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/80 text-sm text-muted-foreground">
                  No conversations yet. Start chatting to build your history.
                </div>
              ) : (
                sortedSessions.map((session) => {
                  const isActive = selectedSession?.session.id === session.id;
                  const isDeleting = deletingSessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                        isActive
                          ? "border-primary/60 bg-primary/5 shadow"
                          : "border-border/60 bg-card/80 hover:border-primary/40 hover:shadow-md"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-sm font-medium text-foreground">
                            <span>{session.title ?? "Untitled conversation"}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(session)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started {formatTimestamp(session.startedAt)}
                          </div>
                          {session.lastMessagePreview && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {session.lastMessagePreview}
                            </div>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/70 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                        title="Delete conversation"
                        disabled={isDeleting}
                      >
                        <Trash2 className={`h-4 w-4 ${isDeleting ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
          )}

          <section className="min-h-[26rem] rounded-2xl border border-border/60 bg-card/95 p-6 shadow">
            {isLoadingDetails ? (
              <div className="flex h-full min-h-[20rem] items-center justify-center text-sm text-muted-foreground">
                Loading conversation…
              </div>
            ) : !selectedSession ? (
              <div className="flex h-full min-h-[20rem] items-center justify-center text-sm text-muted-foreground">
                Select a conversation to view its messages.
              </div>
            ) : (
              <div className="flex h-full flex-col gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedSession.session.title ?? "Untitled conversation"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(selectedSession.session.startedAt)} • {formatDuration(selectedSession.session)} • {selectedSession.session.messageCount} messages
                  </p>
                  {selectedSession.session.lastMessagePreview && (
                    <p className="text-xs text-muted-foreground">
                      Last message: {selectedSession.session.lastMessagePreview}
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto rounded-xl border border-border/50 bg-background/70 p-4">
                  {formattedMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No messages recorded in this conversation.
                    </div>
                  ) : (
                    <MessageList messages={formattedMessages} isLoading={false} />
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
