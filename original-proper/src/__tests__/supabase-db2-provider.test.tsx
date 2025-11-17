import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  SupabaseDb2Provider,
  useSupabaseDb2,
} from '../renderer/supabase-db2-provider';
import { Session, User } from '@supabase/supabase-js';

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
    app_metadata: { provider: 'google' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User,
  ...overrides,
});

// Mock createClient to return our mocked clients
const mockDb1SignInWithPassword = jest.fn();
const mockDb1SignUp = jest.fn();
const mockDb1SignOut = jest.fn();
const mockDb1GetSession = jest.fn();
const mockDb1OnAuthStateChange = jest.fn();

const mockDb2GetSession = jest.fn();
const mockDb2OnAuthStateChange = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url: string, key: string) => {
    // Differentiate between DB1 and DB2 based on URL
    if (url.includes('mthkbfdqqjvremvijfed')) {
      // DB1
      return {
        auth: {
          signInWithPassword: mockDb1SignInWithPassword,
          signUp: mockDb1SignUp,
          signOut: mockDb1SignOut,
          getSession: mockDb1GetSession,
          onAuthStateChange: mockDb1OnAuthStateChange,
        },
      };
    } else {
      // DB2
      return {
        auth: {
          getSession: mockDb2GetSession,
          onAuthStateChange: mockDb2OnAuthStateChange,
        },
      };
    }
  }),
}));

// Also mock the db2 client
jest.mock('../renderer/supabase-db2-client', () => ({
  supabaseDb2: {
    auth: {
      getSession: mockDb2GetSession,
      onAuthStateChange: mockDb2OnAuthStateChange,
    },
  },
}));

describe('SupabaseDb2Provider', () => {
  const mockSession = createMockSession();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockDb1GetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockDb2GetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockDb1OnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    mockDb2OnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Initial State', () => {
    it('should render children', async () => {
      render(
        <SupabaseDb2Provider>
          <div data-testid="child">Child Content</div>
        </SupabaseDb2Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });
    });

    it('should fetch initial sessions on mount', async () => {
      render(
        <SupabaseDb2Provider>
          <div>Test</div>
        </SupabaseDb2Provider>
      );

      await waitFor(() => {
        expect(mockDb2GetSession).toHaveBeenCalled();
        expect(mockDb1GetSession).toHaveBeenCalled();
      });
    });

    it('should subscribe to auth state changes', async () => {
      render(
        <SupabaseDb2Provider>
          <div>Test</div>
        </SupabaseDb2Provider>
      );

      await waitFor(() => {
        expect(mockDb2OnAuthStateChange).toHaveBeenCalled();
        expect(mockDb1OnAuthStateChange).toHaveBeenCalled();
      });
    });
  });

  describe('useSupabaseDb2 Hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useSupabaseDb2());
      }).toThrow('useSupabaseDb2 must be used inside SupabaseDb2Provider');

      consoleError.mockRestore();
    });

    it('should provide context values when used inside provider', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SupabaseDb2Provider>{children}</SupabaseDb2Provider>
      );

      const { result } = renderHook(() => useSupabaseDb2(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.supabaseDb2).toBeDefined();
      expect(result.current.supabaseDb1).toBeDefined();
      expect(result.current.syncDb1FromDb2).toBeDefined();
    });

    it('should provide db2Session after loading', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SupabaseDb2Provider>{children}</SupabaseDb2Provider>
      );

      const { result } = renderHook(() => useSupabaseDb2(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.db2Session).toEqual(mockSession);
    });
  });

  describe('DB1 Sync from DB2', () => {
    it('should sync DB1 when user signs in to DB2', async () => {
      mockDb1SignInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SupabaseDb2Provider>{children}</SupabaseDb2Provider>
      );

      const { result } = renderHook(() => useSupabaseDb2(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Call syncDb1FromDb2 directly
      await act(async () => {
        await result.current.syncDb1FromDb2('test@example.com', undefined, true);
      });

      expect(mockDb1SignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: '150264123', // Default OAuth password
      });
    });

    it('should create DB1 account if sign in fails', async () => {
      // First sign in fails
      mockDb1SignInWithPassword.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });

      // Sign up succeeds
      mockDb1SignUp.mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      // Retry sign in succeeds
      mockDb1SignInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SupabaseDb2Provider>{children}</SupabaseDb2Provider>
      );

      const { result } = renderHook(() => useSupabaseDb2(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.syncDb1FromDb2('test@example.com', undefined, true);
      });

      // Should have tried sign in first
      expect(mockDb1SignInWithPassword).toHaveBeenCalled();
      // Then sign up
      expect(mockDb1SignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: '150264123',
        options: {
          emailRedirectTo: undefined,
        },
      });
    });

    it('should use provided password for non-OAuth users', async () => {
      mockDb1SignInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SupabaseDb2Provider>{children}</SupabaseDb2Provider>
      );

      const { result } = renderHook(() => useSupabaseDb2(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.syncDb1FromDb2(
          'test@example.com',
          'userPassword123',
          false
        );
      });

      expect(mockDb1SignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'userPassword123',
      });
    });

    it('should not sync if no password provided for non-OAuth user', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SupabaseDb2Provider>{children}</SupabaseDb2Provider>
      );

      const { result } = renderHook(() => useSupabaseDb2(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.syncDb1FromDb2('test@example.com', undefined, false);
      });

      // Should not attempt sign in without password
      expect(mockDb1SignInWithPassword).not.toHaveBeenCalled();
    });

    it('should prevent concurrent sync operations', async () => {
      // Create a promise that we can control
      let resolveSignIn: any;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockDb1SignInWithPassword.mockReturnValue(signInPromise);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SupabaseDb2Provider>{children}</SupabaseDb2Provider>
      );

      const { result } = renderHook(() => useSupabaseDb2(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start first sync
      act(() => {
        result.current.syncDb1FromDb2('test@example.com', undefined, true);
      });

      // Try to start second sync while first is in progress
      await act(async () => {
        await result.current.syncDb1FromDb2('test2@example.com', undefined, true);
      });

      // Should only have been called once (first sync)
      expect(mockDb1SignInWithPassword).toHaveBeenCalledTimes(1);

      // Clean up
      resolveSignIn({ data: { session: mockSession }, error: null });
    });
  });

  describe('Sign Out', () => {
    it('should sign out of DB1 when signing out of DB2', async () => {
      let db2AuthCallback: any;
      mockDb2OnAuthStateChange.mockImplementation((callback: any) => {
        db2AuthCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      mockDb1SignOut.mockResolvedValue({ error: null });

      render(
        <SupabaseDb2Provider>
          <div>Test</div>
        </SupabaseDb2Provider>
      );

      await waitFor(() => {
        expect(db2AuthCallback).toBeDefined();
      });

      // Simulate sign out event
      await act(async () => {
        db2AuthCallback('SIGNED_OUT', null);
      });

      expect(mockDb1SignOut).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from auth changes on unmount', async () => {
      const db1Unsubscribe = jest.fn();
      const db2Unsubscribe = jest.fn();

      mockDb1OnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: db1Unsubscribe } },
      });

      mockDb2OnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: db2Unsubscribe } },
      });

      const { unmount } = render(
        <SupabaseDb2Provider>
          <div>Test</div>
        </SupabaseDb2Provider>
      );

      await waitFor(() => {
        expect(mockDb2OnAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(db1Unsubscribe).toHaveBeenCalled();
      expect(db2Unsubscribe).toHaveBeenCalled();
    });
  });
});
