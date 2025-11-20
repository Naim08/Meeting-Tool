import { useChat } from "ai/react";
import { useState, useEffect, useRef, useCallback } from "react";
import Settings, { DEFAULT_SCREENSHOT_MESSAGE } from "@/components/settings";
import { getServerRoot } from "@/lib/utils";
import ScreenPickerDialog from "@/components/screen-picker-dialog";
import { createClient } from "@supabase/supabase-js";
import { useSupabase } from "@/supabase-provider";
import { supabaseDb2 } from "@/supabase-db2-client";
import Landing from "@/components/landing";
import useTranscription from "@/hooks/useTranscription";
import useTranscriptionManager from "@/hooks/useTranscriptionManager";
import Spinner from "@/components/Spinner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ChatInterface from "@/components/chat";
import { transcriptionSessionManager } from "@/services/TranscriptionSessionManager";
import MeetingsView from "@/components/meetings/MeetingsView";
import type {
  AppendChatMessagePayload,
  ChatSessionRecord,
} from "../types/chat-history";
import ChatHistoryView from "@/components/history/ChatHistoryView";
import { HomePage } from "@/components/pages/Home";

export const TABS = {
  HOME: "home",
  CHAT: "chat",
  SETTINGS: "settings",
  MEETINGS: "meetings",
  HISTORY: "history",
};

const parseError = (error) => {
  try {
    return JSON.parse(error.message).error;
  } catch (e) {
    // console.error(e);
    return error.message;
  }
};

const SCROLL_INTERVAL = 500; // pixels to scroll each time

