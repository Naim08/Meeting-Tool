'use client';

import React, { useState } from 'react';
import type { CalendarEvent } from '@/lib/google-calendar';
import {
  formatEventDate,
  getMeetingLink,
  getMeetingProvider,
  isEventNow,
  isEventSoon,
} from '@/lib/google-calendar';
import { InterviewBriefCard } from '../interview/InterviewBriefCard';
import { MarkInterviewToggle } from '../interview/MarkInterviewToggle';
import { useInterviewBrief } from '@/hooks/useInterviewBrief';
import { useSupabase } from '@/context/SupabaseProvider';

interface ExtendedCalendarEvent extends CalendarEvent {
  is_interview?: boolean;
  interview_override?: boolean | null;
}

interface MeetingCardWithBriefProps {
  event: ExtendedCalendarEvent;
}

export function MeetingCardWithBrief({ event }: MeetingCardWithBriefProps) {
  const { session } = useSupabase();
  const meetingLink = getMeetingLink(event);
  const provider = getMeetingProvider(meetingLink);
  const isNow = isEventNow(event.start_time, event.end_time);
  const isSoon = isEventSoon(event.start_time);

  const [showBrief, setShowBrief] = useState(false);
  const [localIsInterview, setLocalIsInterview] = useState(
    event.interview_override ?? event.is_interview ?? false
  );

  // Interview brief hook (only active if showing brief)
  const brief = useInterviewBrief({
    eventId: event.id,
    accessToken: session?.access_token || null,
    autoGenerate: showBrief && localIsInterview,
    eventStartTime: event.start_time,
  });

  const handleInterviewUpdate = (newValue: boolean) => {
    setLocalIsInterview(newValue);
    if (!newValue) {
      // If marking as not an interview, hide the brief
      setShowBrief(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
      {/* Main Card Content */}
      <div className="p-6">
        {/* Time and Status */}
        <div className="flex items-center gap-3 mb-3">
          {isNow ? (
            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              Happening now
            </span>
          ) : isSoon ? (
            <span className="flex items-center gap-2 text-sm font-medium text-orange-600">
              <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
              Starting soon
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Upcoming
            </span>
          )}
          <span className="text-sm text-gray-600">
            {formatEventDate(event.start_time, event.end_time)}
          </span>
        </div>

        {/* Event Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {event.summary || 'Untitled Event'}
        </h3>

        {/* Description (if available) */}
        {event.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Meeting Link or Location */}
        <div className="flex items-center justify-between mt-4">
          {meetingLink ? (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Join {provider}
            </a>
          ) : event.location ? (
            <span className="inline-flex items-center gap-2 text-sm text-gray-600">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {event.location}
            </span>
          ) : null}

          {/* Event status badge */}
          {event.status && event.status !== 'confirmed' && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                event.status === 'tentative'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {event.status}
            </span>
          )}
        </div>

        {/* Interview Controls */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <MarkInterviewToggle
              eventId={event.id}
              isInterview={event.is_interview ?? false}
              interviewOverride={event.interview_override ?? null}
              onUpdate={handleInterviewUpdate}
            />

            {localIsInterview && (
              <button
                onClick={() => setShowBrief(!showBrief)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {showBrief ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    Hide AI Brief
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Show AI Brief
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Interview Brief Section (expandable) */}
      {showBrief && localIsInterview && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <InterviewBriefCard
            eventId={event.id}
            brief={brief.brief}
            status={brief.status}
            stale={brief.stale}
            error={brief.error}
            regeneratedCount={brief.regeneratedCount}
            onGenerate={brief.generate}
            onRegenerate={brief.regenerate}
          />
        </div>
      )}
    </div>
  );
}
