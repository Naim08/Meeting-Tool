'use client';

import React, { useState } from 'react';
import { useSupabase } from '@/context/SupabaseProvider';

interface MarkInterviewToggleProps {
  eventId: string;
  isInterview: boolean;
  interviewOverride: boolean | null;
  onUpdate?: (newValue: boolean) => void;
}

export function MarkInterviewToggle({
  eventId,
  isInterview,
  interviewOverride,
  onUpdate,
}: MarkInterviewToggleProps) {
  const { supabase, session } = useSupabase();
  const [updating, setUpdating] = useState(false);

  const effectiveValue = interviewOverride !== null ? interviewOverride : isInterview;

  const handleToggle = async (value: boolean) => {
    if (!session?.user?.id || updating) return;

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('user_calendar_events')
        .update({ interview_override: value })
        .eq('id', eventId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('[MarkInterviewToggle] Update error:', error);
        alert('Failed to update interview status');
      } else {
        onUpdate?.(value);
      }
    } catch (error) {
      console.error('[MarkInterviewToggle] Unexpected error:', error);
      alert('An error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleClear = async () => {
    if (!session?.user?.id || updating) return;

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('user_calendar_events')
        .update({ interview_override: null })
        .eq('id', eventId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('[MarkInterviewToggle] Clear error:', error);
        alert('Failed to clear override');
      } else {
        onUpdate?.(isInterview); // Revert to computed value
      }
    } catch (error) {
      console.error('[MarkInterviewToggle] Unexpected error:', error);
      alert('An error occurred');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => handleToggle(true)}
          disabled={updating}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            effectiveValue
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-600 hover:bg-gray-200'
          } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Interview
        </button>
        <button
          onClick={() => handleToggle(false)}
          disabled={updating}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            !effectiveValue
              ? 'bg-gray-600 text-white'
              : 'bg-transparent text-gray-600 hover:bg-gray-200'
          } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Not Interview
        </button>
      </div>

      {interviewOverride !== null && (
        <button
          onClick={handleClear}
          disabled={updating}
          className="text-xs text-blue-600 hover:text-blue-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear manual override and use automatic detection"
        >
          Clear
        </button>
      )}

      {interviewOverride !== null && (
        <span className="text-xs text-gray-500">(manual override)</span>
      )}
    </div>
  );
}
