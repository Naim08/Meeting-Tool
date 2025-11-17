/**
 * Component tests for InterviewBriefCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InterviewBriefCard } from '@/components/interview/InterviewBriefCard';
import type { InterviewBrief } from '@/lib/interview-prompt';

const mockBrief: InterviewBrief = {
  company_snapshot: {
    inferred_company: 'TechCorp',
    quick_facts: ['Founded 2020', 'Series B funded', '100 employees'],
  },
  role_hypothesis: {
    likely_role: 'Senior Software Engineer',
    seniority_guess: 'Senior',
    team_context: 'Backend Team',
  },
  interviewer_angle: [
    {
      angle: 'Technical depth',
      why_it_matters: 'Complex systems',
    },
  ],
  likely_topics: [
    {
      topic: 'System design',
      why_asked: 'Core skill',
    },
  ],
  prep_checklist: {
    today: ['Review distributed systems', 'Prepare STAR stories'],
    just_before: ['Review company website'],
  },
  stories_to_prepare: [
    {
      situation: 'Scaled system 10x',
      why_valuable: 'Shows growth experience',
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
    intro_30s: 'I am a senior engineer with 8 years of experience in distributed systems.',
    closing_30s: 'I am excited about this opportunity to work on challenging problems.',
  },
};

describe('InterviewBriefCard', () => {
  describe('Empty state', () => {
    it('should render empty state with generate button', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={null}
          status="empty"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      expect(screen.getByText('AI Interview Brief')).toBeInTheDocument();
      expect(screen.getByText(/Generate a personalized/i)).toBeInTheDocument();
      expect(screen.getByText('Generate Brief')).toBeInTheDocument();
    });

    it('should call onGenerate when button clicked', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={null}
          status="empty"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      fireEvent.click(screen.getByText('Generate Brief'));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('should render loading state with spinner', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={null}
          status="loading"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      expect(screen.getByText(/Generating interview brief/i)).toBeInTheDocument();
      expect(screen.getByText(/This usually takes 5-10 seconds/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should render error state with retry button', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={null}
          status="error"
          error="Failed to generate"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to generate')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should call onGenerate when retry button clicked', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={null}
          status="error"
          error="Failed to generate"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      fireEvent.click(screen.getByText('Try Again'));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ready state', () => {
    it('should render full brief with all sections', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={mockBrief}
          status="ready"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      // Company snapshot
      expect(screen.getByText('TechCorp')).toBeInTheDocument();
      expect(screen.getByText('Founded 2020')).toBeInTheDocument();

      // Role
      expect(screen.getByText(/Senior Software Engineer/i)).toBeInTheDocument();

      // Smart questions
      expect(screen.getByText(/What are your biggest technical challenges/i)).toBeInTheDocument();

      // One-liners
      expect(screen.getByText(/I am a senior engineer with 8 years/i)).toBeInTheDocument();

      // Buttons
      expect(screen.getByText('Regenerate')).toBeInTheDocument();
      expect(screen.getByText('Export Markdown')).toBeInTheDocument();
    });

    it('should call onRegenerate when button clicked', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={mockBrief}
          status="ready"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      fireEvent.click(screen.getByText('Regenerate'));
      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });

    it('should show stale warning when stale prop is true', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={mockBrief}
          status="ready"
          stale={true}
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      expect(screen.getByText(/Event changed/i)).toBeInTheDocument();
      expect(screen.getByText(/event details have changed/i)).toBeInTheDocument();
    });

    it('should show regeneration count', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={mockBrief}
          status="ready"
          regeneratedCount={3}
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      expect(screen.getByText('Regenerated 3x')).toBeInTheDocument();
    });
  });

  describe('Copy functionality', () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('should copy text to clipboard when copy button clicked', async () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={mockBrief}
          status="ready"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      // Find first copy button (for smart questions)
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'What are your biggest technical challenges?'
      );
    });
  });

  describe('Export functionality', () => {
    it('should trigger markdown download when export clicked', () => {
      const onGenerate = jest.fn();
      const onRegenerate = jest.fn();

      // Mock URL.createObjectURL and link click
      const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      const mockClick = jest.fn();
      const mockCreateElement = jest.spyOn(document, 'createElement');
      mockCreateElement.mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as any);

      render(
        <InterviewBriefCard
          eventId="event-123"
          brief={mockBrief}
          status="ready"
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
        />
      );

      fireEvent.click(screen.getByText('Export Markdown'));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });
});
