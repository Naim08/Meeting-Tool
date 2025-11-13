"use client";

import Link from "next/link";
import Image from "next/image";
import { useSupabase } from "@/context/SupabaseProvider";

export default function SiteHeader() {
  const { session, signOut } = useSupabase();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="absolute top-0 z-[9999] w-full pt-2.5">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-b-lg pr-5 text-white md:pr-8">
        <div className="flex items-center justify-center gap-1 rounded-2xl px-3 py-1 lg:gap-7">
          <Link href="/" className="inline-flex shrink-0 translate-y-0.5 items-center justify-center rounded">
            <Image src="/interview_copilot_logo_dark_transparent.png" alt="Interview Copilot" width={320} height={96} className="shrink-0 h-16 md:h-20 w-auto" priority />
            <span className="sr-only">Interview Copilot</span>
          </Link>
          <nav className="hidden items-center md:flex">
            <Link href="/pricing" className="flex items-center justify-center px-3.5 py-2 text-sm font-medium text-white focus:underline">
              Pricing
            </Link>
            <Link href="/blog" className="flex items-center justify-center px-3.5 py-2 text-sm font-medium text-white focus:underline">
              Blog
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden items-center text-sm text-white/80 md:flex">
                {session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="hidden items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white transition-colors md:flex focus:underline hover:text-white/80"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white transition-colors md:flex focus:underline">
                Login
              </Link>
              <Link href="/signup" className="purple-gradient-button relative inline-flex items-center gap-1.5 overflow-hidden rounded-[10px] px-4 py-2.5 text-sm font-medium text-white">
                <span className="absolute inset-0 z-20 blur-[1px]" aria-hidden="true">
                  <span className="blurred-border absolute -inset-px z-20 h-full w-full" />
                </span>
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
