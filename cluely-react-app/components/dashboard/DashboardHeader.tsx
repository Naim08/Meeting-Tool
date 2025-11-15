'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/SupabaseProvider';

export function DashboardHeader() {
  const router = useRouter();
  const { session, signOut } = useSupabase();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-semibold text-gray-900">
              Interview Copilot
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/settings/integrations"
              className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Integrations
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              {session?.user?.email && (
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {session.user.email}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
