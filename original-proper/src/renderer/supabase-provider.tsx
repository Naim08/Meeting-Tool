import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { createClient } from "@supabase/supabase-js";
import useLocalStorage from "./hooks/use-local-storage";
// import * as Sentry from "@sentry/electron/renderer";

enum EVENT_TYPES {
  MESSAGE = "message",
  STREAMING_MESSAGE = "streaming_message",
  ACK = "ack",
  JOIN = "join", // presence not working from interview-web
  CHAT_MESSAGE = "chat_message",
}
const supabase = createClient(
  "https://mthkbfdqqjvremvijfed.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGtiZmRxcWp2cmVtdmlqZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc1MjA1MzUsImV4cCI6MjAyMzA5NjUzNX0.pvjf-iMiPrfjKMkoFB_DHKePQulJdyEIuJl37rced-w"
);

export const MAX_TRIAL_MESSAGES = 999999; // Unlimited trial messages

const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8).toUpperCase();
};

const sendPlausibleEvent = async (event, session) => {
  fetch("https://plausible.io/api/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: event,
      url: `${event}/${session?.user?.email}`,
      domain: "app.interviewsolver",
    }),
  });
};

function usePollingEffect(
  asyncCallback,
  dependencies = [] as any[],
  {
    interval = 10_000, // 10 seconds,
    onCleanUp = () => {},
  } = {}
) {
  const timeoutIdRef = useRef(null);
  useEffect(() => {
    let _stopped = false;
    // Side note: preceding semicolon needed for IIFEs.
    (async function pollingCallback() {
      try {
        await asyncCallback();
      } finally {
        // Set timeout after it finished, unless stopped
        timeoutIdRef.current =
          !_stopped && setTimeout(pollingCallback, interval);
      }
    })();
    // Clean up if dependencies change
    return () => {
      _stopped = true; // prevent racing conditions
      clearTimeout(timeoutIdRef.current);
      onCleanUp();
    };
  }, [...dependencies, interval]);
}

export async function getSubscription(client, handler?) {
  try {
    handler && handler(true);
    const { data, error } = await client
      .from("subscriptions")
      .select("*, prices(*, products(*))")
      .in("status", ["trialing", "active", "canceled"])
      .filter("current_period_end", "gte", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    handler && handler(false);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  } finally {
    handler && handler(false);
  }
}

export async function setUserTrialStart() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("users")
      .update({
        trial_start: new Date().toISOString(),
        trial_message_count: MAX_TRIAL_MESSAGES,
      })
      .eq("id", session?.user?.id)
      .select();
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export async function setUserTrialEnd() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("users")
      .update({
        trial_end: new Date().toISOString(),
        trial_message_count: 0,
      })
      .eq("id", session?.user?.id)
      .select();
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export async function updateTrialMessageCount(count) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("users")
      .update({ trial_message_count: count })
      .eq("id", session?.user?.id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating trial message count:", error);
    return null;
  }
}

