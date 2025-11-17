import { renderHook, act, waitFor } from '@testing-library/react';
import { createMockSession, mockCalendarEvents } from '../utils/test-utils';

// Mock channel
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
};

const mockSession = createMockSession();

// Mock the context before importing the hook
jest.mock('@/context/SupabaseProvider', () => ({
  useSupabase: () => ({
    supabase: mockSupabase,
    session: mockSession,
  }),
}));

// Import after mocks
import {
  useUpcomingEvents,
  formatEventTime,
  getStatusColor,
} from '@/hooks/useUpcomingEvents';

describe('useUpcomingEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockSupabase.from.mockReturnValue({
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
    it('should fetch events on mount', async () => {
      const { result } = renderHook(() => useUpcomingEvents());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(mockCalendarEvents);
      expect(result.current.error).toBeNull();
    });

    it('should call supabase with correct table', async () => {
      renderHook(() => useUpcomingEvents());

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('user_calendar_events');
      });
    });

    it('should respect custom limit option', async () => {
      const limitMock = jest.fn().mockResolvedValue({
        data: mockCalendarEvents,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      });

      renderHook(() => useUpcomingEvents({ limit: 10 }));

      await waitFor(() => {
        expect(limitMock).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error state when fetch fails', async () => {
      mockSupabase.from.mockReturnValue({
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

      const { result } = renderHook(() => useUpcomingEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Hook uses fallback message for non-Error objects
      expect(result.current.error).toBe('Failed to fetch upcoming events');
      expect(result.current.events).toEqual([]);
    });
  });

  describe('Refresh Function', () => {
    it('should refetch events when refresh is called', async () => {
      const { result } = renderHook(() => useUpcomingEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('user_calendar_events');
    });
  });

  describe('Realtime Subscription', () => {
    it('should subscribe to realtime channel on mount', async () => {
      renderHook(() => useUpcomingEvents());

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith(
          'user_calendar_events_changes'
        );
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'user_calendar_events',
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should unsubscribe from channel on unmount', async () => {
      const { unmount } = renderHook(() => useUpcomingEvents());

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});

describe('formatEventTime', () => {
  it('should format all-day event correctly', () => {
    const result = formatEventTime(
      '2025-01-15T12:00:00Z',
      '2025-01-15T23:59:59Z',
      true
    );

    // Should contain month and day (timezone may shift the day)
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/\d+/);
  });

  it('should format same-day event with times', () => {
    const result = formatEventTime(
      '2025-01-15T10:00:00Z',
      '2025-01-15T11:00:00Z',
      false
    );

    // Should contain a time separator
    expect(result).toMatch(/-/);
  });
});

describe('getStatusColor', () => {
  it('should return green colors for confirmed status', () => {
    const result = getStatusColor('confirmed');
    expect(result.bg).toBe('bg-green-100');
    expect(result.text).toBe('text-green-800');
    expect(result.dot).toBe('bg-green-600');
  });

  it('should return yellow colors for tentative status', () => {
    const result = getStatusColor('tentative');
    expect(result.bg).toBe('bg-yellow-100');
  });

  it('should return red colors for cancelled status', () => {
    const result = getStatusColor('cancelled');
    expect(result.bg).toBe('bg-red-100');
  });

  it('should return gray colors for unknown status', () => {
    const result = getStatusColor('unknown');
    expect(result.bg).toBe('bg-gray-100');
  });

  it('should be case-insensitive', () => {
    const result = getStatusColor('CONFIRMED');
    expect(result.bg).toBe('bg-green-100');
  });
});
