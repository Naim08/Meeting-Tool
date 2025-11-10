import { useState, useEffect } from 'react';
import { AudioLines } from 'lucide-react';
import { useMeetingsState } from './meetings-api';
import ActiveMeetingView from './ActiveMeetingView';
import HistoryView from './HistoryView';
import { Button } from '@/components/ui/button';
import type { Meeting, SourceType } from './types';

type View = 'active' | 'history';

export default function MeetingsView() {
  const [currentView, setCurrentView] = useState<View>('active');
  const { activeMeeting, recentMeetings, isLoading, refreshState } = useMeetingsState();

  useEffect(() => {
    if (activeMeeting) {
      setCurrentView('active');
    }
  }, [activeMeeting]);

  const normalizeSources = (sources: string | undefined): SourceType[] => {
    const raw = sources?.split(",").map((value) => value.trim()) ?? [];
    return raw.filter((value): value is SourceType => value === "microphone" || value === "system");
  };

  const normalizedRecentMeetings: Meeting[] = recentMeetings.map(m => ({
    id: m.id,
    title: m.title || 'Untitled Meeting',
    startedAt: new Date(m.started_at).toISOString(),
    endedAt: m.ended_at ? new Date(m.ended_at).toISOString() : undefined,
    wordCount: m.word_count || m.aggregated_word_count || 0,
    sources: normalizeSources(m.sources),
    isActive: m.isActive,
  }));

  const normalizedActiveMeeting: Meeting | null = activeMeeting ? {
    id: activeMeeting.id,
    title: activeMeeting.title || 'Untitled Meeting',
    startedAt: new Date(activeMeeting.startedAt).toISOString(),
    sources: (Object.entries(activeMeeting.sources) as Array<[SourceType, { enabled: boolean }]>)
      .filter(([, meta]) => meta?.enabled)
      .map(([source]) => source),
    isActive: true,
    wordCount: 0,
  } : null;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-gray-900 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-400">
              <AudioLines className="h-4 w-4" />
              <span>Live Capture</span>
            </div>
            <h1 className="mt-1 text-4xl font-bold tracking-tight">Meetings</h1>
            <p className="text-md text-gray-400">
              Manage live recordings and review past conversations.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-800 p-1">
            <Button
              variant={currentView === 'active' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full text-white"
              onClick={() => setCurrentView('active')}
            >
              Active
            </Button>
            <Button
              variant={currentView === 'history' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full text-white"
              onClick={() => setCurrentView('history')}
            >
              History
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-full min-h-[24rem] flex-col items-center justify-center text-gray-400">
            Loading meetings...
          </div>
        ) : currentView === 'active' ? (
          <ActiveMeetingView activeMeeting={normalizedActiveMeeting} refreshState={refreshState} />
        ) : (
          <HistoryView recentMeetings={normalizedRecentMeetings} />
        )}
      </div>
    </div>
  );
}
