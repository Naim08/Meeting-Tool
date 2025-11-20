'use client';

import React from 'react';
import Link from 'next/link';
import { useSupabase } from '@/context/SupabaseProvider';

export function DashboardHeader() {
  const { session, signOut } = useSupabase();
  const userInitials = session?.user?.email
    ? session.user.email.substring(0, 2).toUpperCase()
    : '??';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-1.5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                Cluely
              </span>
            </Link>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/practice"
              className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:shadow-md"
            >
              Practice Now
            </Link>

            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-700 font-medium border border-blue-200">
                  {userInitials}
                </div>
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
                <div className="px-4 py-2 border-b border-gray-50">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
