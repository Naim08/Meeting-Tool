import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockCalendarEvents, createMockSession } from '../utils/test-utils';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock DashboardHeader
jest.mock('@/components/dashboard/DashboardHeader', () => ({
  DashboardHeader: () => <div data-testid="dashboard-header">Header</div>,
}));

// Mock session and supabase
const mockSession = createMockSession();
const mockFunctionsInvoke = jest.fn();
const mockSupabase = {
  functions: {
    invoke: mockFunctionsInvoke,
  },
};

// Mock useSupabase
jest.mock('@/context/SupabaseProvider', () => ({
  useSupabase: () => ({
    supabase: mockSupabase,
    session: mockSession,
    loading: false,
  }),
}));

// Mock useUpcomingEvents
const mockRefresh = jest.fn();
jest.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: () => ({
    events: mockCalendarEvents,
    loading: false,
    error: null,
    refresh: mockRefresh,
  }),
  formatEventTime: (start: string) => new Date(start).toLocaleDateString(),
  getStatusColor: () => ({
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-600',
  }),
}));

// Import after mocks
import CalendarPage from '@/app/calendar/page';

describe('CalendarPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render calendar page with header', () => {
      render(<CalendarPage />);

      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
    });

    it('should render breadcrumb navigation', () => {
      render(<CalendarPage />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('should render Sync Now button', () => {
      render(<CalendarPage />);

      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });
  });

  describe('Events List', () => {
    it('should render events when available', () => {
      render(<CalendarPage />);

      expect(screen.getByText('Team Standup')).toBeInTheDocument();
      expect(screen.getByText('Client Meeting')).toBeInTheDocument();
    });

    it('should render Join Meeting button for events with hangout link', () => {
      render(<CalendarPage />);

      const joinButtons = screen.getAllByText('Join Meeting');
      expect(joinButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Sync Functionality', () => {
    it('should call sync function when Sync Now is clicked', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { upserted: 5 },
        error: null,
      });

      render(<CalendarPage />);

      const syncButton = screen.getByText('Sync Now');
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

      render(<CalendarPage />);

      const syncButton = screen.getByText('Sync Now');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Synced 10 events successfully')).toBeInTheDocument();
      });
    });

    it('should refresh events after successful sync', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { upserted: 5 },
        error: null,
      });

      render(<CalendarPage />);

      const syncButton = screen.getByText('Sync Now');
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

      render(<CalendarPage />);

      const syncButton = screen.getByText('Sync Now');
      fireEvent.click(syncButton);

      // Error object is not an Error instance, so fallback message is used
      await waitFor(() => {
        expect(screen.getByText('Failed to sync calendar')).toBeInTheDocument();
      });
    });
  });
});
