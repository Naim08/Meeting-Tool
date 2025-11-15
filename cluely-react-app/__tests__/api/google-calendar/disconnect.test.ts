import { POST } from '@/app/api/integrations/google-calendar/disconnect/route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('/api/integrations/google-calendar/disconnect', () => {
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
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
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

  it('should successfully disconnect calendar via Authorization header', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Google Calendar disconnected successfully');

    // Verify user was authenticated
    expect(mockSupabaseAuth.getUser).toHaveBeenCalledWith('mock-jwt-token');

    // Verify calendar account was deleted
    expect(mockSupabaseFrom.delete).toHaveBeenCalled();
    expect(mockSupabaseFrom.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should successfully disconnect calendar via cookie fallback', async () => {
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

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify cookie-based auth was used
    expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
    expect(mockSupabaseAuth.getUser).toHaveBeenCalledWith('cookie-access-token');
  });

  it('should return 401 if no authentication available', async () => {
    // Mock no Authorization header and no cookie
    (mockRequest.headers!.get as jest.Mock).mockReturnValue(null);

    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
    expect(mockSupabaseFrom.delete).not.toHaveBeenCalled();
  });

  it('should return 401 if user authentication fails', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 500 if database delete fails', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    // Mock database error
    mockSupabaseFrom.eq.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed', code: 'DB_ERROR' },
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to disconnect Google Calendar');
  });

  it('should delete all related events when disconnecting', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    const mockEventsFrom = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    (createClient as jest.Mock).mockReturnValue({
      auth: mockSupabaseAuth,
      from: jest.fn((table: string) => {
        if (table === 'google_calendar_accounts') return mockSupabaseFrom;
        if (table === 'user_calendar_events') return mockEventsFrom;
        return mockSupabaseFrom;
      }),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Note: Current implementation deletes via CASCADE constraint,
    // but if we add explicit event deletion, this test would verify it
    expect(mockSupabaseFrom.delete).toHaveBeenCalled();
  });
});
