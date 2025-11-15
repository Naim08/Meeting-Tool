import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleCalendarCard } from '@/components/integrations/GoogleCalendarCard';
import { mockCalendarAccount, createMockSession } from '../utils/test-utils';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the SupabaseProvider context
const mockSupabase = {
  auth: {
    signInWithOAuth: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
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

// Mock fetch for API calls
global.fetch = jest.fn();

describe('GoogleCalendarCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Not Connected State', () => {
    it('should render connect button when no calendar connected', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        expect(screen.getByText('Google Calendar')).toBeInTheDocument();
        expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument();
        expect(
          screen.getByText(/Connect your Google Calendar to automatically sync/)
        ).toBeInTheDocument();
      });
    });

    it('should trigger OAuth flow on connect button click', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockSignInWithOAuth = mockSupabase.auth.signInWithOAuth as jest.Mock;
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const connectButton = screen.getByText('Connect Google Calendar');
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }),
        });
      });
    });

    it('should show error if OAuth connection fails', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockSignInWithOAuth = mockSupabase.auth.signInWithOAuth as jest.Mock;
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: 'OAuth error occurred' },
      });

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const connectButton = screen.getByText('Connect Google Calendar');
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(screen.getByText('OAuth error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Connected State', () => {
    beforeEach(() => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockCalendarAccount,
          error: null,
        }),
      });
    });

    it('should render connected state with account email', async () => {
      render(<GoogleCalendarCard />);

      await waitFor(() => {
        expect(screen.getByText('Google Calendar')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText(/Connected: test@gmail.com/)).toBeInTheDocument();
        expect(screen.getByText('Sync Now')).toBeInTheDocument();
        expect(screen.getByText('Reconnect')).toBeInTheDocument();
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
      });
    });

    it('should trigger manual sync on Sync Now button click', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ upserted: 5 }),
      });

      render(<GoogleCalendarCard />);

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

      await waitFor(() => {
        expect(screen.getByText('Synced 5 events successfully')).toBeInTheDocument();
      });
    });

    it('should show error if sync fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Sync failed' }),
      });

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const syncButton = screen.getByText('Sync Now');
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('should trigger reconnect on Reconnect button click', async () => {
      const mockSignInWithOAuth = mockSupabase.auth.signInWithOAuth as jest.Mock;
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const reconnectButton = screen.getByText('Reconnect');
        fireEvent.click(reconnectButton);
      });

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          }),
        });
      });
    });

    it('should show confirmation dialog on disconnect', async () => {
      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const disconnectButton = screen.getByText('Disconnect');
        fireEvent.click(disconnectButton);
      });

      // window.confirm is mocked to return true in jest.setup.ts
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to disconnect')
      );
    });

    it('should disconnect calendar when confirmed', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const disconnectButton = screen.getByText('Disconnect');
        fireEvent.click(disconnectButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/integrations/google-calendar/disconnect',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Google Calendar disconnected successfully')).toBeInTheDocument();
      });
    });

    it('should not disconnect if user cancels confirmation', async () => {
      // Mock confirm to return false
      (global.confirm as jest.Mock).mockReturnValueOnce(false);

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const disconnectButton = screen.getByText('Disconnect');
        fireEvent.click(disconnectButton);
      });

      // Should not make API call
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/integrations/google-calendar/disconnect',
        expect.any(Object)
      );
    });

    it('should disable sync button when sync is disabled in account', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { ...mockCalendarAccount, sync_enabled: false },
          error: null,
        }),
      });

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const syncButton = screen.getByText('Sync Now');
        expect(syncButton).toBeDisabled();
      });
    });

    it('should show loading state while syncing', async () => {
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      render(<GoogleCalendarCard />);

      await waitFor(() => {
        const syncButton = screen.getByText('Sync Now');
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument();
      });

      // Resolve the fetch
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ upserted: 3 }),
      });

      await waitFor(() => {
        expect(screen.queryByText('Syncing...')).not.toBeInTheDocument();
        expect(screen.getByText('Sync Now')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock a pending promise
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnValue(fetchPromise),
      });

      render(<GoogleCalendarCard />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();

      // Cleanup
      resolveFetch({ data: null, error: null });
    });
  });
});