const hashString = (value: string): string => {
  if (!value) {
    return "0";
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const deriveSessionTitle = (content: string) => {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  const MAX_TITLE_LENGTH = 120;
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_TITLE_LENGTH).trim()}…`;
};

export type MeetingControlledSourcesState = {
  system: boolean;
  microphone: boolean;
  meetingId: string | null;
};

export const createInitialMeetingControlledState =
  (): MeetingControlledSourcesState => ({
    system: false,
    microphone: false,
    meetingId: null,
  });

export type MeetingSourceTogglePayload = {
  source?: "microphone" | "system";
  enabled?: boolean;
  meetingId?: string | null;
};

export const applyMeetingSourceToggle = (
  state: MeetingControlledSourcesState,
  payload: MeetingSourceTogglePayload | null | undefined
): {
  state: MeetingControlledSourcesState;
  resetMic: boolean;
  resetSystem: boolean;
} => {
  const nextState: MeetingControlledSourcesState = { ...state };
  let resetMic = false;
  let resetSystem = false;

  if (!payload?.source) {
    return { state: nextState, resetMic, resetSystem };
  }

  const enabled = !!payload.enabled;
  const meetingId = payload.meetingId ?? null;

  if (payload.source === "system") {
    nextState.system = enabled;
    if (enabled) {
      resetSystem = true;
      nextState.meetingId = meetingId ?? nextState.meetingId;
    } else if (!nextState.microphone) {
      nextState.meetingId = null;
    }
  } else if (payload.source === "microphone") {
    nextState.microphone = enabled;
    if (enabled) {
      resetMic = true;
      nextState.meetingId = meetingId ?? nextState.meetingId;
    } else if (!nextState.system) {
      nextState.meetingId = null;
    }
  }

  return { state: nextState, resetMic, resetSystem };
};

export const updateMeetingControlledForSystemRecorder = (
  state: MeetingControlledSourcesState,
  enabled: boolean
): {
  state: MeetingControlledSourcesState;
  wasMeetingControlled: boolean;
} => {
  const wasMeetingControlled = state.system;
  const nextState: MeetingControlledSourcesState = { ...state };

  if (!enabled) {
    nextState.system = false;
    if (!nextState.microphone) {
      nextState.meetingId = null;
    }
  } else if (!wasMeetingControlled) {
    nextState.system = false;
    if (!nextState.microphone) {
      nextState.meetingId = null;
    }
  }

  return {
    state: nextState,
    wasMeetingControlled,
  };
};

export const updateMeetingControlledForMicrophoneToggle = (
  state: MeetingControlledSourcesState,
  shouldStart: boolean,
  meetingId: string | null | undefined
): {
  state: MeetingControlledSourcesState;
  isMeetingControlled: boolean;
} => {
  const nextState: MeetingControlledSourcesState = { ...state };

  if (meetingId) {
    nextState.microphone = !!shouldStart;
    if (shouldStart) {
      nextState.meetingId = meetingId;
    } else if (!nextState.system) {
      nextState.meetingId = null;
    }
    return {
      state: nextState,
      isMeetingControlled: true,
    };
  }

  const wasMeetingControlled = nextState.microphone;

  if (!shouldStart) {
    nextState.microphone = false;
    if (!nextState.system) {
      nextState.meetingId = null;
    }
  } else {
    nextState.microphone = false;
    if (!nextState.system) {
      nextState.meetingId = null;
    }
  }

  return {
    state: nextState,
    isMeetingControlled: wasMeetingControlled,
  };
};

export default function Chat() {
  const [isScreenOpen, setIsScreenOpen] = useState(false);
  const [screen, setScreen] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [screens, setScreens] = useState([]);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [isLoadingScreens, setIsLoadingScreens] = useState(false);
  const [hasScreenAccess, setHasScreenAccess] = useState(false);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState();
  const [isProd, setIsProd] = useState(false);
  const wasCalled = useRef(false);
  const [updateLink, setUpdateLink] = useState(undefined);
  const [isTranscriptionsEnabled, setIsTranscriptionsEnabled] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const activeMeetingIdRef = useRef<string | null>(null);
  const [showMicTranscriptPanel, setShowMicTranscriptPanel] = useState(false);
  const [showSystemTranscriptPanel, setShowSystemTranscriptPanel] = useState(false);
  const [isUnifiedRecording, setIsUnifiedRecording] = useState(false);
  const [unifiedRecordingSessionId, setUnifiedRecordingSessionId] = useState<string | null>(null);
  const meetingControlledSourcesRef =
    useRef<MeetingControlledSourcesState>(createInitialMeetingControlledState());
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const chatSessionIdRef = useRef<string | null>(null);
  const sessionInitPromiseRef = useRef<Promise<string | null> | null>(null);
  const sessionTitleSetRef = useRef(false);
  const previousMessagesLengthRef = useRef(0);
  const hasPersistedMessagesRef = useRef(false);
  const chatHistory = window.api?.chatHistory;

  const startChatSession = useCallback(async () => {
    if (!chatHistory?.createSession) {
      return null;
    }

    const now = Date.now();
    let model: string | null = null;
    let systemPrompt: string | null = null;

    try {
      const storedModel = JSON.parse(
        localStorage.getItem("aiModel") ?? '"openai"'
      );
      model = typeof storedModel === "string" ? storedModel : String(storedModel);
    } catch {
      model = "openai";
    }

    try {
      const storedPrompt = JSON.parse(
        localStorage.getItem("systemPrompt") ?? '""'
      );
      systemPrompt =
        typeof storedPrompt === "string" && storedPrompt.trim().length > 0
          ? storedPrompt
          : null;
    } catch {
      systemPrompt = null;
    }

    try {
      const session: ChatSessionRecord = await chatHistory.createSession({
        model,
        systemPromptHash: systemPrompt ? hashString(systemPrompt) : null,
        startedAt: now,
      });
      chatSessionIdRef.current = session.id;
      sessionTitleSetRef.current = Boolean(session.title);
      setChatSessionId(session.id);
      return session.id;
    } catch (error) {
      console.error("[Renderer] Failed to start chat session:", error);
      return null;
    }
  }, [chatHistory]);

  const ensureChatSession = useCallback(async () => {
    if (!chatHistory?.createSession) {
      return null;
    }
    if (chatSessionIdRef.current) {
      return chatSessionIdRef.current;
    }
    if (sessionInitPromiseRef.current) {
      return sessionInitPromiseRef.current;
    }
    const promise = startChatSession();
    sessionInitPromiseRef.current = promise;
    const sessionId = await promise;
    sessionInitPromiseRef.current = null;
    return sessionId;
  }, [chatHistory, startChatSession]);

  const finalizeChatSession = useCallback(async () => {
    if (
      chatSessionIdRef.current &&
      chatHistory?.completeSession &&
      hasPersistedMessagesRef.current
    ) {
      try {
        await chatHistory.completeSession(chatSessionIdRef.current);
      } catch (error) {
        console.error("[Renderer] Failed to complete chat session:", error);
      }
    }

    chatSessionIdRef.current = null;
    setChatSessionId(null);
    sessionTitleSetRef.current = false;
    hasPersistedMessagesRef.current = false;
  }, [chatHistory]);

  const resetChatSessionState = useCallback(async () => {
    await finalizeChatSession();
  }, [finalizeChatSession]);

  const persistChatMessage = useCallback(
    async (
      message: AppendChatMessagePayload,
      options: { updateTitleFromContent?: boolean } = {}
    ) => {
      if (!chatHistory?.appendMessage || !message.content?.trim()) {
        return null;
      }

      const sessionId = await ensureChatSession();
      if (!sessionId) {
        return null;
      }

      try {
        await chatHistory.appendMessage(sessionId, {
          ...message,
          content: message.content.trim(),
          createdAt: message.createdAt ?? Date.now(),
        });
        hasPersistedMessagesRef.current = true;

        if (options.updateTitleFromContent && !sessionTitleSetRef.current) {
          const derivedTitle = deriveSessionTitle(message.content);
          if (derivedTitle && chatHistory.updateSessionTitle) {
            try {
              await chatHistory.updateSessionTitle(sessionId, derivedTitle);
            } catch (error) {
              console.error("[Renderer] Failed to update session title:", error);
            }
          }
          sessionTitleSetRef.current = true;
        }
      } catch (error) {
        console.error("[Renderer] Failed to persist chat message:", error);
      }

      return sessionId;
    },
    [chatHistory, ensureChatSession]
  );

  const recordUserMessage = useCallback(
    (content: string, attachmentMeta?: unknown, rawJson?: unknown) => {
      if (!content || !content.trim()) {
        return;
      }
      void persistChatMessage(
        {
          role: "user",
          content,
          attachmentMeta,
          rawJson,
          createdAt: Date.now(),
        },
        { updateTitleFromContent: true }
      );
    },
    [persistChatMessage]
  );

  const recordAssistantMessage = useCallback(
    (content: string, rawJson?: unknown) => {
      if (!content || !content.trim()) {
        return;
      }
      void persistChatMessage({
        role: "assistant",
        content,
        rawJson,
        createdAt: Date.now(),
      });
    },
    [persistChatMessage]
  );

  useEffect(() => {
    return () => {
      void finalizeChatSession();
    };
  }, [finalizeChatSession]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      const sessionId = chatSessionIdRef.current;
      if (
        sessionId &&
        chatHistory?.completeSession &&
        hasPersistedMessagesRef.current
      ) {
        try {
          await chatHistory.completeSession(sessionId, Date.now());
        } catch (error) {
          if (
            !(
              error instanceof Error &&
              error.message?.toLowerCase().includes("database not initialized")
            )
          ) {
            console.error("[Renderer] Failed to complete session on unload:", error);
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [chatHistory]);

  const getSelectedLanguage = useCallback(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (!storedLanguage) {
      return "en";
    }

    try {
      const parsed = JSON.parse(storedLanguage);
      if (typeof parsed === "string" && parsed.trim().length > 0) {
        return parsed;
      }
    } catch (error) {
      console.error("[App] Failed to parse selectedLanguage:", error);
    }

    return "en";
  }, []);

  // Use the transcription manager hook
  const {
    micTranscriptUI,
    systemTranscriptUI,
    micTranscriptionsUI,
    systemTranscriptionsUI,
    handleMicTranscript,
    handleSystemTranscript,
    resetMicTranscription,
    resetSystemTranscription,
    hasMicTranscriptions,
    hasSystemTranscriptions,
    getMicTranscriptionsText,
    getSystemTranscriptionsText,
  } = useTranscriptionManager();

  const [isSystemAudioRecording, setIsSystemAudioRecording] = useState(false);
  const [showSpinner, setShowSpinner] = useState(true);
  const chatContainerRef = useRef(null);
  const handleScreenOpenChange = useCallback((open) => {
    setIsScreenOpen(open);
  }, []);
  const {
    supabase,
    session,
    subscription,
    trialRemainingTimeMins,
    trialStarted,
    trialEnded,
    trialMessageCount,
    decrementTrialMessageCount,
    broadcastMessage,
    broadcastStreamingMessage,
    broadcastClients,
    isSessionLoading,
    isSubscriptionLoading,
    hashedEmail,
    setChatMessageHandler,
  } = useSupabase();

  const transcriptionResult = useTranscription();
  
  useEffect(() => {
    let mounted = true;

    const resolveTranscriptionsAvailability = async () => {
      try {
        const enabled = await window.api?.isTranscriptionsEnabled?.();
        if (mounted && typeof enabled === "boolean") {
          setIsTranscriptionsEnabled(enabled);
        }
      } catch (error) {
        console.error(
          "[App] Failed to determine transcription availability:",
          error
        );
        if (mounted) {
          setIsTranscriptionsEnabled(false);
        }
      }
    };

    resolveTranscriptionsAvailability();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    activeMeetingIdRef.current = activeMeetingId;
  }, [activeMeetingId]);

  useEffect(() => {
    if (!isTranscriptionsEnabled) {
      return;
    }

    transcriptionSessionManager
      .syncActiveSessions()
      .catch((error) =>
        console.error("[App] Failed to sync active sessions:", error)
      );
  }, [isTranscriptionsEnabled]);

  useEffect(() => {
    const fetchActiveMeeting = async () => {
      try {
        const meeting = await window.api.meetings?.getActive();
        setActiveMeetingId(meeting?.id ?? null);
        activeMeetingIdRef.current = meeting?.id ?? null;
      } catch (error) {
        console.error("[App] Failed to fetch active meeting:", error);
      }
    };

    fetchActiveMeeting();
  }, []);

  // Safely destructure with fallbacks to prevent crashes
  const [
    isMicrophoneRecording = false,
    isMicrophoneRecordingLoading = false,
    transcript = {},
    startTranscription = async () => { console.warn('startTranscription not available'); },
    endTranscription = () => { console.warn('endTranscription not available'); },
  ] = transcriptionResult || [];

  console.log('[App] Transcription hook result:', {
    isMicrophoneRecording,
    isMicrophoneRecordingLoading,
    hasStartTranscription: typeof startTranscription === 'function',
    hasEndTranscription: typeof endTranscription === 'function',
  });

  // Create a ref to hold the latest message handler callback
  const messageHandlerRef = useRef(null);

  // Add a function to toggle recording state
  const toggleSystemAudioRecording = (value) => {
    setIsSystemAudioRecording(value ?? !isSystemAudioRecording);
  };

  // Handle the transcript from the useTranscription hook (microphone)
  useEffect(() => {
    try {
      console.log('[App] Transcript changed:', transcript);
      if (!transcript?.text) return;

      if (meetingControlledSourcesRef.current.microphone) {
        console.log('[App] Meeting-controlled microphone transcript ignored for chat UI.');
        return;
      }

      console.log('[App] Calling handleMicTranscript with:', transcript);
      handleMicTranscript(transcript);
      setShowMicTranscriptPanel(true);

      // Forward microphone transcripts to main process for floating window
      // when unified recording is active
      if (isUnifiedRecording) {
        window?.api?.send('microphone-transcript-update', {
          text: transcript.text,
          speaker: "You",
          isFinal: transcript.isFinal ?? true,
          timestamp: Date.now(),
          confidence: transcript.confidence,
        });
      }
    } catch (error) {
      console.error('[App] Error in transcript useEffect:', error);
    }
  }, [transcript, handleMicTranscript, isUnifiedRecording]);

  useEffect(() => {
    window?.api?.isProd().then((value) => {
      setIsProd(value);
    });
  }, []);

  const handleAPIResponse = (response) => {
    decrementTrialMessageCount();
  };

  const readFromStorage = (key: string, fallback: any) => {
    if (typeof window === "undefined") {
      return fallback;
    }
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (storageError) {
      console.error(`[App] Failed to parse ${key}:`, storageError);
      return fallback;
    }
  };

  const comparisonEnabled = Boolean(
    readFromStorage("aiComparisonEnabled", false)
  );
  const storedModel = readFromStorage("aiModel", "");
  const storedPrimaryModel = readFromStorage("aiModelPrimary", "");
  const storedSecondaryModel = readFromStorage("aiModelSecondary", "");
  const activePrimaryModel =
    (comparisonEnabled
      ? storedPrimaryModel || storedModel
      : storedModel || storedPrimaryModel) || "openai";
  const activeSecondaryModel = comparisonEnabled
    ? storedSecondaryModel || ""
    : "";

  const primaryModelLabel =
    readFromStorage("aiModelPrimaryLabel", activePrimaryModel) ||
    activePrimaryModel;
  const secondaryModelLabel =
    readFromStorage("aiModelSecondaryLabel", activeSecondaryModel) ||
    activeSecondaryModel;

  const storedSystemPrompt = readFromStorage("systemPrompt", "");
  const storedPrimarySystemPrompt = readFromStorage(
    "systemPromptPrimary",
    storedSystemPrompt
  );
  const storedSecondarySystemPrompt = readFromStorage(
    "systemPromptSecondary",
    storedSystemPrompt
  );
  const storedSkipSystemPrompt = Boolean(
    readFromStorage("skipSystemPrompt", false)
  );
  const storedOpenAIKey = readFromStorage("openaiApiKey", "");
  const storedAnthropicKey = readFromStorage("anthropicApiKey", "");
  const primarySystemPrompt = comparisonEnabled
    ? storedPrimarySystemPrompt
    : storedSystemPrompt;
  const secondarySystemPrompt = comparisonEnabled
    ? storedSecondarySystemPrompt
    : storedSystemPrompt;
  const shouldUseSecondary = comparisonEnabled && !!activeSecondaryModel;

  const handleResponseFinished = useCallback(
    (message) => {
      const annotatedMessage =
        message?.role === "assistant"
          ? {
              ...message,
              comparisonSlot: "primary",
              comparisonLabel: primaryModelLabel,
              modelId: activePrimaryModel,
            }
          : message;
      broadcastMessage([annotatedMessage]);
      if (annotatedMessage?.role === "assistant") {
        recordAssistantMessage(
          annotatedMessage.content ?? "",
          annotatedMessage
        );
      }
    },
    [
      broadcastMessage,
      recordAssistantMessage,
      activePrimaryModel,
      primaryModelLabel,
    ]
  );

  const handleSecondaryFinished = useCallback(
    (message) => {
      if (!shouldUseSecondary || message?.role !== "assistant") {
        return;
      }
      const annotatedMessage = {
        ...message,
        comparisonSlot: "secondary",
        comparisonLabel: secondaryModelLabel,
        modelId: activeSecondaryModel,
      };
      recordAssistantMessage(
        annotatedMessage.content ?? "",
        annotatedMessage
      );
    },
    [
      recordAssistantMessage,
      shouldUseSecondary,
      activeSecondaryModel,
      secondaryModelLabel,
    ]
  );

  const {
    messages: primaryMessages,
    setMessages: setPrimaryMessages,
    input,
    setInput,
    append: appendPrimary,
    handleInputChange,
    error: primaryError,
    isLoading: isPrimaryLoading,
    stop: stopPrimary,
  } = useChat({
    api: `${getServerRoot()}/api/chat`,
    body: {
      systemPrompt: primarySystemPrompt,
      skipSystemPrompt: storedSkipSystemPrompt,
      model: activePrimaryModel,
      isTrial: !subscription && trialStarted && !trialEnded,
      user: session?.user?.email,
      openaiApiKey: storedOpenAIKey || "",
      anthropicApiKey: storedAnthropicKey || "",
    },
    headers: {
      access_token: `${session?.access_token}`,
      refresh_token: `${session?.refresh_token}`,
    },
    onResponse: handleAPIResponse,
    onFinish: handleResponseFinished,
  });

  const {
    messages: secondaryMessages,
    setMessages: setSecondaryMessages,
    append: appendSecondary,
    error: secondaryError,
    isLoading: isSecondaryLoading,
    stop: stopSecondary,
  } = useChat({
    api: `${getServerRoot()}/api/chat`,
    body: {
      systemPrompt: secondarySystemPrompt,
      skipSystemPrompt: storedSkipSystemPrompt,
      model: activeSecondaryModel || activePrimaryModel,
      isTrial: !subscription && trialStarted && !trialEnded,
      user: session?.user?.email,
      openaiApiKey: storedOpenAIKey || "",
      anthropicApiKey: storedAnthropicKey || "",
    },
    headers: {
      access_token: `${session?.access_token}`,
      refresh_token: `${session?.refresh_token}`,
    },
    onFinish: handleSecondaryFinished,
  });

  const append = useCallback(
    (message: AppendChatMessagePayload, options?: Record<string, unknown>) => {
      appendPrimary(message, options);
      if (shouldUseSecondary) {
        appendSecondary(message, options);
      }
    },
    [appendPrimary, appendSecondary, shouldUseSecondary]
  );

  const stop = useCallback(() => {
    stopPrimary();
    if (shouldUseSecondary) {
      stopSecondary();
    }
  }, [stopPrimary, stopSecondary, shouldUseSecondary]);

  const isLoading = shouldUseSecondary
    ? isPrimaryLoading || isSecondaryLoading
    : isPrimaryLoading;

  const error = shouldUseSecondary ? primaryError ?? secondaryError : primaryError;

  const [, forceChatRefresh] = useState(0);

  const resetChatSessions = useCallback(() => {
    setPrimaryMessages([]);
    setSecondaryMessages([]);
    forceChatRefresh((value) => value + 1);
  }, [setPrimaryMessages, setSecondaryMessages, forceChatRefresh]);

  const handleSubmitWithHistory = useCallback(
    (event: any) => {
      event.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput) {
        return;
      }
      const message: AppendChatMessagePayload = {
        id: Math.random().toString(),
        content: trimmedInput,
        role: "user",
      };
      append(message);
      setInput("");
      recordUserMessage(trimmedInput);
    },
    [append, input, recordUserMessage, setInput]
  );

  useEffect(() => {
    setChatMessageHandler((message) => {
      append({
        id: Math.random().toString(),
        content: message,
        role: "user",
      });
      recordUserMessage(String(message ?? ""));
    });
  }, [setChatMessageHandler, append, recordUserMessage]);

  useEffect(() => {
    const previous = previousMessagesLengthRef.current;
    if (previous > 0 && primaryMessages.length === 0) {
      void resetChatSessionState();
    }
    previousMessagesLengthRef.current = primaryMessages.length;
  }, [primaryMessages.length, resetChatSessionState]);

  useEffect(() => {
    if (primaryMessages.length > 0) {
      const latestMessage = primaryMessages[primaryMessages.length - 1];
      if (latestMessage.role === "assistant") {
        broadcastStreamingMessage(latestMessage);
      } else if (latestMessage.role === "user") {
        broadcastMessage([latestMessage]);
      }
    }
  }, [primaryMessages, broadcastStreamingMessage, broadcastMessage]);

  useEffect(() => {
    const isOSX = window?.api?.isOSX();

    const fetchVersion = async () => {
      try {
        let version = await window?.api?.getVersion();
        const res = await fetch(`${getServerRoot()}/api/version`);
        const data = await res.json();
        // version is string 1.0.10. Check each part of the version string
        const versionParts = version.split(".");
        const latestVersionParts = data.version.split(".");
        if (
          parseInt(latestVersionParts[0]) > parseInt(versionParts[0]) ||
          parseInt(latestVersionParts[1]) > parseInt(versionParts[1]) ||
          parseInt(latestVersionParts[2]) > parseInt(versionParts[2])
        ) {
          setUpdateLink(isOSX ? data.url : data?.winUrl);
        }
      } catch (e) {
        console.error("error fetching version");
      }
    };

    fetchVersion();
  }, []);

  async function checkForPermissions() {
    let hasScreenAccessResult = await window?.api?.getScreenAccess();
    setHasScreenAccess(hasScreenAccessResult);
  }

  // Update the message handler ref whenever relevant dependencies change
  useEffect(() => {
    messageHandlerRef.current = async (message) => {
      try {
      switch (message.type) {
        case "text.copied":
          stop();
          append({
            id: Math.random().toString(),
            content: message.value,
            role: "user",
          });
          recordUserMessage(String(message.value ?? ""));
          break;
        case "chat.stop":
          stop();
          break;
        case "auth.callback":
          try {
            // Set session for DB1 (existing behavior)
            const { data: db1Data, error: db1Error } = await supabase.auth.setSession({
              access_token: message.value?.access_token,
              refresh_token: message.value?.refresh_token,
            });
            if (db1Error) {
              console.error("DB1 auth callback error:", db1Error);
            }

            // Also set session for DB2 (calendar/auth source of truth)
            // Check if tokens are for DB2 by trying to set the session
            try {
              const { data: db2Data, error: db2Error } = await supabaseDb2.auth.setSession({
                access_token: message.value?.access_token,
                refresh_token: message.value?.refresh_token,
              });
              if (db2Error) {
                console.error("DB2 auth callback error:", db2Error);
              } else if (db2Data?.session) {
                console.log("DB2 session set successfully:", db2Data.session.user?.email);
              }
            } catch (db2Err) {
              console.error("DB2 auth callback exception:", db2Err);
            }
          } catch (e) {
            console.error(e);
          }
          break;
        case "recorder.toggle": {
          const payload =
            typeof message.value === "object" && message.value !== null
              ? (message.value as { enabled?: boolean })
              : { enabled: Boolean(message.value) };
          const isEnabled = !!payload.enabled;
          const {
            state: nextMeetingState,
            wasMeetingControlled: isMeetingControlledSystem,
          } = updateMeetingControlledForSystemRecorder(
            meetingControlledSourcesRef.current,
            isEnabled
          );
          meetingControlledSourcesRef.current = nextMeetingState;

          if (!isEnabled) {
            if (!isMeetingControlledSystem && hasSystemTranscriptions()) {
              stop();
              append({
                id: Math.random().toString(),
                content: getSystemTranscriptionsText(),
                role: "user",
              });
              recordUserMessage(getSystemTranscriptionsText());
            }
            resetSystemTranscription();
            setShowSystemTranscriptPanel(false);
            if (isTranscriptionsEnabled) {
              try {
                if (transcriptionSessionManager.isRecording("system")) {
                  await transcriptionSessionManager.endSession("system");
                }
              } catch (sessionError) {
                console.error(
                  "[Renderer] Unable to end system session:",
                  sessionError
                );
              }
            }
          } else {
            resetSystemTranscription();
            if (!isMeetingControlledSystem) {
              setShowSystemTranscriptPanel(true);
            } else {
              setShowSystemTranscriptPanel(false);
            }
            if (isTranscriptionsEnabled) {
              try {
                if (!activeMeetingIdRef.current) {
                  const meeting = await window.api.meetings?.getActive();
                  const meetingId = meeting?.id ?? undefined;
                  setActiveMeetingId(meetingId ?? null);
                  activeMeetingIdRef.current = meetingId ?? null;
                }

                if (!transcriptionSessionManager.isRecording("system")) {
                  await transcriptionSessionManager.startSession(
                    "system",
                    getSelectedLanguage(),
                    activeMeetingIdRef.current ?? undefined
                  );
                }
              } catch (sessionError) {
                console.error(
                  "[Renderer] Unable to start system session:",
                  sessionError
                );
              }
            }
          }
          toggleSystemAudioRecording(isEnabled);
          break;
        }
        case "microphone.toggle":
          console.log(
            `[Renderer] Microphone toggle received, current state: ${isMicrophoneRecording}, functions available: start=${typeof startTranscription}, end=${typeof endTranscription}`
          );
          try {
            if (typeof startTranscription !== "function") {
              console.error(
                `[Renderer] startTranscription is not a function, it is:`,
                startTranscription
              );
              break;
            }
            if (typeof endTranscription !== "function") {
              console.error(
                `[Renderer] endTranscription is not a function, it is:`,
                endTranscription
              );
              break;
            }

            console.log(`[Renderer] Both functions are valid, proceeding...`);

            const requestedState =
              typeof message.value === "object" && message.value !== null
                ? (message.value as any).enabled
                : typeof message.value === "boolean"
                ? message.value
                : undefined;
            const shouldStart =
              requestedState === undefined
                ? !isMicrophoneRecording
                : requestedState;
            const meetingId =
              typeof message.value === "object" && message.value !== null
                ? (message.value as any).meetingId
                : null;
            const {
              state: nextMeetingState,
              isMeetingControlled: isMeetingControlledMicrophone,
            } = updateMeetingControlledForMicrophoneToggle(
              meetingControlledSourcesRef.current,
              shouldStart,
              meetingId
            );
            meetingControlledSourcesRef.current = nextMeetingState;

            if (shouldStart) {
              if (isMicrophoneRecording || isMicrophoneRecordingLoading) {
                console.log(
                  `[Renderer] Microphone already recording, no action taken`
                );
                break;
              }

              console.log(`[Renderer] Starting transcription...`);
              await startTranscription();
              console.log(`[Renderer] Transcription started`);
              if (isTranscriptionsEnabled) {
                try {
                  let meetingId =
                    (message.value as any)?.meetingId ??
                    activeMeetingIdRef.current;
                  if (!meetingId) {
                    const meeting = await window.api.meetings?.getActive();
                    meetingId = meeting?.id ?? null;
                    setActiveMeetingId(meetingId ?? null);
                  }

                  if (!transcriptionSessionManager.isRecording("microphone")) {
                    await transcriptionSessionManager.startSession(
                      "microphone",
                      getSelectedLanguage(),
                      meetingId ?? undefined
                    );
                  }
                } catch (sessionError) {
                  console.error(
                    "[Renderer] Unable to start microphone session:",
                    sessionError
                  );
                }
              }
            } else {
              if (!isMicrophoneRecording && !isMicrophoneRecordingLoading) {
                console.log(
                  `[Renderer] Microphone already stopped, no action taken`
                );
                break;
              }

              console.log(`[Renderer] Ending transcription...`);
              await endTranscription();
              console.log(`[Renderer] Transcription ended`);

              try {
                await new Promise((resolve) => setTimeout(resolve, 75));
              } catch (waitError) {
                console.error(
                  `[Renderer] Error while waiting to flush microphone transcript:`,
                  waitError
                );
              }

              try {
                if (hasMicTranscriptions()) {
                  const micTranscriptText = getMicTranscriptionsText()?.trim();
                  if (micTranscriptText) {
                    if (!isMeetingControlledMicrophone) {
                      stop();
                      append({
                        id: Math.random().toString(),
                        content: micTranscriptText,
                        role: "user",
                      });
                      recordUserMessage(micTranscriptText);
                    }
                  }
                }
              } catch (flushError) {
                console.error(
                  `[Renderer] Error appending microphone transcript:`,
                  flushError
                );
              } finally {
                setTimeout(() => {
                  try {
                    resetMicTranscription();
                    setShowMicTranscriptPanel(false);
                  } catch (resetError) {
                    console.error(
                      `[Renderer] Error resetting microphone transcript:`,
                      resetError
                    );
                  }
                }, 50);
              }
              if (isTranscriptionsEnabled) {
                try {
                  if (transcriptionSessionManager.isRecording("microphone")) {
                    await transcriptionSessionManager.endSession("microphone");
                  }
                } catch (sessionError) {
                  console.error(
                    "[Renderer] Unable to end microphone session:",
                    sessionError
                  );
                }
              }
            }
          } catch (error) {
            console.error(`[Renderer] Error in microphone.toggle handler:`, error);
          }
          break;
        case "meeting.source.toggle": {
          const value =
            typeof message.value === "object" && message.value !== null
              ? (message.value as {
                  source?: "microphone" | "system";
                  enabled?: boolean;
                  meetingId?: string | null;
                })
              : null;

          if (value?.source) {
            const enabled = !!value.enabled;
            if (value.source === "system") {
              meetingControlledSourcesRef.current.system = enabled;
              if (enabled) {
                resetSystemTranscription();
                setShowSystemTranscriptPanel(false);
              }
            } else if (value.source === "microphone") {
              meetingControlledSourcesRef.current.microphone = enabled;
              if (enabled) {
                resetMicTranscription();
                setShowMicTranscriptPanel(false);
              }
            }

            if (enabled && value.meetingId) {
              meetingControlledSourcesRef.current.meetingId = value.meetingId;
              setActiveMeetingId(value.meetingId);
              activeMeetingIdRef.current = value.meetingId;
            } else if (
              !meetingControlledSourcesRef.current.system &&
              !meetingControlledSourcesRef.current.microphone
            ) {
              meetingControlledSourcesRef.current.meetingId = null;
              setActiveMeetingId(null);
              activeMeetingIdRef.current = null;
            }
          }

          break;
        }
        case "screenshot.upload":
          stop();
          {
            const defaultMessage =
              JSON.parse(localStorage.getItem("defaultScreenshotMessage")) ??
              DEFAULT_SCREENSHOT_MESSAGE;
            const attachment = {
              imageUrl: message.value?.thumbnailUrl,
            };
            append(
              {
                id: Math.random().toString(),
                content: defaultMessage,
                role: "user",
                data: attachment,
              },
              {
                data: attachment,
              }
            );
            recordUserMessage(defaultMessage, attachment, {
              type: "screenshot.upload",
              attachment,
            });
          }
          // Manually decrement trial message count for screenshots
          decrementTrialMessageCount();
          break;
        case "clipboard.paste":
          if (message.value && message.value.trim()) {
            stop();
            append({
              id: Math.random().toString(),
              content: message.value,
              role: "user",
            });
            recordUserMessage(message.value);
          }
          break;
        case "chat.reset":
          resetChatSessions();
          void resetChatSessionState();
          break;
        case "chat.scroll":
          if (message.value === "up") {
            chatContainerRef?.current?.scrollBy({
              top: -SCROLL_INTERVAL,
              behavior: "smooth",
            });
          } else if (message.value === "down") {
            chatContainerRef?.current?.scrollBy({
              top: SCROLL_INTERVAL,
              behavior: "smooth",
            });
          }
          break;
        case "transcription.update":
          if (!meetingControlledSourcesRef.current.system) {
            handleSystemTranscript(message.value);
          }
          break;
        case "input.submit":
          // Handle Command+Shift+O shortcut to submit the input
          const submitButton = document.querySelector('button[type="submit"]');
          if (submitButton) {
            (submitButton as HTMLButtonElement).click();
          }
          break;
        case "unified-recording.started":
          console.log("[App] Unified recording started:", message.value);
          setIsUnifiedRecording(true);
          setUnifiedRecordingSessionId(message.value?.sessionId ?? null);
          if (message.value?.meetingId) {
            setActiveMeetingId(message.value.meetingId);
            activeMeetingIdRef.current = message.value.meetingId;
          }
          break;
        case "unified-recording.stopped":
          console.log("[App] Unified recording stopped:", message.value);
          setIsUnifiedRecording(false);
          setUnifiedRecordingSessionId(null);
          break;
        case "microphone.start":
          // Handle unified recording starting the microphone
          console.log("[App] Microphone start request from unified recording:", message.value);
          if (typeof startTranscription === "function") {
            try {
              await startTranscription();
              console.log("[App] Microphone started for unified recording");
            } catch (error) {
              console.error("[App] Failed to start microphone for unified recording:", error);
            }
          }
          break;
        case "microphone.stop":
          // Handle unified recording stopping the microphone
          console.log("[App] Microphone stop request from unified recording");
          if (typeof endTranscription === "function") {
            try {
              await endTranscription();
              console.log("[App] Microphone stopped for unified recording");
            } catch (error) {
              console.error("[App] Failed to stop microphone for unified recording:", error);
            }
          }
          break;
        default:
          break;
      }
      } catch (error) {
        console.error('[Renderer] Fatal error in message handler:', error);
        // Don't let errors crash the entire app
      }
    };
  }, [
    stop,
    append,
    supabase,
    hasSystemTranscriptions,
    getSystemTranscriptionsText,
    resetSystemTranscription,
    toggleSystemAudioRecording,
    startTranscription,
    endTranscription,
    hasMicTranscriptions,
    getMicTranscriptionsText,
    resetMicTranscription,
    decrementTrialMessageCount,
    resetChatSessions,
    chatContainerRef,
    handleSystemTranscript,
    isMicrophoneRecording,
    isMicrophoneRecordingLoading,
    getSelectedLanguage,
    transcriptionSessionManager,
    isTranscriptionsEnabled,
    recordUserMessage,
  ]);

  // Set up the event listener once, but add proper cleanup
  useEffect(() => {
    if (window.api && !wasCalled.current) {
      wasCalled.current = true;

      checkForPermissions();

      const messageHandler = async (message) => {
        // Call the current version of the handler from the ref
        if (messageHandlerRef.current) {
          console.log("calling message handler");
          await messageHandlerRef.current(message);
        }
      };

      window?.api?.on("message", messageHandler);

      // Return cleanup function to remove the listener
      return () => {
        if (window?.api?.off) {
          window.api.off("message", messageHandler);
        }
      };
    }

    // If we didn't set up a listener, still provide a no-op cleanup
    return () => {};
  }, []);

  let screenPickerOptions = {
    system_preferences: false,
  };

  const getDisplayMedia = async () => {
    if (window.api.isOSX()) {
      screenPickerOptions.system_preferences = true;
    }
    setIsLoadingScreens(true);
    setScreens([]);

    return new Promise(async (resolve, reject) => {
      if (!hasScreenAccess) {
        await window.api.openScreenSecurity();
      }

      try {
        const sources = await window.api.getScreenSources();
        try {
          setScreens(sources);
          resolve(sources);
          setIsLoadingScreens(false);
        } catch (err) {
          setIsLoadingScreens(false);
          reject(err);
        }
      } catch (err) {
        reject(err);
        console.error(err);
        setIsLoadingScreens(false);
      }
    });
  };

  useEffect(() => {
    if (!isSubscriptionLoading && !isSessionLoading) {
      setTimeout(() => setShowSpinner(false), 300); // Delay to match transition duration
    }
  }, [isSubscriptionLoading, isSessionLoading]);

  if (showSpinner) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner message="Reticulating splines..." />
      </div>
    );
  }
  // short circuit to landing if user is not logged in
  // BYPASSED: Removed trial message count check for unlimited usage
  if (
    !session
    // (!subscription && !(trialStarted && !trialEnded && trialMessageCount > 0))
  ) {
    return (
      <Landing
        hasScreenAccess={hasScreenAccess}
        requestScreenAccess={async () => {
          await window.api.openScreenSecurity();
          checkForPermissions();
        }}
      />
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        session={session}
        isNewVersionAvailable={!!updateLink}
        supabase={supabase}
        hashedEmail={hashedEmail}
        getDisplayMedia={getDisplayMedia}
        setScreenOpen={() => setIsScreenOpen(true)}
        selectedScreen={screen ? { name: "Selected Screen" } : undefined}
        isSystemAudioRecording={isSystemAudioRecording}
        isMicrophoneRecording={isMicrophoneRecording}
        isMicrophoneRecordingLoading={isMicrophoneRecordingLoading}
      />
      <SidebarInset className="overflow-y-auto h-svh">
        {activeTab === TABS.HOME && (
          <HomePage
            selectedScreen={screen ? { name: "Selected Screen" } : null}
            onSelectScreen={() => {
              getDisplayMedia();
              setIsScreenOpen(true);
            }}
            isMicrophoneRecording={isMicrophoneRecording}
            isSystemAudioRecording={isSystemAudioRecording}
          />
        )}
        {activeTab === TABS.SETTINGS && (
          <Settings
            audioInputDevices={audioInputDevices}
            selectedAudioDevice={selectedAudioDevice}
            setSelectedAudioDevice={setSelectedAudioDevice}
            session={session}
            supabase={supabase}
            updateLink={updateLink}
            resetChatSessions={resetChatSessions}
          />
        )}
        {activeTab === TABS.MEETINGS && <MeetingsView />}
        {activeTab === TABS.HISTORY && <ChatHistoryView />}

        {activeTab === TABS.CHAT && (
          <ChatInterface
            chatContainerRef={chatContainerRef}
            primaryMessages={primaryMessages}
            secondaryMessages={secondaryMessages}
            comparisonEnabled={shouldUseSecondary}
            primaryModelLabel={primaryModelLabel}
            secondaryModelLabel={secondaryModelLabel}
            isLoading={isLoading}
            isPrimaryLoading={isPrimaryLoading}
            isSecondaryLoading={isSecondaryLoading}
            supabase={supabase}
            session={session}
            getDisplayMedia={getDisplayMedia}
            setScreenOpen={() => setIsScreenOpen(true)}
            error={error}
            secondaryError={shouldUseSecondary ? secondaryError : null}
            parseError={parseError}
            input={input}
            handleInputChange={handleInputChange}
            stop={stop}
            handleSubmit={handleSubmitWithHistory}
            subscription={subscription}
            trialEnded={trialEnded}
            trialMessageCount={trialMessageCount}
            micTranscript={micTranscriptUI}
            systemTranscript={systemTranscriptUI}
            micTranscriptions={micTranscriptionsUI}
            systemTranscriptions={systemTranscriptionsUI}
            showMicTranscript={showMicTranscriptPanel}
            showSystemTranscript={showSystemTranscriptPanel}
          />
        )}
        <ScreenPickerDialog
          isOpen={isScreenOpen}
          handleOpenChange={handleScreenOpenChange}
          screens={screens}
          selectedScreen={screen}
          setScreen={setScreen}
          isLoadingScreens={isLoadingScreens}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
