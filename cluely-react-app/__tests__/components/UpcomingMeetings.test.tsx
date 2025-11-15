import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpcomingMeetings } from '@/components/dashboard/UpcomingMeetings';
import { mockCalendarAccount, mockCalendarEvents, createMockSession } from '../utils/test-utils';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock the SupabaseProvider context
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  })),
} as unknown as SupabaseClient;

const mockSession = createMockSession();

jest.mock('@/context/SupabaseProvider', () => ({
  useSupabase: () => ({
    supabase: mockSupabase,
    session: mockSession,
  }),
}));

// Mock fetch for sync API
global.fetch = jest.fn();

describe('UpcomingMeetings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('No Calendar Connected', () => {
    it('should show "connect calendar" prompt when no calendar account exists', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockResolvedValue({
            data: null,
            error: null,
          });
        } else if (table === 'user_calendar_events') {
          chainable.maybeSingle.mockResolvedValue({
            data: [],
            error: null,
          });
        }

        return chainable;
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText('No calendar connected')).toBeInTheDocument();
        expect(
          screen.getByText(/Connect your Google Calendar to see upcoming meetings/)
        ).toBeInTheDocument();
        expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument();
      });
    });

    it('should have link to integrations settings', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockResolvedValue({
            data: null,
            error: null,
          });
        }

        return chainable;
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        const link = screen.getByText('Connect Google Calendar').closest('a');
        expect(link).toHaveAttribute('href', '/settings/integrations');
      });
    });
  });

  describe('No Upcoming Events', () => {
    it('should show empty state when calendar is connected but no events', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockResolvedValue({
            data: mockCalendarAccount,
            error: null,
          });
        } else if (table === 'user_calendar_events') {
          chainable.eq.mockReturnValue({
            ...chainable,
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          });
        }

        return chainable;
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
        expect(screen.getByText('No upcoming meetings')).toBeInTheDocument();
        expect(
          screen.getByText(/You don't have any meetings scheduled/)
        ).toBeInTheDocument();
      });
    });

    it('should show sync button in empty state', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockResolvedValue({
            data: mockCalendarAccount,
            error: null,
          });
        } else if (table === 'user_calendar_events') {
          chainable.eq.mockReturnValue({
            ...chainable,
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          });
        }

        return chainable;
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText('Sync Now')).toBeInTheDocument();
      });
    });
  });

  describe('With Events', () => {
    beforeEach(() => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockResolvedValue({
            data: mockCalendarAccount,
            error: null,
          });
        } else if (table === 'user_calendar_events') {
          chainable.eq.mockReturnValue({
            ...chainable,
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: mockCalendarEvents,
              error: null,
            }),
          });
        }

        return chainable;
      });
    });

    it('should render all upcoming events', async () => {
      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument();
        expect(screen.getByText('Client Meeting')).toBeInTheDocument();
      });
    });

    it('should show last sync time', async () => {
      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
      });
    });

    it('should show sync and settings buttons', async () => {
      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText('Sync Now')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should trigger manual sync on button click', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ upserted: 2 }),
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        const syncButton = screen.getByText('Sync Now');
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/integrations/google-calendar/sync',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
      });
    });

    it('should refresh events after successful sync', async () => {
      const updatedEvents = [
        ...mockCalendarEvents,
        {
          id: 'event-3',
          user_id: 'mock-user-id',
          source: 'google_calendar',
          external_event_id: 'google-event-3',
          start_time: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
          end_time: new Date(Date.now() + 176400000).toISOString(),
          summary: 'New Meeting',
          description: null,
          location: null,
          hangout_link: null,
          attendees: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockFrom = mockSupabase.from as jest.Mock;
      let callCount = 0;

      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'user_calendar_events') {
          chainable.eq.mockReturnValue({
            ...chainable,
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: callCount === 0 ? mockCalendarEvents : updatedEvents,
              error: null,
            }),
          });
          callCount++;
        } else if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockResolvedValue({
            data: mockCalendarAccount,
            error: null,
          });
        }

        return chainable;
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ upserted: 1 }),
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument();
      });

      const syncButton = screen.getByText('Sync Now');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('New Meeting')).toBeInTheDocument();
      });
    });

    it('should show error message if sync fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Sync failed' }),
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        const syncButton = screen.getByText('Sync Now');
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('should disable sync button while syncing', async () => {
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      render(<UpcomingMeetings />);

      await waitFor(() => {
        const syncButton = screen.getByText('Sync Now');
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        const syncButton = screen.getByText('Syncing...');
        expect(syncButton).toBeDisabled();
      });

      // Resolve fetch
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ upserted: 2 }),
      });

      await waitFor(() => {
        const syncButton = screen.getByText('Sync Now');
        expect(syncButton).not.toBeDisabled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockReturnValue(fetchPromise);
        } else if (table === 'user_calendar_events') {
          chainable.eq.mockReturnValue({
            ...chainable,
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnValue(fetchPromise),
          });
        }

        return chainable;
      });

      render(<UpcomingMeetings />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();

      // Cleanup
      resolveFetch({ data: null, error: null });
    });
  });

  describe('Error Handling', () => {
    it('should handle database fetch errors gracefully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainable = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
        };

        if (table === 'google_calendar_accounts') {
          chainable.maybeSingle.mockResolvedValue({
            data: mockCalendarAccount,
            error: null,
          });
        } else if (table === 'user_calendar_events') {
          chainable.eq.mockReturnValue({
            ...chainable,
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          });
        }

        return chainable;
      });

      render(<UpcomingMeetings />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load calendar events')).toBeInTheDocument();
      });
    });
  });
});
