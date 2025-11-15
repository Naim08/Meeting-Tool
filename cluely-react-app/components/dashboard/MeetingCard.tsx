'use client';

import React from 'react';
import type { CalendarEvent } from '@/lib/google-calendar';
import {
  formatEventDate,
  getMeetingLink,
  getMeetingProvider,
  isEventNow,
  isEventSoon,
} from '@/lib/google-calendar';

interface MeetingCardProps {
  event: CalendarEvent;
}

export function MeetingCard({ event }: MeetingCardProps) {
  const meetingLink = getMeetingLink(event);
  const provider = getMeetingProvider(meetingLink);
  const isNow = isEventNow(event.start_time, event.end_time);
  const isSoon = isEventSoon(event.start_time);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all">
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
    </div>
  );
}
