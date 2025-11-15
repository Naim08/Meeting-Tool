'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/SupabaseProvider';
import { supabaseDb1 } from '@/lib/supabaseDb1Client';

// Constants
const TRIAL_MESSAGE_COUNT = 10;
const DEFAULT_DB1_PASSWORD = '150264123';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session - Supabase will automatically handle the OAuth callback
        // whether it's PKCE (code in query) or implicit (tokens in fragment)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session || !session.user) {
          throw new Error('No session found after OAuth callback');
        }

        const user = session.user;
        const userId = user.id;
        const email = user.email;
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

        console.log('OAuth user authenticated:', { userId, email, fullName });

        // Wait for database trigger to create user row
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 1: Initialize trial in DB2
        const trialData = {
          trial_start: new Date().toISOString(),
          trial_message_count: TRIAL_MESSAGE_COUNT,
        };

        // Try to update the existing user row (created by trigger) instead of upsert
        // Upsert may fail due to RLS policies
        const { error: db2UpdateError } = await supabase
          .from('users')
          .update({
            full_name: fullName,
            avatar_url: avatarUrl,
            ...trialData,
          })
          .eq('id', userId);

        if (db2UpdateError) {
          console.error('Failed to initialize trial in DB2:', {
            error: db2UpdateError,
            message: db2UpdateError.message,
            details: db2UpdateError.details,
            hint: db2UpdateError.hint,
            code: db2UpdateError.code
          });
          // Don't block login for trial initialization failure
        } else {
          console.log('✅ OAuth trial initialized in DB2:', { userId, ...trialData });
        }

        // Step 2: Sync user to DB1 (desktop database) with default password
        if (supabaseDb1 && email) {
          try {
            console.log('Starting DB1 sync for OAuth user:', email);

            // Check if user already exists in DB1
            const { data: existingDb1Users, error: db1CheckError } = await supabaseDb1
              .from('users')
              .select('id, email')
              .eq('email', email)
              .limit(1);

            if (db1CheckError) {
              console.error('DB1 user check error:', db1CheckError);
            } else if (existingDb1Users && existingDb1Users.length > 0) {
              // User exists in DB1, update profile and trial
              console.log('User exists in DB1, updating profile and trial:', email);

              const updateData: Record<string, string | number> = {
                ...trialData,
              };

              if (fullName) updateData.full_name = fullName;
              if (avatarUrl) updateData.avatar_url = avatarUrl;

              const { error: db1UpdateError } = await supabaseDb1
                .from('users')
                .update(updateData)
                .eq('email', email);

              if (db1UpdateError) {
                console.error('❌ Failed to update user in DB1:', db1UpdateError);
              } else {
                console.log('✅ User profile and trial updated in DB1:', { email, ...trialData });
              }
            } else {
              // User doesn't exist in DB1, create account with default password
              console.log('Creating new user in DB1 with default password:', email);

              const { error: db1SignupError } = await supabaseDb1.auth.signUp({
                email,
                password: DEFAULT_DB1_PASSWORD,
                options: {
                  data: {
                    full_name: fullName,
                    avatar_url: avatarUrl,
                  },
                },
              });

              if (db1SignupError) {
                console.error('❌ Failed to create user in DB1:', db1SignupError);
              } else {
                console.log('✅ User created in DB1 with default password:', email);

                // Wait for user to be created, then initialize trial
                await new Promise(resolve => setTimeout(resolve, 1000));

                const { data: newDb1User } = await supabaseDb1
                  .from('users')
                  .select('id')
                  .eq('email', email)
                  .single();

                if (newDb1User?.id) {
                  const { error: db1TrialError } = await supabaseDb1
                    .from('users')
                    .update(trialData)
                    .eq('id', newDb1User.id);

                  if (db1TrialError) {
                    console.error('❌ Failed to initialize trial in DB1:', db1TrialError);
                  } else {
                    console.log('✅ Trial initialized in DB1 for new OAuth user:', { email, ...trialData });
                  }
                } else {
                  console.error('❌ Could not find newly created user in DB1:', email);
                }
              }
            }
          } catch (db1Error) {
            console.error('DB1 sync failed (non-blocking):', db1Error);
          }
        }

        // Success! Redirect to dashboard
        router.push('/dashboard');
      } catch (err) {
        console.error('OAuth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        setProcessing(false);

        // Redirect to login with error after a delay
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(errorMessage)}`);
        }, 3000);
      }
    };

    handleCallback();
  }, [supabase, router]);

  if (error) {
    return (
      <div className="min-h-screen hero-v2 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] p-8 md:p-10 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Authentication Failed
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {error}
            </p>
            <p className="text-xs text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen hero-v2 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] p-8 md:p-10 text-center">
            <div className="mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Completing sign in...
            </h1>
            <p className="text-sm text-gray-600">
              Please wait while we set up your account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
