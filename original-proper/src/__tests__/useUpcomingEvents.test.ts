import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useUpcomingEvents,
  formatEventTime,
  getStatusColor,
} from '../renderer/hooks/useUpcomingEvents';
import { Session, User } from '@supabase/supabase-js';

// Mock supabaseDb2
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};

const mockSupabaseDb2 = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  })),
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
};

jest.mock('../renderer/supabase-db2-client', () => ({
  supabaseDb2: mockSupabaseDb2,
}));

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

describe('useUpcomingEvents (Electron)', () => {
  const mockSession = createMockSession();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock chain for each test
    const mockFrom = mockSupabaseDb2.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockCalendarEvents,
        error: null,
      }),
    });
  });

  describe('Initial Load', () => {
    it('should fetch events when session is provided', async () => {
      const { result } = renderHook(() =>
        useUpcomingEvents({ session: mockSession })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(mockCalendarEvents);
      expect(result.current.error).toBeNull();
    });

    it('should return empty events when no session', async () => {
      const { result } = renderHook(() =>
        useUpcomingEvents({ session: null })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
    });

    it('should use default windowDays and limit', async () => {
      const mockFrom = mockSupabaseDb2.from as jest.Mock;
      const limitMock = jest.fn().mockResolvedValue({
        data: mockCalendarEvents,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      });

      renderHook(() => useUpcomingEvents({ session: mockSession }));

      await waitFor(() => {
        // Default limit is 20 for Electron
        expect(limitMock).toHaveBeenCalledWith(20);
      });
    });

    it('should respect custom options', async () => {
      const mockFrom = mockSupabaseDb2.from as jest.Mock;
      const limitMock = jest.fn().mockResolvedValue({
        data: mockCalendarEvents,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      });

      renderHook(() =>
        useUpcomingEvents({
          session: mockSession,
          windowDays: 7,
          limit: 10,
        })
      );

      await waitFor(() => {
        expect(limitMock).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error when fetch fails', async () => {
      const mockFrom = mockSupabaseDb2.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const { result } = renderHook(() =>
        useUpcomingEvents({ session: mockSession })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.events).toEqual([]);
    });

    it('should handle network errors', async () => {
      const mockFrom = mockSupabaseDb2.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() =>
        useUpcomingEvents({ session: mockSession })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Refresh Function', () => {
    it('should refetch events when refresh is called', async () => {
      const { result } = renderHook(() =>
        useUpcomingEvents({ session: mockSession })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSupabaseDb2.from).toHaveBeenCalledWith('user_calendar_events');
    });
  });

  describe('Realtime Subscription', () => {
    it('should subscribe to realtime channel', async () => {
      renderHook(() => useUpcomingEvents({ session: mockSession }));

      await waitFor(() => {
        expect(mockSupabaseDb2.channel).toHaveBeenCalledWith(
          'electron_calendar_events_changes'
        );
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'user_calendar_events',
          filter: `user_id=eq.${mockSession.user.id}`,
        }),
        expect.any(Function)
      );
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(() =>
        useUpcomingEvents({ session: mockSession })
      );

      await waitFor(() => {
        expect(mockSupabaseDb2.channel).toHaveBeenCalled();
      });

      unmount();

      expect(mockSupabaseDb2.removeChannel).toHaveBeenCalled();
    });

    it('should not subscribe when no session', async () => {
      renderHook(() => useUpcomingEvents({ session: null }));

      await waitFor(() => {
        expect(mockSupabaseDb2.channel).not.toHaveBeenCalled();
      });
    });
  });
});

describe('formatEventTime', () => {
  it('should format all-day events', () => {
    const result = formatEventTime(
      '2025-01-15T00:00:00Z',
      '2025-01-15T23:59:59Z',
      true
    );

    expect(result).toMatch(/Wed/);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
  });

  it('should format same-day events with times', () => {
    const result = formatEventTime(
      '2025-01-15T10:00:00Z',
      '2025-01-15T11:00:00Z',
      false
    );

    expect(result).toMatch(/-/);
  });

  it('should format multi-day events', () => {
    const result = formatEventTime(
      '2025-01-15T10:00:00Z',
      '2025-01-16T11:00:00Z',
      false
    );

    expect(result).toMatch(/15/);
    expect(result).toMatch(/16/);
  });
});

describe('getStatusColor', () => {
  it('should return green for confirmed', () => {
    const result = getStatusColor('confirmed');
    expect(result.bg).toBe('bg-green-100');
    expect(result.text).toBe('text-green-800');
    expect(result.dot).toBe('bg-green-600');
  });

  it('should return yellow for tentative', () => {
    const result = getStatusColor('tentative');
    expect(result.bg).toBe('bg-yellow-100');
  });

  it('should return red for cancelled', () => {
    const result = getStatusColor('cancelled');
    expect(result.bg).toBe('bg-red-100');
  });

  it('should return gray for unknown status', () => {
    const result = getStatusColor('unknown');
    expect(result.bg).toBe('bg-gray-100');
  });

  it('should be case-insensitive', () => {
    const result = getStatusColor('CONFIRMED');
    expect(result.bg).toBe('bg-green-100');
  });
});
