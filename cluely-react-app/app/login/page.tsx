'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/SupabaseProvider';

export default function LoginPage() {
  const router = useRouter();
  const { supabase, session, loading } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && session) {
      router.push('/');
    }
  }, [session, loading, router]);

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
        router.push('/');
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

