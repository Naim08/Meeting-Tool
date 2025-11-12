/**
 * Meeting Export Utilities
 *
 * Converts meeting transcriptions to exportable conversation format
 */

import type { MeetingDetail } from '../components/meetings/helpers';

export interface ExportableMeetingData {
  sessionId: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  }>;
}

/**
 * Convert meeting transcriptions to exportable conversation format
 * Treats each transcription segment as a message
 */
export function convertMeetingToExportFormat(meeting: MeetingDetail): ExportableMeetingData {
  const messages: ExportableMeetingData['messages'] = [];

  // Process each transcription
  meeting.transcriptions.forEach((transcription) => {
    transcription.segments.forEach((segment, index) => {
      // Determine role based on source
      // Microphone = user, System = assistant (or based on speaker if available)
      const role = transcription.source === 'microphone' ? 'user' : 'assistant';

      messages.push({
        id: segment.id || `${transcription.id}-segment-${index}`,
        role,
        content: segment.text,
        createdAt: segment.startTime
          ? new Date(segment.startTime).toISOString()
          : new Date(transcription.startTime).toISOString(),
      });
    });
  });

  // Sort messages by timestamp
  messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    sessionId: meeting.id,
    title: meeting.title || 'Untitled Meeting',
    startedAt: new Date(meeting.startedAt).toISOString(),
    endedAt: meeting.endedAt ? new Date(meeting.endedAt).toISOString() : null,
    messages,
  };
}
