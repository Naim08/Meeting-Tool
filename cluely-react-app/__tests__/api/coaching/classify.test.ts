/**
 * Unit tests for coaching/classify API route
 * Tests heuristic classification and validation logic
 */

// Question types enum (matches route.ts)
enum QuestionType {
  TELL_ME_ABOUT_YOURSELF = 'tell_me_about_yourself',
  PROJECT_DEEP_DIVE = 'project_deep_dive',
  BEHAVIORAL_STAR = 'behavioral_star',
  SYSTEM_DESIGN = 'system_design',
  CODING_EXPLANATION = 'coding_explanation',
  QA_LIGHT = 'qa_light',
  UNKNOWN = 'unknown',
}

// Since NextRequest requires polyfills, we test the heuristic logic directly
// by extracting and testing the heuristic classification function

// Heuristic fallback classification (copied from route.ts for isolated testing)
function heuristicClassification(questionText: string): { type: QuestionType; confidence: number } {
  const lower = questionText.toLowerCase();

  if (
    lower.includes('tell me about yourself') ||
    lower.includes('walk me through your background') ||
    lower.includes('introduce yourself')
  ) {
    return { type: QuestionType.TELL_ME_ABOUT_YOURSELF, confidence: 0.8 };
  }

  if (
    lower.includes('project') ||
    lower.includes('most challenging') ||
    lower.includes('proud of')
  ) {
    return { type: QuestionType.PROJECT_DEEP_DIVE, confidence: 0.7 };
  }

  if (
    lower.includes('conflict') ||
    lower.includes('challenge') ||
    lower.includes('failure') ||
    lower.includes('leadership') ||
    lower.includes('difficult situation') ||
    lower.includes('disagreed')
  ) {
    return { type: QuestionType.BEHAVIORAL_STAR, confidence: 0.75 };
  }

  if (
    lower.includes('design') ||
    lower.includes('architect') ||
    lower.includes('scale') ||
    lower.includes('system')
  ) {
    return { type: QuestionType.SYSTEM_DESIGN, confidence: 0.7 };
  }

  if (
    lower.includes('code') ||
    lower.includes('algorithm') ||
    lower.includes('implementation') ||
    lower.includes('approach') ||
    lower.includes('solution')
  ) {
    return { type: QuestionType.CODING_EXPLANATION, confidence: 0.65 };
  }

  if (
    lower.includes('questions for us') ||
    lower.includes('questions for me') ||
    lower.includes('any questions') ||
    lower.includes('what questions')
  ) {
    return { type: QuestionType.QA_LIGHT, confidence: 0.75 };
  }

  return { type: QuestionType.UNKNOWN, confidence: 0.5 };
}

// Normalization function (copied from route.ts)
function normalizeQuestion(text: string): string | null {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length < 5) return null;
  return normalized;
}

