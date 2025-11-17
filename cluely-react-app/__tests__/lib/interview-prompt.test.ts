/**
 * Unit tests for interview-prompt.ts
 * Tests schema validation, prompt building, and event payload extraction
 */

import {
  InterviewBriefSchema,
  validateBrief,
  buildEventPrompt,
  extractEventPayload,
  type CalendarEvent,
  type EventPayload,
} from '@/lib/interview-prompt';

describe('InterviewBriefSchema', () => {
  it('should validate a complete valid brief', () => {
    const validBrief = {
      company_snapshot: {
        inferred_company: 'TechCorp',
        quick_facts: ['Founded 2020', 'Series B funded', '50-200 employees'],
      },
      role_hypothesis: {
        likely_role: 'Senior Software Engineer',
        seniority_guess: 'Senior',
        team_context: 'Backend Infrastructure',
      },
      interviewer_angle: [
        {
          angle: 'Technical depth',
          why_it_matters: 'Complex distributed systems',
        },
      ],
      likely_topics: [
        {
          topic: 'System design',
          why_asked: 'Core responsibility',
        },
      ],
      prep_checklist: {
        today: ['Review distributed systems', 'Prepare STAR stories'],
        just_before: ['Review company website'],
      },
      stories_to_prepare: [
        {
          situation: 'Scaled system 10x',
          why_valuable: 'Demonstrates growth experience',
        },
      ],
      smart_questions: [
        {
          question: 'What are your biggest technical challenges?',
          signals: 'Team priorities',
        },
      ],
      risk_flags: ['Fast-paced environment'],
      one_liners: {
        intro_30s: 'I am a senior engineer with 8 years of experience...',
        closing_30s: 'I am excited about this opportunity because...',
      },
    };

    const result = InterviewBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
  });

  it('should reject brief with missing required fields', () => {
    const invalidBrief = {
      company_snapshot: {
        inferred_company: 'TechCorp',
        quick_facts: ['Founded 2020'],
      },
      // Missing role_hypothesis and other required fields
    };

    const result = InterviewBriefSchema.safeParse(invalidBrief);
    expect(result.success).toBe(false);
  });

  it('should reject brief with arrays exceeding max length', () => {
    const invalidBrief = {
      company_snapshot: {
        inferred_company: 'TechCorp',
        quick_facts: ['Fact 1', 'Fact 2', 'Fact 3', 'Fact 4'], // max 3
      },
      role_hypothesis: {
        likely_role: 'Engineer',
        seniority_guess: 'Senior',
      },
      interviewer_angle: [],
      likely_topics: [],
      prep_checklist: {
        today: [],
        just_before: [],
      },
      stories_to_prepare: [],
      smart_questions: [],
      risk_flags: [],
      one_liners: {
        intro_30s: 'intro',
        closing_30s: 'closing',
      },
    };

    const result = InterviewBriefSchema.safeParse(invalidBrief);
    expect(result.success).toBe(false);
  });

  it('should accept optional team_context field', () => {
    const briefWithoutTeamContext = {
      company_snapshot: {
        inferred_company: 'TechCorp',
        quick_facts: ['Founded 2020'],
      },
      role_hypothesis: {
        likely_role: 'Engineer',
        seniority_guess: 'Senior',
        // team_context is optional
      },
      interviewer_angle: [],
      likely_topics: [],
      prep_checklist: {
        today: [],
        just_before: [],
      },
      stories_to_prepare: [],
      smart_questions: [],
      risk_flags: [],
      one_liners: {
        intro_30s: 'intro',
        closing_30s: 'closing',
      },
    };

    const result = InterviewBriefSchema.safeParse(briefWithoutTeamContext);
    expect(result.success).toBe(true);
  });
});

describe('validateBrief', () => {
  it('should return success for valid brief', () => {
    const validData = {
      company_snapshot: {
        inferred_company: 'TechCorp',
        quick_facts: ['Founded 2020'],
      },
      role_hypothesis: {
        likely_role: 'Engineer',
        seniority_guess: 'Senior',
      },
      interviewer_angle: [],
      likely_topics: [],
      prep_checklist: {
        today: [],
        just_before: [],
      },
      stories_to_prepare: [],
      smart_questions: [],
      risk_flags: [],
      one_liners: {
        intro_30s: 'intro',
        closing_30s: 'closing',
      },
    };

    const result = validateBrief(validData);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return error for invalid brief', () => {
    const invalidData = {
      company_snapshot: {
        inferred_company: 'TechCorp',
        // Missing quick_facts
      },
    };

    const result = validateBrief(invalidData);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Schema validation failed');
  });
});

