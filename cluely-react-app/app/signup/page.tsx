'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseDb1 } from '@/lib/supabaseDb1Client';
import { useSupabase } from '@/context/SupabaseProvider';
import { useGoogleFeatureFlags } from '@/hooks/useFeatureFlags';

const USER_EXISTS_MESSAGE = "User already registered";

export default function SignupPage() {
  const router = useRouter();
  const { supabase, session, loading, signInWithGoogle } = useSupabase();
  const { flags: featureFlags, loading: flagsLoading } = useGoogleFeatureFlags();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && session) {
      router.push('/');
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up with Google';
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

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      // ATOMIC SIGNUP: DB1 first, then DB2
      
      // Step 1: Try to signup to DB1 (Desktop sync database)
      if (supabaseDb1) {
        const { error: db1Error } = await supabaseDb1.auth.signUp({
          email,
          password,
        });

        // If DB1 fails with anything OTHER than "user already exists", abort entire signup
        if (db1Error && db1Error.message !== USER_EXISTS_MESSAGE) {
          console.error('DB1 signup failed:', db1Error);
          throw new Error(`Desktop sync failed: ${db1Error.message}. Please try again.`);
        }

        // If user already exists in DB1, that's OK - continue to DB2
        if (db1Error && db1Error.message === USER_EXISTS_MESSAGE) {
          console.log('User already exists in DB1, continuing to DB2...');
        }
      } else {
        // If DB1 client not available, abort
        throw new Error('Desktop sync is unavailable. Please contact support.');
      }

      // Step 2: If DB1 succeeded or user exists, proceed to DB2 signup
      const { data: signUpData, error: db2Error } = await supabase.auth.signUp({
        email,
        password,
      });

      // If DB2 fails, abort entire signup
      if (db2Error) {
        console.error('DB2 signup failed:', db2Error);
        throw db2Error;
      }

      // Step 3: Auto-login to DB2 if email confirmation not required
      if (!signUpData?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }

      // Step 4: Initialize trial for the new user
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userId = currentSession?.user?.id;

      if (userId && email) {
        // Wait a moment for the database trigger to create the user row
        await new Promise(resolve => setTimeout(resolve, 1000));

        const trialData = {
          trial_start: new Date().toISOString(),
          trial_message_count: 10,
        };

        // Initialize trial in DB2 (web database) using update
        const { error: db2UpdateError } = await supabase
          .from('users')
          .update(trialData)
          .eq('id', userId);

        if (db2UpdateError) {
          console.error('Failed to initialize trial in DB2:', {
            error: db2UpdateError,
            message: db2UpdateError.message,
            details: db2UpdateError.details,
            hint: db2UpdateError.hint,
            code: db2UpdateError.code
          });
          // Don't block signup for trial initialization failure
        } else {
          console.log('✅ Trial initialized in DB2:', { userId, ...trialData });
        }

        // Initialize trial in DB1 (desktop database)
        if (supabaseDb1) {
          const { error: db1UpdateError } = await supabaseDb1
            .from('users')
            .update(trialData)
            .eq('email', email); // Use email as DB1 may have different user ID

          if (db1UpdateError) {
            console.error('Failed to initialize trial in DB1:', db1UpdateError);
            // Don't block signup for trial initialization failure
          } else {
            console.log('✅ Trial initialized in DB1:', { email, ...trialData });
          }
        }
      }

      setInfo('Account created successfully! Redirecting...');
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);

    } catch (authError: unknown) {
      const errorMessage = (authError as { message?: string })?.message;
      setError(errorMessage ?? 'Signup failed. Please try again.');
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
                Create your account
              </h1>
              <p className="mt-2 text-base text-gray-600">
                Start your free trial today
              </p>
            </div>

            {/* Google OAuth Button */}
            {flagsLoading ? (
              <div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse" />
            ) : featureFlags.signUpEnabled ? (
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
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full bg-gray-50 border border-gray-200 text-gray-500 font-medium px-4 py-3 rounded-lg text-center text-sm">
                Google registration temporarily unavailable. Please use email registration.
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                />
              </div>

              {/* Terms and Privacy */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-700">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy-policy" className="font-medium text-blue-600 hover:text-blue-700">
                    Privacy Policy
                  </Link>
                </label>
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
                <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>

            {/* Login Link */}
            <p className="mt-8 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer provided globally by layout */}
    </div>
  );
}

