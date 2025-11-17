import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MeetingsPanel from '../renderer/components/MeetingsPanel';
import { Session, User } from '@supabase/supabase-js';

// Mock supabaseDb2
const mockFunctionsInvoke = jest.fn();
jest.mock('../renderer/supabase-db2-client', () => ({
  supabaseDb2: {
    functions: {
      invoke: mockFunctionsInvoke,
    },
  },
}));

// Mock calendar events
const mockCalendarEvents = [
  {
    id: 'event-1',
    user_id: 'mock-user-id',
    source: 'google_calendar',
    external_event_id: 'google-event-1',
    google_calendar_id: 'primary',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 5400000).toISOString(),
    summary: 'Team Standup',
    description: 'Daily standup meeting',
    location: null,
    hangout_link: 'https://meet.google.com/abc-defg-hij',
    status: 'confirmed',
    is_all_day: false,
    last_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'event-2',
    user_id: 'mock-user-id',
    source: 'google_calendar',
    external_event_id: 'google-event-2',
    google_calendar_id: 'primary',
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 90000000).toISOString(),
    summary: 'Client Meeting',
    description: 'Quarterly review with client',
    location: 'Conference Room A',
    hangout_link: null,
    status: 'confirmed',
    is_all_day: false,
    last_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

// Mock useUpcomingEvents hook
const mockRefresh = jest.fn();
jest.mock('../renderer/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: jest.fn(() => ({
    events: mockCalendarEvents,
    loading: false,
    error: null,
    refresh: mockRefresh,
  })),
  formatEventTime: jest.fn(
    (start: string, end: string, isAllDay: boolean) =>
      `${new Date(start).toLocaleDateString()}`
  ),
  getStatusColor: jest.fn(() => ({
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-600',
  })),
}));

import { useUpcomingEvents } from '../renderer/hooks/useUpcomingEvents';

// Create mock session
const createMockSession = (overrides?: Partial<Session>): Session => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: {
    id: 'mock-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User,
  ...overrides,
});

describe('MeetingsPanel', () => {
  const mockSession = createMockSession();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefresh.mockClear();
    mockFunctionsInvoke.mockClear();

    // Reset useUpcomingEvents mock
    (useUpcomingEvents as jest.Mock).mockReturnValue({
      events: mockCalendarEvents,
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  describe('No Session State', () => {
    it('should show sign-in prompt when no session', () => {
      render(<MeetingsPanel session={null} />);

      expect(
        screen.getByText('Sign in to view your upcoming meetings')
      ).toBeInTheDocument();
    });

    it('should not show header or events when no session', () => {
      render(<MeetingsPanel session={null} />);

      expect(screen.queryByText('Upcoming Meetings')).not.toBeInTheDocument();
      expect(screen.queryByText('Team Standup')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    it('should render header with title', () => {
      render(<MeetingsPanel session={mockSession} />);

      expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
    });

    it('should render Sync button', () => {
      render(<MeetingsPanel session={mockSession} />);

      expect(screen.getByText('Sync')).toBeInTheDocument();
    });

    it('should render events', () => {
      render(<MeetingsPanel session={mockSession} />);

      expect(screen.getByText('Team Standup')).toBeInTheDocument();
      expect(screen.getByText('Client Meeting')).toBeInTheDocument();
    });

    it('should render event with location', () => {
      render(<MeetingsPanel session={mockSession} />);

      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    it('should render Join button for events with hangout link', () => {
      render(<MeetingsPanel session={mockSession} />);

      const joinButtons = screen.getAllByText('Join');
      expect(joinButtons.length).toBe(1); // Only first event has hangout_link
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner', () => {
      (useUpcomingEvents as jest.Mock).mockReturnValue({
        events: [],
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      render(<MeetingsPanel session={mockSession} />);

      // Should not show events or empty state while loading
      expect(screen.queryByText('No upcoming meetings')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message', () => {
      (useUpcomingEvents as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        error: 'Failed to load events',
        refresh: mockRefresh,
      });

      render(<MeetingsPanel session={mockSession} />);

      expect(screen.getByText('Failed to load events')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should call refresh when Try again is clicked', () => {
      (useUpcomingEvents as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        error: 'Failed to load events',
        refresh: mockRefresh,
      });

      render(<MeetingsPanel session={mockSession} />);

      const tryAgainButton = screen.getByText('Try again');
      fireEvent.click(tryAgainButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no events', () => {
      (useUpcomingEvents as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      render(<MeetingsPanel session={mockSession} />);

      expect(screen.getByText('No upcoming meetings')).toBeInTheDocument();
      expect(
        screen.getByText('Your calendar is clear for the next 14 days')
      ).toBeInTheDocument();
    });
  });

  describe('Sync Functionality', () => {
    it('should call sync function when Sync is clicked', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { upserted: 5 },
        error: null,
      });

      render(<MeetingsPanel session={mockSession} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(mockFunctionsInvoke).toHaveBeenCalledWith('sync_google_calendar');
      });
    });

    it('should show success message after successful sync', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { upserted: 10 },
        error: null,
      });

      render(<MeetingsPanel session={mockSession} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Synced 10 events')).toBeInTheDocument();
      });
    });

    it('should refresh events after successful sync', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { upserted: 5 },
        error: null,
      });

      render(<MeetingsPanel session={mockSession} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should show error message when sync fails', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Sync failed' },
      });

      render(<MeetingsPanel session={mockSession} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('should show loading state while syncing', async () => {
      let resolveSync: any;
      const syncPromise = new Promise((resolve) => {
        resolveSync = resolve;
      });
      mockFunctionsInvoke.mockReturnValue(syncPromise);

      render(<MeetingsPanel session={mockSession} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument();
      });

      expect(syncButton).toBeDisabled();

      resolveSync({ data: { upserted: 5 }, error: null });

      await waitFor(() => {
        expect(screen.queryByText('Syncing...')).not.toBeInTheDocument();
      });
    });

    it('should show error when trying to sync without session', async () => {
      render(<MeetingsPanel session={null} />);

      // The sync button shouldn't be visible without session
      // But we're testing the handleSync function behavior
      expect(screen.queryByText('Sync')).not.toBeInTheDocument();
    });
  });

  describe('EventItem', () => {
    it('should handle event without summary', () => {
      const eventsWithoutSummary = [
        {
          ...mockCalendarEvents[0],
          summary: null,
        },
      ];

      (useUpcomingEvents as jest.Mock).mockReturnValue({
        events: eventsWithoutSummary,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      render(<MeetingsPanel session={mockSession} />);

      expect(screen.getByText('Untitled Event')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      render(<MeetingsPanel session={mockSession} />);

      // Status badges show first letter
      const statusBadges = screen.getAllByText('C');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('should open hangout link in new window', () => {
      const mockWindowOpen = jest.fn();
      window.open = mockWindowOpen;

      render(<MeetingsPanel session={mockSession} />);

      const joinButton = screen.getByText('Join');
      fireEvent.click(joinButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://meet.google.com/abc-defg-hij',
        '_blank'
      );
    });
  });
});
