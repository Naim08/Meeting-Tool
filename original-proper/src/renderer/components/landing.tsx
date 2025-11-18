import AuthUI from "./AuthUI";
import React, { useEffect, useState } from "react";
import { useSupabase, MAX_TRIAL_MESSAGES } from "../supabase-provider";
import { getServerRoot, getStripe } from "../lib/utils";
import ProductCard from "./product-card";
import { Price } from "../types";
import { cn } from "@/lib/utils";

// Global test mode override - change this to test different states
// Options:
//   null - normal logic (default)
//   'permissions' - show permission cards (screen recording only)
//   'auth' - show authentication UI
//   'subscription' - show subscription/pricing cards and trial section
const TEST_MODE_OVERRIDE: string | null = null;

const Landing = ({
  hasScreenAccess,
  requestScreenAccess,
}: {
  hasScreenAccess: boolean;
  requestScreenAccess: () => void;
}) => {
  const {
    supabase,
    session,
    subscription,
    trialStarted,
    trialEnded,
    trialMessageCount,
    setTrialStarted: handleStartTrial,
  } = useSupabase();

  const [products, setProducts] = useState([]);
  const surfaceCardClass =
    "brand-surface mt-8 w-full rounded-2xl p-7 shadow-[0_40px_120px_rgba(8,12,32,0.35)] text-left text-slate-900";
  const primaryCtaClass = "purple-gradient-button text-sm";

  // Override conditions based on test mode
  const getDisplayConditions = () => {
    if (TEST_MODE_OVERRIDE === "permissions") {
      return {
        showPermissions: true,
        showAuth: false,
        showSubscription: false,
      };
    }
    if (TEST_MODE_OVERRIDE === "auth") {
      return {
        showPermissions: false,
        showAuth: true,
        showSubscription: false,
      };
    }
    if (TEST_MODE_OVERRIDE === "subscription") {
      return {
        showPermissions: false,
        showAuth: false,
        showSubscription: true,
      };
    }

    // Normal logic
    return {
      showPermissions: !hasScreenAccess,
      showAuth: hasScreenAccess && !session,
      showSubscription: hasScreenAccess && session && !subscription,
    };
  };

  const { showPermissions, showAuth, showSubscription } =
    getDisplayConditions();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${getServerRoot()}/api/products`, {
          method: "GET",
        });
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  const handleBuySubscription = async (price: Price) => {
    //post to api/create-checkout-session
    const response = await fetch(
      `${getServerRoot()}/api/create-checkout-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: `${session?.access_token}`,
          refresh_token: `${session?.refresh_token}`,
        },
        body: JSON.stringify({
          source: "app",
          price: price,
        }),
      }
    );
    if (!response.ok) {
      console.error("Error creating checkout session");
      return;
    }
    try {
      const data = await response.json();
      const stripe = await getStripe();
      stripe?.redirectToCheckout({
        sessionId: data.sessionId,
      });
    } catch (error) {
      console.error("Error redirecting to checkout", error);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto hero-brand-bg text-slate-100 transition-colors">
      <div className="relative mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(91,91,233,0.55),rgba(9,11,22,0))] blur-3xl"></div>
          <div className="absolute bottom-6 right-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(74,129,255,0.35),rgba(9,11,22,0))] blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <h1 className="font-display text-4xl font-medium tracking-tight text-white sm:text-5xl">
            Interview Copilot
          </h1>
          <div className="gradient-divider"></div>
          <p className="max-w-2xl font-forma text-base leading-relaxed text-slate-200/90 sm:text-lg">
            Bring the Cluely interview experience into a floating desktop assistant with the same polish and energy as our website.
          </p>

          {showPermissions && (
            <div className={surfaceCardClass}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <h3 className="font-forma text-lg font-semibold text-slate-900">
                    Screen Recording Permission
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Interview Copilot needs to capture your screen. Grant access and restart the app if prompted.
                  </p>
                </div>
                <button
                  onClick={requestScreenAccess}
                  className={primaryCtaClass}
                >
                  Allow Screen Recording
                </button>
              </div>
            </div>
          )}

          {showAuth && (
            <div
              className={cn(
                surfaceCardClass,
                "shadow-[0_48px_140px_rgba(8,12,32,0.4)]"
              )}
            >
              <AuthUI supabase={supabase} />
            </div>
          )}

          {showSubscription && (
            <>
              <div className={cn(surfaceCardClass, "rounded-3xl p-8")}>
                <div className="mb-6 text-center">
                  <h2 className="font-forma text-2xl font-semibold text-slate-900">
                    No Active Subscription
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Choose a plan to unlock the full Interview Copilot experience.
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onBuy={handleBuySubscription}
                    />
                  ))}
                  {!products.length && (
                    <a
                      href="https://interviewsolver.com/pricing"
                      target="_blank"
                      className={cn(primaryCtaClass, "w-full justify-center")}
                    >
                      View Pricing
                    </a>
                  )}
                </div>

                <div className="my-6 flex items-center justify-center text-sm text-slate-500">
                  <div className="h-px w-1/3 bg-slate-200"></div>
                  <p className="mx-4 font-medium">or</p>
                  <div className="h-px w-1/3 bg-slate-200"></div>
                </div>

                <div className="flex flex-col items-start justify-between gap-6 text-left sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <h3 className="font-forma text-lg font-semibold text-slate-900">
                      Start a free trial
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {trialStarted && (trialEnded || trialMessageCount <= 0)
                        ? "Your free trial has ended."
                        : `Explore Interview Copilot with ${MAX_TRIAL_MESSAGES.toLocaleString()} complimentary messages.`}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      disabled={
                        trialStarted && (trialEnded || trialMessageCount <= 0)
                      }
                      onClick={handleStartTrial}
                      className={cn(
                        primaryCtaClass,
                        (trialStarted && (trialEnded || trialMessageCount <= 0)) &&
                          "cursor-not-allowed opacity-60"
                      )}
                    >
                      Start Free Trial
                    </button>
                  </div>
                </div>
              </div>

              <button
                disabled={!session}
                onClick={() => {
                  try {
                    supabase.auth.signOut();
                    Object.keys(localStorage).forEach((key) => {
                      if (key.startsWith("sb-")) {
                        localStorage.removeItem(key);
                      }
                    });
                  } catch (error) {
                    console.error(error);
                  }
                }}
                className={cn(
                  "mt-6 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                  !session && "cursor-not-allowed opacity-50"
                )}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Landing;