describe('buildEventPrompt', () => {
  it('should build JSON prompt from event payload', () => {
    const payload: EventPayload = {
      summary: 'Technical Interview with TechCorp',
      description: 'Discuss system design and architecture',
      startTime: '2025-01-20T10:00:00Z',
      endTime: '2025-01-20T11:00:00Z',
      location: 'Google Meet',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      organizerDomain: 'techcorp.com',
    };

    const prompt = buildEventPrompt(payload);

    expect(prompt).toContain('Technical Interview with TechCorp');
    expect(prompt).toContain('Discuss system design and architecture');
    expect(prompt).toContain('techcorp.com');
    expect(prompt).toContain('duration_minutes');
  });

  it('should handle missing optional fields', () => {
    const payload: EventPayload = {
      summary: 'Interview',
      startTime: '2025-01-20T10:00:00Z',
      endTime: '2025-01-20T11:00:00Z',
    };

    const prompt = buildEventPrompt(payload);

    expect(prompt).toContain('Interview');
    expect(prompt).toContain('(no description provided)');
    expect(prompt).toContain('(not specified)');
  });

  it('should calculate duration correctly', () => {
    const payload: EventPayload = {
      summary: 'Interview',
      startTime: '2025-01-20T10:00:00Z',
      endTime: '2025-01-20T11:30:00Z', // 90 minutes
    };

    const prompt = buildEventPrompt(payload);
    const parsed = JSON.parse(prompt);

    expect(parsed.duration_minutes).toBe(90);
  });
});

describe('extractEventPayload', () => {
  it('should extract payload from calendar event', () => {
    const event: CalendarEvent = {
      id: 'event-123',
      user_id: 'user-456',
      summary: 'Technical Interview',
      description: 'System design discussion',
      start_time: '2025-01-20T10:00:00Z',
      end_time: '2025-01-20T11:00:00Z',
      location: 'Google Meet',
      hangout_link: 'https://meet.google.com/abc-defg-hij',
      raw_payload: {
        organizer: {
          email: 'recruiter@techcorp.com',
        },
      },
    };

    const payload = extractEventPayload(event);

    expect(payload.summary).toBe('Technical Interview');
    expect(payload.description).toBe('System design discussion');
    expect(payload.startTime).toBe('2025-01-20T10:00:00Z');
    expect(payload.endTime).toBe('2025-01-20T11:00:00Z');
    expect(payload.location).toBe('Google Meet');
    expect(payload.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
    expect(payload.organizerDomain).toBe('techcorp.com');
  });

  it('should handle null/undefined fields', () => {
    const event: CalendarEvent = {
      id: 'event-123',
      user_id: 'user-456',
      summary: 'Interview',
      description: null,
      start_time: '2025-01-20T10:00:00Z',
      end_time: '2025-01-20T11:00:00Z',
      location: null,
      hangout_link: null,
      raw_payload: null,
    };

    const payload = extractEventPayload(event);

    expect(payload.summary).toBe('Interview');
    expect(payload.description).toBeUndefined();
    expect(payload.location).toBeUndefined();
    expect(payload.meetingUrl).toBeUndefined();
    expect(payload.organizerDomain).toBeUndefined();
  });

  it('should handle missing organizer email', () => {
    const event: CalendarEvent = {
      id: 'event-123',
      user_id: 'user-456',
      summary: 'Interview',
      description: null,
      start_time: '2025-01-20T10:00:00Z',
      end_time: '2025-01-20T11:00:00Z',
      location: null,
      hangout_link: null,
      raw_payload: {
        organizer: {},
      },
    };

    const payload = extractEventPayload(event);

    expect(payload.organizerDomain).toBeUndefined();
  });

  it('should default to "Untitled Interview" for empty summary', () => {
    const event: CalendarEvent = {
      id: 'event-123',
      user_id: 'user-456',
      summary: '',
      description: null,
      start_time: '2025-01-20T10:00:00Z',
      end_time: '2025-01-20T11:00:00Z',
      location: null,
      hangout_link: null,
      raw_payload: null,
    };

    const payload = extractEventPayload(event);

    expect(payload.summary).toBe('Untitled Interview');
  });
});
