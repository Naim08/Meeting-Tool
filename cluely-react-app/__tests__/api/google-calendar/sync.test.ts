import { POST } from '@/app/api/integrations/google-calendar/sync/route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock fetch for Edge Function call
global.fetch = jest.fn();

describe('/api/integrations/google-calendar/sync', () => {
  let mockSupabaseAuth: any;
  let mockSupabaseFrom: any;
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseAuth = {
      getUser: jest.fn(),
      getSession: jest.fn(),
    };

    mockSupabaseFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue({
      auth: mockSupabaseAuth,
      from: jest.fn(() => mockSupabaseFrom),
    });

    mockRequest = {
      headers: {
        get: jest.fn((header: string) => {
          if (header === 'Authorization') return 'Bearer mock-jwt-token';
          if (header === 'cookie') return 'sb-access-token=mock-cookie-token';
          return null;
        }),
      } as any,
    };
  });

  it('should successfully trigger sync via Authorization header', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    mockSupabaseFrom.maybeSingle.mockResolvedValue({
      data: {
        id: 'account-123',
        user_id: 'user-123',
        sync_enabled: true,
      },
      error: null,
    });

    // Mock successful Edge Function call
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        upserted: 5,
        message: 'Synced 5 events',
      }),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.upserted).toBe(5);

    // Verify user was authenticated
    expect(mockSupabaseAuth.getUser).toHaveBeenCalledWith('mock-jwt-token');

    // Verify calendar account was checked
    expect(mockSupabaseFrom.select).toHaveBeenCalledWith('*');
    expect(mockSupabaseFrom.eq).toHaveBeenCalledWith('user_id', 'user-123');

    // Verify Edge Function was called with JWT
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/sync_google_calendar'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token',
        }),
      })
    );
  });

  it('should successfully trigger sync via cookie fallback', async () => {
    // Mock no Authorization header
    (mockRequest.headers!.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'cookie') return 'sb-access-token=mock-cookie-token';
      return null;
    });

    mockSupabaseAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'cookie-access-token',
          user: { id: 'user-456' },
        },
      },
      error: null,
    });

    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-456',
          email: 'test2@example.com',
        },
      },
      error: null,
    });

    mockSupabaseFrom.maybeSingle.mockResolvedValue({
      data: {
        id: 'account-456',
        user_id: 'user-456',
        sync_enabled: true,
      },
      error: null,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, upserted: 3 }),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify cookie-based auth was used
    expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
    expect(mockSupabaseAuth.getUser).toHaveBeenCalledWith('cookie-access-token');
  });

  it('should return 401 if no authentication available', async () => {
    (mockRequest.headers!.get as jest.Mock).mockReturnValue(null);

    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return 404 if calendar not connected', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    // Mock no calendar account found
    mockSupabaseFrom.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Google Calendar not connected');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return 400 if sync is disabled', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    // Mock calendar account with sync disabled
    mockSupabaseFrom.maybeSingle.mockResolvedValue({
      data: {
        id: 'account-123',
        user_id: 'user-123',
        sync_enabled: false,
      },
      error: null,
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Calendar sync is disabled');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return 500 if Edge Function call fails', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    mockSupabaseFrom.maybeSingle.mockResolvedValue({
      data: {
        id: 'account-123',
        user_id: 'user-123',
        sync_enabled: true,
      },
      error: null,
    });

    // Mock Edge Function error
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        error: 'Token refresh failed',
      }),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to sync calendar');
  });

  it('should handle Edge Function network errors', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    mockSupabaseFrom.maybeSingle.mockResolvedValue({
      data: {
        id: 'account-123',
        user_id: 'user-123',
        sync_enabled: true,
      },
      error: null,
    });

    // Mock network error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to sync calendar');
  });
});
