'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/SupabaseProvider';
import { useGoogleFeatureFlags } from '@/hooks/useFeatureFlags';

export default function LoginPage() {
  const router = useRouter();
  const { supabase, session, loading, signInWithGoogle } = useSupabase();
  const { flags: featureFlags, loading: flagsLoading } = useGoogleFeatureFlags();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && session) {
      router.push('/dashboard');
    }
  }, [session, loading, router]);

  // Check for OAuth errors in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setOauthLoading(true);

    try {
      await signInWithGoogle();
      setInfo('Redirecting to Google...');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);

    try {
      // LOGIN: DB2 only (web session)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      setInfo('Logged in successfully! Redirecting...');

      // Redirect after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch (authError: unknown) {
      const errorMessage = (authError as { message?: string })?.message;
      setError(errorMessage ?? 'Login failed. Please check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen hero-v2 flex flex-col">

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-medium text-gray-900 tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-base text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            {/* Google OAuth Button */}
            {flagsLoading ? (
              <div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse" />
            ) : featureFlags.signInEnabled ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading || loading}
                className="w-full bg-white border border-gray-300 text-gray-900 font-medium px-4 py-3 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {oauthLoading ? (
                  <span>Redirecting to Google...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full bg-gray-50 border border-gray-200 text-gray-500 font-medium px-4 py-3 rounded-lg text-center text-sm">
                Google sign-in temporarily unavailable. Please use email/password.
              </div>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Error and Info Messages */}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {info && <p className="text-sm text-green-600">{info}</p>}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full purple-gradient-button rounded-[10px] flex items-center justify-center gap-2 text-white font-medium text-[16px] tracking-[-0.13px] px-5 py-3.5 relative overflow-hidden mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute top-0 left-0 z-20 h-full w-full blur-[1px]" aria-hidden="true">
                  <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full"></span>
                </span>
                <div className="absolute -top-4 -left-12 h-32 w-4 rotate-6 bg-white/80 blur-md" />
                <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
              </button>
            </form>

            {/* Sign Up Link */}
            <p className="mt-8 text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer provided globally by layout */}
    </div>
  );
}

