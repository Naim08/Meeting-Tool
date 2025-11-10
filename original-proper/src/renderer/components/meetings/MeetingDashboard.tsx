import { useMemo } from 'react';
import { MessageCircle, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingDetails } from "./meetings-api";
import { Source, formatTimestamp, formatDuration } from "./helpers";

interface DashboardProps {
    meetingId: string | null;
    details: MeetingDetails | null;
    isLoading: boolean;
}

type ConversationEntry = {
  id: string;
  source: Source;
  text: string;
  timestamp: number | null;
  speaker?: string | number | null;
};

const ConversationBubble = ({ entry }: { entry: ConversationEntry }) => {
    const isUser = entry.source === 'microphone';
    const bubbleClasses = isUser
        ? 'bg-primary text-primary-foreground self-end'
        : 'bg-muted text-muted-foreground self-start';

    return (
        <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${bubbleClasses}`}>
            {entry.text}
        </div>
    );
};

export default function MeetingDashboard({ meetingId, details, isLoading }: DashboardProps) {
    const conversationFeed = useMemo<ConversationEntry[]>(() => {
        if (!details?.transcriptions) return [];
        const entries: ConversationEntry[] = [];
        details.transcriptions.forEach(tx => {
            tx.segments.forEach((segment, i) => {
                entries.push({
                    id: `${tx.id}-${segment.id || i}`,
                    source: tx.source,
                    text: segment.text,
                    timestamp: details.startedAt + (segment.startTime ?? 0),
                    speaker: segment.speaker,
                });
            });
        });
        return entries.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    }, [details]);

    if (isLoading) {
        return (
            <div className="flex h-full min-h-[24rem] flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-muted-foreground">
                Loading details...
            </div>
        );
    }

    if (!meetingId || !details) {
        return (
            <div className="flex h-full min-h-[24rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/80 text-center text-sm text-muted-foreground">
                Select a meeting from the list to see its details.
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-[24rem] flex-col rounded-2xl border border-border/60 bg-card/95 shadow-lg">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
                <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{details.title || 'Untitled Meeting'}</h3>
                    <p className="text-xs text-muted-foreground">
                        {formatTimestamp(details.startedAt, { month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                    {/* Summary Card */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="rounded-lg bg-muted/50 p-3">
                            <div className="text-xs text-muted-foreground">Duration</div>
                            <div className="font-semibold">{formatDuration(details.duration)}</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                            <div className="text-xs text-muted-foreground">Words</div>
                            <div className="font-semibold">{details.wordCount}</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                            <div className="text-xs text-muted-foreground">Sources</div>
                            <div className="font-semibold">{details.transcriptions.length}</div>
                        </div>
                    </div>

                    {/* Transcript */}
                    <div className="space-y-2 pt-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                            <MessageCircle className="h-4 w-4" />
                            Transcript
                        </h4>
                        <div className="flex flex-col gap-3 rounded-lg bg-background p-4 max-h-[60vh] overflow-y-auto">
                            {conversationFeed.length > 0 ? (
                                conversationFeed.map(entry => <ConversationBubble key={entry.id} entry={entry} />)
                            ) : (
                                <p className="text-center text-sm text-muted-foreground py-8">No transcript available.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
