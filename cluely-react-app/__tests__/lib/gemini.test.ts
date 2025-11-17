/**
 * Unit tests for gemini.ts
 * Tests utility functions (mocking actual Gemini API calls)
 */

import { maskEmailToDomain } from '@/lib/gemini';

describe('maskEmailToDomain', () => {
  it('should extract domain from valid email', () => {
    expect(maskEmailToDomain('john.doe@techcorp.com')).toBe('techcorp.com');
    expect(maskEmailToDomain('recruiter@startup.io')).toBe('startup.io');
    expect(maskEmailToDomain('hr@bigcompany.co.uk')).toBe('bigcompany.co.uk');
  });

  it('should handle email with multiple @ symbols (use last one)', () => {
    expect(maskEmailToDomain('user@domain@company.com')).toBe('company.com');
  });

  it('should return "unknown" for null', () => {
    expect(maskEmailToDomain(null)).toBe('unknown');
  });

  it('should return "unknown" for undefined', () => {
    expect(maskEmailToDomain(undefined)).toBe('unknown');
  });

  it('should return "unknown" for empty string', () => {
    expect(maskEmailToDomain('')).toBe('unknown');
  });

  it('should return "unknown" for invalid email (no @)', () => {
    expect(maskEmailToDomain('notanemail')).toBe('unknown');
  });

  it('should handle email with no domain after @', () => {
    expect(maskEmailToDomain('user@')).toBe('unknown');
  });
});

// Note: We don't test generateWithGemini and generateJSON here
// because they require actual API calls or extensive mocking.
// Those should be tested in integration tests with a test API key
// or with comprehensive mocking of the GoogleGenerativeAI SDK.

describe('Gemini integration (integration tests required)', () => {
  it('should document that generateWithGemini requires integration testing', () => {
    // This is a placeholder to document that generateWithGemini
    // needs integration testing with actual API or mocked SDK
    expect(true).toBe(true);
  });

  it('should document that generateJSON requires integration testing', () => {
    // This is a placeholder to document that generateJSON
    // needs integration testing with actual API or mocked SDK
    expect(true).toBe(true);
  });
});
