'use client';

import React, { useState } from 'react';
import type { InterviewBrief } from '@/lib/interview-prompt';

interface InterviewBriefCardProps {
  eventId: string;
  brief: InterviewBrief | null;
  status: 'empty' | 'loading' | 'ready' | 'error';
  stale?: boolean;
  error?: string;
  regeneratedCount?: number;
  onGenerate: () => void;
  onRegenerate: () => void;
}

export function InterviewBriefCard({
  eventId,
  brief,
  status,
  stale = false,
  error,
  regeneratedCount = 0,
  onGenerate,
  onRegenerate,
}: InterviewBriefCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Handle copy to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Handle export as markdown
  const handleExportMarkdown = () => {
    if (!brief) return;

    const markdown = generateMarkdown(brief);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-brief-${eventId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Empty state: No brief generated yet
  if (status === 'empty') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-blue-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Interview Brief</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generate a personalized interview prep brief using AI
          </p>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Generate Brief
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Generating interview brief...</p>
            <p className="text-xs text-gray-500 mt-1">This usually takes 5-10 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-red-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Failed</h3>
          <p className="text-sm text-red-600 mb-4">{error || 'Failed to generate brief'}</p>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Ready state: Display brief
  if (status === 'ready' && brief) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">AI Interview Brief</h3>
          <div className="flex items-center gap-2">
            {stale && (
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                Event changed
              </span>
            )}
            {copied && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                {copied} copied!
              </span>
            )}
          </div>
        </div>

        {/* Stale warning */}
        {stale && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              The event details have changed since this brief was generated. Consider regenerating for
              updated insights.
            </p>
          </div>
        )}

        {/* Company Snapshot */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Company Snapshot</h4>
          <p className="text-sm font-medium text-blue-600 mb-2">
            {brief.company_snapshot.inferred_company}
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            {brief.company_snapshot.quick_facts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Role Hypothesis */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Role Hypothesis</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Role:</span> {brief.role_hypothesis.likely_role}
            </p>
            <p>
              <span className="font-medium">Seniority:</span> {brief.role_hypothesis.seniority_guess}
            </p>
            {brief.role_hypothesis.team_context && (
              <p>
                <span className="font-medium">Team:</span> {brief.role_hypothesis.team_context}
              </p>
            )}
          </div>
        </section>

        {/* Interviewer Angles */}
        {brief.interviewer_angle.length > 0 && (
          <section>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Interviewer Angles</h4>
            <div className="space-y-3">
              {brief.interviewer_angle.map((angle, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">{angle.angle}</p>
                  <p className="text-sm text-gray-600">{angle.why_it_matters}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Likely Topics */}
        {brief.likely_topics.length > 0 && (
          <section>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Likely Topics</h4>
            <div className="space-y-2">
              {brief.likely_topics.map((topic, idx) => (
                <div key={idx} className="border-l-2 border-blue-600 pl-3">
                  <p className="text-sm font-medium text-gray-900">{topic.topic}</p>
                  <p className="text-xs text-gray-600">{topic.why_asked}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prep Checklist */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Prep Checklist</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase mb-2">Today</p>
              <ul className="space-y-1">
                {brief.prep_checklist.today.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase mb-2">Just Before</p>
              <ul className="space-y-1">
                {brief.prep_checklist.just_before.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Stories to Prepare */}
        {brief.stories_to_prepare.length > 0 && (
          <section>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Stories to Prepare</h4>
            <div className="space-y-2">
              {brief.stories_to_prepare.map((story, idx) => (
                <div key={idx} className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900 mb-1">{story.situation}</p>
                  <p className="text-xs text-blue-700">{story.why_valuable}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Smart Questions */}
        {brief.smart_questions.length > 0 && (
          <section>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Smart Questions to Ask</h4>
            <div className="space-y-3">
              {brief.smart_questions.map((q, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">{q.question}</p>
                  <p className="text-xs text-gray-600">Signals: {q.signals}</p>
                  <button
                    onClick={() => handleCopy(q.question, 'Question')}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Risk Flags */}
        {brief.risk_flags.length > 0 && (
          <section>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Watch Out For</h4>
            <ul className="space-y-1">
              {brief.risk_flags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="text-red-600 mt-0.5">⚠️</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* One-Liners */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-2">One-Liners</h4>
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-800 uppercase mb-1">30s Intro</p>
              <p className="text-sm text-green-900">{brief.one_liners.intro_30s}</p>
              <button
                onClick={() => handleCopy(brief.one_liners.intro_30s, 'Intro')}
                className="text-xs text-green-600 hover:text-green-700 mt-2"
              >
                Copy
              </button>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs font-medium text-purple-800 uppercase mb-1">30s Closing</p>
              <p className="text-sm text-purple-900">{brief.one_liners.closing_30s}</p>
              <button
                onClick={() => handleCopy(brief.one_liners.closing_30s, 'Closing')}
                className="text-xs text-purple-600 hover:text-purple-700 mt-2"
              >
                Copy
              </button>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Regenerate
          </button>
          <button
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Markdown
          </button>
          {regeneratedCount > 0 && (
            <span className="text-xs text-gray-500 ml-auto">
              Regenerated {regeneratedCount}x
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Helper: Generate markdown export
function generateMarkdown(brief: InterviewBrief): string {
  let md = `# Interview Brief\n\n`;

  md += `## Company Snapshot\n**${brief.company_snapshot.inferred_company}**\n\n`;
  brief.company_snapshot.quick_facts.forEach((fact) => {
    md += `- ${fact}\n`;
  });

  md += `\n## Role Hypothesis\n`;
  md += `- **Role:** ${brief.role_hypothesis.likely_role}\n`;
  md += `- **Seniority:** ${brief.role_hypothesis.seniority_guess}\n`;
  if (brief.role_hypothesis.team_context) {
    md += `- **Team:** ${brief.role_hypothesis.team_context}\n`;
  }

  if (brief.interviewer_angle.length > 0) {
    md += `\n## Interviewer Angles\n`;
    brief.interviewer_angle.forEach((angle) => {
      md += `\n### ${angle.angle}\n${angle.why_it_matters}\n`;
    });
  }

  if (brief.likely_topics.length > 0) {
    md += `\n## Likely Topics\n`;
    brief.likely_topics.forEach((topic) => {
      md += `\n### ${topic.topic}\n${topic.why_asked}\n`;
    });
  }

  md += `\n## Prep Checklist\n\n### Today\n`;
  brief.prep_checklist.today.forEach((item) => {
    md += `- [ ] ${item}\n`;
  });
  md += `\n### Just Before\n`;
  brief.prep_checklist.just_before.forEach((item) => {
    md += `- [ ] ${item}\n`;
  });

  if (brief.stories_to_prepare.length > 0) {
    md += `\n## Stories to Prepare\n`;
    brief.stories_to_prepare.forEach((story) => {
      md += `\n### ${story.situation}\n${story.why_valuable}\n`;
    });
  }

  if (brief.smart_questions.length > 0) {
    md += `\n## Smart Questions to Ask\n`;
    brief.smart_questions.forEach((q) => {
      md += `\n**${q.question}**\n_Signals: ${q.signals}_\n`;
    });
  }

  if (brief.risk_flags.length > 0) {
    md += `\n## Watch Out For\n`;
    brief.risk_flags.forEach((flag) => {
      md += `- ⚠️ ${flag}\n`;
    });
  }

  md += `\n## One-Liners\n\n### 30s Intro\n${brief.one_liners.intro_30s}\n\n`;
  md += `### 30s Closing\n${brief.one_liners.closing_30s}\n`;

  return md;
}
