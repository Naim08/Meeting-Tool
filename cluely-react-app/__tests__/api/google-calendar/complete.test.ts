import { POST } from '@/app/api/integrations/google-calendar/complete/route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('/api/integrations/google-calendar/complete', () => {
  let mockSupabaseAuth: any;
  let mockSupabaseFrom: any;
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Supabase auth
    mockSupabaseAuth = {
      getUser: jest.fn(),
    };

    // Mock Supabase from (database operations)
    mockSupabaseFrom = {
      upsert: jest.fn().mockResolvedValue({
        data: { id: 'mock-account-id' },
        error: null,
      }),
    };

    // Mock createClient to return mocked Supabase client
    (createClient as jest.Mock).mockReturnValue({
      auth: mockSupabaseAuth,
      from: jest.fn(() => mockSupabaseFrom),
    });

    // Mock request with valid Authorization header
    mockRequest = {
      headers: {
        get: jest.fn((header: string) => {
          if (header === 'Authorization') return 'Bearer mock-jwt-token';
          return null;
        }),
      } as any,
      json: jest.fn(),
    };
  });

  it('should successfully complete OAuth and store tokens', async () => {
    // Mock successful user authentication
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    // Mock request body
    (mockRequest.json as jest.Mock).mockResolvedValue({
      provider_token: 'mock-access-token',
      provider_refresh_token: 'mock-refresh-token',
      google_user_id: 'google-123',
      email: 'test@gmail.com',
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Google Calendar connected successfully');

    // Verify user was authenticated
    expect(mockSupabaseAuth.getUser).toHaveBeenCalledWith('mock-jwt-token');

    // Verify tokens were stored
    expect(mockSupabaseFrom.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        google_user_id: 'google-123',
        email: 'test@gmail.com',
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        sync_enabled: true,
      }),
      { onConflict: 'user_id' }
    );
  });

  it('should return 401 if no authorization token provided', async () => {
    // Mock request without Authorization header
    (mockRequest.headers!.get as jest.Mock).mockReturnValue(null);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
    expect(mockSupabaseAuth.getUser).not.toHaveBeenCalled();
  });

  it('should return 401 if user authentication fails', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    (mockRequest.json as jest.Mock).mockResolvedValue({
      provider_token: 'mock-access-token',
      provider_refresh_token: 'mock-refresh-token',
      google_user_id: 'google-123',
      email: 'test@gmail.com',
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 400 if required fields are missing', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    // Mock incomplete request body
    (mockRequest.json as jest.Mock).mockResolvedValue({
      provider_token: 'mock-access-token',
      // Missing provider_refresh_token, google_user_id, email
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required');
  });

  it('should return 500 if database upsert fails', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    (mockRequest.json as jest.Mock).mockResolvedValue({
      provider_token: 'mock-access-token',
      provider_refresh_token: 'mock-refresh-token',
      google_user_id: 'google-123',
      email: 'test@gmail.com',
    });

    // Mock database error
    mockSupabaseFrom.upsert.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed', code: 'DB_ERROR' },
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to connect Google Calendar');
  });

  it('should calculate correct token expiry time', async () => {
    const mockNow = new Date('2025-11-14T12:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    (mockRequest.json as jest.Mock).mockResolvedValue({
      provider_token: 'mock-access-token',
      provider_refresh_token: 'mock-refresh-token',
      google_user_id: 'google-123',
      email: 'test@gmail.com',
    });

    await POST(mockRequest as NextRequest);

    // Verify expires_at is set to 1 hour from now
    const expectedExpiry = new Date(mockNow.getTime() + 3600 * 1000).toISOString();
    expect(mockSupabaseFrom.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        expires_at: expectedExpiry,
      }),
      { onConflict: 'user_id' }
    );

    jest.restoreAllMocks();
  });
});
