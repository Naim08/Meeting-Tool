import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SupabaseProvider } from '@/context/SupabaseProvider';
import type { Session, User } from '@supabase/supabase-js';

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
  })),
});

// Mock session
export const createMockSession = (overrides?: Partial<Session>): Session => ({
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

// Mock Google Calendar account
export const mockCalendarAccount = {
  id: 'mock-account-id',
  user_id: 'mock-user-id',
  google_user_id: 'mock-google-id',
  email: 'test@gmail.com',
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
  sync_enabled: true,
  last_sync_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock calendar events
export const mockCalendarEvents = [
  {
    id: 'event-1',
    user_id: 'mock-user-id',
    source: 'google_calendar',
    external_event_id: 'google-event-1',
    start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    end_time: new Date(Date.now() + 5400000).toISOString(), // 1.5 hours from now
    summary: 'Team Standup',
    description: 'Daily standup meeting',
    location: null,
    hangout_link: 'https://meet.google.com/abc-defg-hij',
    attendees: JSON.stringify([
      { email: 'test@example.com', responseStatus: 'accepted' },
    ]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'event-2',
    user_id: 'mock-user-id',
    source: 'google_calendar',
    external_event_id: 'google-event-2',
    start_time: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    end_time: new Date(Date.now() + 90000000).toISOString(), // 1 day + 1 hour from now
    summary: 'Client Meeting',
    description: 'Quarterly review with client',
    location: 'Conference Room A',
    hangout_link: null,
    attendees: JSON.stringify([
      { email: 'test@example.com', responseStatus: 'accepted' },
      { email: 'client@example.com', responseStatus: 'accepted' },
    ]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
}

export function renderWithProviders(
  ui: ReactElement,
  { session = createMockSession(), ...renderOptions }: CustomRenderOptions = {}
) {
  const mockSupabase = createMockSupabaseClient();

  // Mock the getSession call
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session },
    error: null,
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return children; // Simplified for now - can add SupabaseProvider if needed
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockSupabase,
  };
}

// Mock fetch for API route tests
export const mockFetch = (response: any, ok = true) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 400,
      json: () => Promise.resolve(response),
    } as Response)
  );
};

// Reset fetch mock
export const resetFetchMock = () => {
  (global.fetch as jest.Mock).mockClear();
};