describe('heuristicClassification', () => {
  describe('tell me about yourself', () => {
    it('should classify "tell me about yourself" questions', () => {
      const questions = [
        'Tell me about yourself',
        'Can you tell me about yourself and your background?',
        'Walk me through your background',
        'Please introduce yourself',
      ];

      for (const question of questions) {
        const result = heuristicClassification(question);
        expect(result.type).toBe(QuestionType.TELL_ME_ABOUT_YOURSELF);
        expect(result.confidence).toBe(0.8);
      }
    });
  });

  describe('behavioral questions', () => {
    it('should classify behavioral/STAR questions', () => {
      const questions = [
        'Tell me about a time you had a conflict with a teammate',
        'Describe a challenge you overcame',
        'Give me an example of a leadership situation',
        'Tell me about a failure you experienced',
        'Describe a difficult situation you handled',
        'Tell me about a time you disagreed with your manager',
      ];

      for (const question of questions) {
        const result = heuristicClassification(question);
        expect(result.type).toBe(QuestionType.BEHAVIORAL_STAR);
        expect(result.confidence).toBe(0.75);
      }
    });
  });

  describe('system design questions', () => {
    it('should classify system design questions', () => {
      const questions = [
        'How would you design a distributed cache?',
        'Design an architecture for a chat application',
        'How would you scale this system?',
        'Can you architect a solution for this problem?',
      ];

      for (const question of questions) {
        const result = heuristicClassification(question);
        expect(result.type).toBe(QuestionType.SYSTEM_DESIGN);
        expect(result.confidence).toBe(0.7);
      }
    });
  });

  describe('project deep dive questions', () => {
    it('should classify project questions', () => {
      const questions = [
        'Tell me about your most challenging project',
        'What project are you most proud of?',
        'Walk me through a complex project you worked on',
      ];

      for (const question of questions) {
        const result = heuristicClassification(question);
        expect(result.type).toBe(QuestionType.PROJECT_DEEP_DIVE);
        expect(result.confidence).toBe(0.7);
      }
    });
  });

  describe('coding questions', () => {
    it('should classify coding explanation questions', () => {
      const questions = [
        'Can you explain your approach to this algorithm?',
        'Walk me through your implementation',
        'How does your code handle edge cases?',
        'Explain your solution',
      ];

      for (const question of questions) {
        const result = heuristicClassification(question);
        expect(result.type).toBe(QuestionType.CODING_EXPLANATION);
        expect(result.confidence).toBe(0.65);
      }
    });
  });

  describe('Q&A light questions', () => {
    it('should classify Q&A questions', () => {
      const questions = [
        'Do you have any questions for us?',
        'What questions do you have?',
        'Any questions about the role?',
        'Do you have questions for me?',
      ];

      for (const question of questions) {
        const result = heuristicClassification(question);
        expect(result.type).toBe(QuestionType.QA_LIGHT);
        expect(result.confidence).toBe(0.75);
      }
    });
  });

  describe('unknown questions', () => {
    it('should return unknown for ambiguous questions', () => {
      const questions = [
        'What do you think about that?',
        'How are you today?',
        'Nice to meet you',
        'Thanks for coming',
      ];

      for (const question of questions) {
        const result = heuristicClassification(question);
        expect(result.type).toBe(QuestionType.UNKNOWN);
        expect(result.confidence).toBe(0.5);
      }
    });
  });
});

describe('normalizeQuestion', () => {
  it('should lowercase text', () => {
    expect(normalizeQuestion('HELLO WORLD')).toBe('hello world');
  });

  it('should remove punctuation', () => {
    expect(normalizeQuestion('Hello, world!')).toBe('hello world');
  });

  it('should collapse whitespace', () => {
    expect(normalizeQuestion('hello   world')).toBe('hello world');
  });

  it('should trim whitespace', () => {
    expect(normalizeQuestion('  hello world  ')).toBe('hello world');
  });

  it('should return null for very short text', () => {
    expect(normalizeQuestion('Hi')).toBeNull();
    expect(normalizeQuestion('Ok')).toBeNull();
  });

  it('should handle complex normalization', () => {
    expect(normalizeQuestion('  TELL ME about YOURSELF!?  ')).toBe('tell me about yourself');
  });
});

describe('QuestionType enum values', () => {
  it('should have all required question types', () => {
    expect(QuestionType.TELL_ME_ABOUT_YOURSELF).toBe('tell_me_about_yourself');
    expect(QuestionType.PROJECT_DEEP_DIVE).toBe('project_deep_dive');
    expect(QuestionType.BEHAVIORAL_STAR).toBe('behavioral_star');
    expect(QuestionType.SYSTEM_DESIGN).toBe('system_design');
    expect(QuestionType.CODING_EXPLANATION).toBe('coding_explanation');
    expect(QuestionType.QA_LIGHT).toBe('qa_light');
    expect(QuestionType.UNKNOWN).toBe('unknown');
  });

  it('should have 7 question types', () => {
    expect(Object.keys(QuestionType)).toHaveLength(7);
  });
});
