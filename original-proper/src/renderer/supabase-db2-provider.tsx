import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Session } from "@supabase/supabase-js";
import { supabaseDb2 } from "./supabase-db2-client";
import { createClient } from "@supabase/supabase-js";

// DB1 - Desktop sync database (existing)
// Create a separate DB1 client for this provider
const supabaseDb1 = createClient(
  "https://mthkbfdqqjvremvijfed.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGtiZmRxcWp2cmVtdmlqZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc1MjA1MzUsImV4cCI6MjAyMzA5NjUzNX0.pvjf-iMiPrfjKMkoFB_DHKePQulJdyEIuJl37rced-w"
);

// Fixed password for OAuth users in DB1 (auto-provisioning)
const DEFAULT_DB1_PASSWORD = "150264123";

interface Db2ContextValue {
  supabaseDb2: typeof supabaseDb2;
  supabaseDb1: typeof supabaseDb1;
  db2Session: Session | null;
  db1Session: Session | null;
  isAuthSynced: boolean;
  isLoading: boolean;
  syncDb1FromDb2: (
    email: string,
    password?: string,
    isOAuth?: boolean
  ) => Promise<void>;
}

const Db2Context = createContext<Db2ContextValue | undefined>(undefined);

export function SupabaseDb2Provider({ children }: { children: React.ReactNode }) {
  const [db2Session, setDb2Session] = useState<Session | null>(null);
  const [db1Session, setDb1Session] = useState<Session | null>(null);
  const [isAuthSynced, setIsAuthSynced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const syncInProgressRef = useRef(false);

  // Function to sync DB1 authentication from DB2 session
  const syncDb1FromDb2 = async (
    email: string,
    password?: string,
    isOAuth: boolean = false
  ) => {
    if (syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;

    try {
      // Determine the password to use
      const db1Password = isOAuth ? DEFAULT_DB1_PASSWORD : password;

      if (!db1Password) {
        console.error("No password provided for DB1 sync");
        return;
      }

      console.log(`[DB2Provider] Starting DB1 sync for: ${email}`);

      // Try to sign in to DB1 first
      const { data: signInData, error: signInError } =
        await supabaseDb1.auth.signInWithPassword({
          email,
          password: db1Password,
        });

      if (signInError) {
        // Check if the error indicates the user doesn't exist
        if (
          signInError.message.includes("Invalid login") ||
          signInError.message.includes("Email not confirmed") ||
          signInError.message.includes("Invalid password")
        ) {
          console.log(`[DB2Provider] User not found in DB1, creating account: ${email}`);

          // Create the account in DB1
          const { data: signUpData, error: signUpError } =
            await supabaseDb1.auth.signUp({
              email,
              password: db1Password,
              options: {
                emailRedirectTo: undefined, // No email confirmation needed
              },
            });

          if (signUpError) {
            console.error("[DB2Provider] Failed to create user in DB1:", signUpError);
            return;
          }

          // Wait for user creation
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Try to sign in after creation
          const { data: retryData, error: retryError } =
            await supabaseDb1.auth.signInWithPassword({
              email,
              password: db1Password,
            });

          if (retryError) {
            console.error("[DB2Provider] Failed to sign in after creating user:", retryError);
            // Still consider it synced if we created the user
            if (signUpData?.user) {
              setDb1Session(signUpData.session);
              setIsAuthSynced(true);
              console.log(`[DB2Provider] User created in DB1: ${email}`);
            }
            return;
          }

          setDb1Session(retryData.session);
          setIsAuthSynced(true);
          console.log(`[DB2Provider] User created and signed in to DB1: ${email}`);
        } else {
          console.error("[DB2Provider] DB1 sign in error:", signInError);
        }
      } else {
        // Sign in succeeded
        setDb1Session(signInData.session);
        setIsAuthSynced(true);
        console.log(`[DB2Provider] Signed in to DB1: ${email}`);
      }
    } catch (error) {
      console.error("[DB2Provider] Error syncing DB1:", error);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  // Initialize sessions and subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // Get initial DB2 session
      const {
        data: { session: initialDb2Session },
      } = await supabaseDb2.auth.getSession();

      if (isMounted) {
        setDb2Session(initialDb2Session);

        // Also get initial DB1 session
        const {
          data: { session: initialDb1Session },
        } = await supabaseDb1.auth.getSession();

        setDb1Session(initialDb1Session);
        setIsLoading(false);
      }
    };

    initialize();

    // Subscribe to DB2 auth state changes
    const {
      data: { subscription: db2Subscription },
    } = supabaseDb2.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log("[DB2Provider] DB2 auth state change:", event, session?.user?.email);
      setDb2Session(session);

      // When DB2 session is established, sync to DB1
      if (session?.user?.email && event === "SIGNED_IN") {
        // For OAuth users, use the fixed password
        // The provider of the session indicates OAuth
        const isOAuth =
          session.user.app_metadata?.provider === "google" ||
          session.user.app_metadata?.providers?.includes("google");

        await syncDb1FromDb2(session.user.email, undefined, isOAuth);
      } else if (event === "SIGNED_OUT") {
        // Sign out of DB1 when signing out of DB2
        await supabaseDb1.auth.signOut();
        setDb1Session(null);
        setIsAuthSynced(false);
      }
    });

    // Subscribe to DB1 auth state changes
    const {
      data: { subscription: db1Subscription },
    } = supabaseDb1.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      console.log("[DB2Provider] DB1 auth state change:", event, session?.user?.email);
      setDb1Session(session);
    });

    return () => {
      isMounted = false;
      db2Subscription.unsubscribe();
      db1Subscription.unsubscribe();
    };
  }, []);

  const value: Db2ContextValue = {
    supabaseDb2,
    supabaseDb1,
    db2Session,
    db1Session,
    isAuthSynced,
    isLoading,
    syncDb1FromDb2,
  };

  return <Db2Context.Provider value={value}>{children}</Db2Context.Provider>;
}

export function useSupabaseDb2() {
  const context = useContext(Db2Context);

  if (context === undefined) {
    throw new Error("useSupabaseDb2 must be used inside SupabaseDb2Provider");
  }

  return context;
}

export { supabaseDb2, supabaseDb1 };
