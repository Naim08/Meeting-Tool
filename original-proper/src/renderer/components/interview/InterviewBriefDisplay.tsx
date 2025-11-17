import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabaseDb2 } from '@/supabase-db2-client';

interface InterviewBrief {
  company_snapshot: {
    inferred_company: string;
    quick_facts: string[];
  };
  role_hypothesis: {
    likely_role: string;
    seniority_guess: string;
    team_context?: string;
  };
  interviewer_angle: Array<{
    angle: string;
    why_it_matters: string;
  }>;
  likely_topics: Array<{
    topic: string;
    why_asked: string;
  }>;
  prep_checklist: {
    today: string[];
    just_before: string[];
  };
  stories_to_prepare: Array<{
    situation: string;
    why_valuable: string;
  }>;
  smart_questions: Array<{
    question: string;
    signals: string;
  }>;
  risk_flags: string[];
  one_liners: {
    intro_30s: string;
    closing_30s: string;
  };
}

interface BriefData {
  brief: InterviewBrief;
  status: string;
  stale: boolean;
  regenerated_count: number;
  created_at: string; // When the brief was first created
  updated_at: string; // When the brief was last updated
}

interface InterviewBriefDisplayProps {
  eventId: string;
  session: Session | null;
}

export function InterviewBriefDisplay({ eventId, session }: InterviewBriefDisplayProps) {
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch brief on mount
  useEffect(() => {
    if (!session || !eventId) {
      setLoading(false);
      return;
    }

    const fetchBrief = async () => {
      try {
        const { data, error: fetchError } = await supabaseDb2
          .from('interview_briefs')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          setBriefData(data);
        }
      } catch (err) {
        console.error('[InterviewBriefDisplay] Fetch error:', err);
        setError('Failed to load brief');
      } finally {
        setLoading(false);
      }
    };

    fetchBrief();
  }, [eventId, session]);

  // Generate brief
  const handleGenerate = async () => {
    if (!session || generating) return;

    setGenerating(true);
    setError(null);

    try {
      const siteUrl = 'http://localhost:3000'; // TODO: Make this configurable
      const response = await fetch(`${siteUrl}/api/interview-brief/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();

      // Note: API returns generated_at, which is mapped from created_at
      setBriefData({
        brief: result.brief,
        status: 'ready',
        stale: false,
        regenerated_count: 0,
        created_at: result.generated_at,
        updated_at: result.generated_at,
      });
    } catch (err) {
      console.error('[InterviewBriefDisplay] Generate error:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700 mb-2">{error}</p>
        <button
          onClick={handleGenerate}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (!briefData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="w-12 h-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p className="text-sm text-gray-600 mb-3">No brief generated yet</p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? 'Generating...' : 'Generate Brief'}
        </button>
      </div>
    );
  }

  // Display brief (compact version for Electron)
  const { brief } = briefData;

  return (
    <div className="space-y-4 text-sm">
      {/* Stale warning */}
      {briefData.stale && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
          Event details changed. Consider regenerating.
        </div>
      )}

      {/* Company */}
      <section>
        <h4 className="font-semibold text-gray-900 mb-1">
          {brief.company_snapshot.inferred_company}
        </h4>
        <ul className="text-xs text-gray-700 space-y-0.5 ml-3">
          {brief.company_snapshot.quick_facts.map((fact, idx) => (
            <li key={idx} className="list-disc">
              {fact}
            </li>
          ))}
        </ul>
      </section>

      {/* Role */}
      <section>
        <h4 className="font-semibold text-gray-900 mb-1">Role</h4>
        <p className="text-xs text-gray-700">
          {brief.role_hypothesis.likely_role} ({brief.role_hypothesis.seniority_guess})
        </p>
      </section>

      {/* Smart Questions */}
      {brief.smart_questions.length > 0 && (
        <section>
          <h4 className="font-semibold text-gray-900 mb-1">Smart Questions</h4>
          <div className="space-y-2">
            {brief.smart_questions.map((q, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-2">
                <p className="text-xs font-medium text-gray-900 mb-1">{q.question}</p>
                <button
                  onClick={() => copyToClipboard(q.question)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* One-Liners with Quick Copy */}
      <section>
        <h4 className="font-semibold text-gray-900 mb-1">One-Liners</h4>
        <div className="space-y-2">
          <div className="bg-green-50 border border-green-200 rounded p-2">
            <p className="text-xs font-medium text-green-800 mb-1">30s Intro</p>
            <p className="text-xs text-green-900 mb-1">{brief.one_liners.intro_30s}</p>
            <button
              onClick={() => copyToClipboard(brief.one_liners.intro_30s)}
              className="text-xs text-green-600 hover:text-green-700"
            >
              Copy
            </button>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-2">
            <p className="text-xs font-medium text-purple-800 mb-1">30s Closing</p>
            <p className="text-xs text-purple-900 mb-1">{brief.one_liners.closing_30s}</p>
            <button
              onClick={() => copyToClipboard(brief.one_liners.closing_30s)}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      {/* Prep Checklist */}
      <section>
        <h4 className="font-semibold text-gray-900 mb-1">Prep Checklist</h4>
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase mb-1">Today</p>
            <ul className="space-y-0.5">
              {brief.prep_checklist.today.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <input type="checkbox" className="mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase mb-1">Just Before</p>
            <ul className="space-y-0.5">
              {brief.prep_checklist.just_before.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <input type="checkbox" className="mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Risk Flags */}
      {brief.risk_flags.length > 0 && (
        <section>
          <h4 className="font-semibold text-gray-900 mb-1">Watch Out For</h4>
          <ul className="space-y-0.5">
            {brief.risk_flags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-1 text-xs text-red-700">
                <span className="text-red-600">⚠️</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