export async function getUserTrialDetails(client) {
  try {
    const { data: users } = await client.from("users").select();
    return users?.length && users[0];
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

const Context = createContext(undefined);

export default function SupabaseProvider({ children }: { children: any }) {
  const [session, setSession] = useState(null);
  const [subscription, _setSubscription] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [trialStarted, _setTrialStarted] = useState(false);
  const [trialEnded, setTrialEnded] = useState(false);
  const [trialMessageCount, setTrialMessageCount] =
    useState(MAX_TRIAL_MESSAGES);
  // Use useRef for broadcastChannel to avoid unnecessary re-renders
  const broadcastChannelRef = useRef(null);
  const [broadcastClients, setBroadcastClients] = useState([]);
  const [hashedEmail, setHashedEmail] = useState("");
  const chatMessageHandlerRef = useRef(undefined);

  // Move setChatMessageHandler outside of the component
  const setChatMessageHandler = (handler: (message: string) => void) => {
    chatMessageHandlerRef.current = handler;
  };
  const trialStartedRef = React.useRef(trialStarted);
  const setTrialStarted = (data) => {
    trialStartedRef.current = data;
    _setTrialStarted(data);
  };

  const subscriptionRef = React.useRef(subscription);
  const setSubscription = (data) => {
    subscriptionRef.current = data;
    _setSubscription(data);
  };

  useEffect(() => {
    const {
      data: { subscription: authStateSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsSessionLoading(false);
      if (session?.user?.email) {
        setHashedEmail(simpleHash(session.user.email));
      }
      if (session?.user?.email) {
        // Sentry.setUser({ email: session.user.email });
      }
      console.log("auth state change", session);
    });

    return () => authStateSubscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hashedEmail) return;
    const channel = supabase.channel(`client-messages-${hashedEmail}`);
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        return null;
      }
      broadcastChannelRef.current = channel;
      // Whenever a new client from the web app subscribes to the channel, add them to the list
      // This triggers the useEffect in App.tsx to call broadcastMessage to send the existing messages to the new client
      channel.on("broadcast", { event: EVENT_TYPES.JOIN }, (payload) => {
        setBroadcastClients((prev) => [...prev, payload]);
        setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: EVENT_TYPES.ACK,
          });
        }, 1000);
      });

      // Add listener for chat messages
      channel.on(
        "broadcast",
        { event: EVENT_TYPES.CHAT_MESSAGE },
        (payload) => {
          if (chatMessageHandlerRef.current) {
            chatMessageHandlerRef.current(payload?.payload?.content);
          }
        }
      );
    });

    return () => {
      channel.unsubscribe();
    };
  }, [hashedEmail]);

  useEffect(() => {
    (async () => {
      if (session) {
        await getUserTrialDetails(supabase).then((data) => {
          if (!!data?.trial_start) {
            setTrialStarted(true);
          }
          if (!!data?.trial_end) {
            setTrialEnded(true);
          }
          if (data?.trial_message_count !== undefined) {
            setTrialMessageCount(data.trial_message_count);
          }
        });
        await getSubscription(supabase, setIsSubscriptionLoading).then(
          (subscription) => {
            setSubscription(subscription);
          }
        );
      }
    })();
  }, [session, setIsSubscriptionLoading]);

  // Poll for subscription state changes
  usePollingEffect(
    async () => {
      if (!session) return;
      if (subscription) return;
      await getSubscription(supabase, setIsSessionLoading).then(
        (subscription) => {
          setSubscription(subscription);
        }
      );
    },
    [session, subscription, setIsSubscriptionLoading],
    { interval: 6000 }
  );

  const handleStartTrial = async () => {
    await setUserTrialStart();
    setTrialStarted(true);
    setTrialMessageCount(MAX_TRIAL_MESSAGES);
    sendPlausibleEvent("trial_started", session);
  };

  const handleEndTrial = async () => {
    await setUserTrialEnd();
    setTrialEnded(true);
    setTrialMessageCount(0);
    sendPlausibleEvent("trial_ended", session);
  };

  const decrementTrialMessageCount = async (_) => {
    if (!trialStartedRef.current) {
      await handleStartTrial();
    }
    sendPlausibleEvent("chat_message", session);
    // BYPASSED: Unlimited trial messages - do not decrement or check count
    console.log("decrementTrialMessageCount (bypassed)", trialMessageCount);
    // if (!subscriptionRef.current && trialMessageCount > 0) {
    //   console.log("decrementTrialMessageCount", trialMessageCount);
    //   const newCount = trialMessageCount - 1;
    //   await updateTrialMessageCount(newCount);
    //   setTrialMessageCount(newCount);
    //   if (newCount === 0) {
    //     await handleEndTrial();
    //   }
    // }
  };

  const broadcastStreamingMessage = (message) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: EVENT_TYPES.STREAMING_MESSAGE,
        payload: message,
      });
    }
  };

  const broadcastMessage = (messages) => {
    if (!broadcastChannelRef.current) debugger;
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: EVENT_TYPES.MESSAGE,
        payload: { messages },
      });
    }
  };

  return (
    <Context.Provider
      value={{
        supabase,
        session,
        subscription,
        isSessionLoading,
        isSubscriptionLoading,
        trialStarted,
        trialEnded,
        setTrialStarted: handleStartTrial,
        setTrialEnded: handleEndTrial,
        trialMessageCount,
        decrementTrialMessageCount,
        broadcastStreamingMessage,
        broadcastMessage,
        broadcastClients,
        hashedEmail,
        setChatMessageHandler,
      }}
    >
      <>{children}</>
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }

  return context;
};
