// Types and helper functions for Google Calendar integration

export interface GoogleCalendarAccount {
  id: string;
  user_id: string;
  google_user_id: string;
  email: string;
  access_token: string | null;
  refresh_token: string;
  expires_at: string;
  scope: string;
  primary_calendar_id: string | null;
  sync_enabled: boolean;
  connected_at: string;
  last_sync_at: string | null;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  source: string;
  external_event_id: string;
  google_calendar_id: string | null;
  status: string;
  summary: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  hangout_link: string | null;
  location: string | null;
  raw_payload: Record<string, unknown> | null;
  last_updated_at: string;
  created_at: string;
}

export interface SyncSummary {
  fetched: number;
  upserted: number;
  skipped: number;
  window_start: string;
  window_end: string;
}

// Format date for display
export function formatEventDate(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  // Check if event is today
  const isToday = start.toDateString() === now.toDateString();

  // Check if event is tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = start.toDateString() === tomorrow.toDateString();

  // Format time
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
  const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);

  if (isToday) {
    return `Today • ${startTimeStr} - ${endTimeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow • ${startTimeStr} - ${endTimeStr}`;
  } else {
    // Format as "Day of week • Time"
    const dayOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    };
    const dayStr = start.toLocaleDateString('en-US', dayOptions);
    return `${dayStr} • ${startTimeStr} - ${endTimeStr}`;
  }
}

// Format relative time for "Last synced" display
export function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Never';

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// Extract meeting link from event
export function getMeetingLink(event: CalendarEvent): string | null {
  // Check hangout_link first (Google Meet)
  if (event.hangout_link) return event.hangout_link;

  // Check description for Zoom links
  if (event.description) {
    const zoomMatch = event.description.match(/https:\/\/[\w-]*\.?zoom\.us\/[^\s]*/);
    if (zoomMatch) return zoomMatch[0];

    // Check for Teams links
    const teamsMatch = event.description.match(/https:\/\/teams\.microsoft\.com\/[^\s]*/);
    if (teamsMatch) return teamsMatch[0];
  }

  return null;
}

// Get meeting link provider name
export function getMeetingProvider(link: string | null): string {
  if (!link) return '';

  if (link.includes('meet.google.com')) return 'Google Meet';
  if (link.includes('zoom.us')) return 'Zoom';
  if (link.includes('teams.microsoft.com')) return 'Microsoft Teams';

  return 'Meeting';
}

// Check if event is happening soon (within 15 minutes)
export function isEventSoon(startTime: string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = start.getTime() - now.getTime();
  const diffMins = diffMs / 60000;

  return diffMins > 0 && diffMins <= 15;
}

// Check if event is happening now
export function isEventNow(startTime: string, endTime: string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  return now >= start && now <= end;
}
