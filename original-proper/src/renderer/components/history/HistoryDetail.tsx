import * as React from 'react'
import { useMemo } from 'react'
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Download,
  RotateCcw,
  Trash2,
  Calendar,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/ExportButton'
import MessageList from '@/components/message-list'
import type { ChatSessionWithMessages } from '../../../types/chat-history'
import { cn } from '@/lib/utils'

interface HistoryDetailProps {
  session: ChatSessionWithMessages
  onBack: () => void
  onDelete: () => void
  onResume?: () => void
  isDeleting?: boolean
  className?: string
}

const formatTimestamp = (value: number | null | undefined) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const formatDuration = (startedAt: number, endedAt: number | null) => {
  if (!endedAt) return 'In progress'
  const durationMs = endedAt - startedAt
  if (durationMs <= 0) return 'Less than a minute'
  const minutes = Math.floor(durationMs / 60000)
  if (minutes < 1) {
    const seconds = Math.floor(durationMs / 1000)
    return `${seconds} seconds`
  }
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  return `${hours} hours ${minutes % 60} minutes`
}

const HistoryDetail: React.FC<HistoryDetailProps> = ({
  session,
  onBack,
  onDelete,
  onResume,
  isDeleting = false,
  className,
}) => {
  const formattedMessages = useMemo(() => {
    if (!session.messages.length) return []
    return session.messages
      .filter(
        (message) => message.role === 'user' || message.role === 'assistant'
      )
      .map((message) => {
        let attachmentMeta: unknown = undefined
        if (message.attachmentMeta) {
          try {
            attachmentMeta = JSON.parse(message.attachmentMeta)
          } catch (err) {
            console.warn('[HistoryDetail] Failed to parse attachment meta', err)
          }
        }
        let rawMeta: unknown = undefined
        if (message.rawJson) {
          try {
            rawMeta = JSON.parse(message.rawJson)
          } catch (err) {
            console.warn('[HistoryDetail] Failed to parse message rawJson', err)
          }
        }
        const combinedData: Record<string, unknown> = {}
        if (attachmentMeta && typeof attachmentMeta === 'object') {
          Object.assign(
            combinedData,
            attachmentMeta as Record<string, unknown>
          )
        }
        if (rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)) {
          const metaRecord = rawMeta as Record<string, unknown>
          if (metaRecord.comparisonSlot) {
            combinedData.comparisonSlot = metaRecord.comparisonSlot
          }
          if (metaRecord.comparisonLabel) {
            combinedData.comparisonLabel = metaRecord.comparisonLabel
          } else if (metaRecord.modelId) {
            combinedData.comparisonLabel = metaRecord.modelId
          }
          if (metaRecord.modelId) {
            combinedData.comparisonModelId = metaRecord.modelId
          }
        }
        return {
          id: message.id,
          role: message.role,
          content: message.content,
          data:
            Object.keys(combinedData).length > 0 ? combinedData : undefined,
        }
      })
  }, [session.messages])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {session.session.title || 'Untitled conversation'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatTimestamp(session.session.startedAt)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(
                  session.session.startedAt,
                  session.session.endedAt
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onResume && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResume}
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          <ExportButton
            sessionId={session.session.id}
            variant="outline"
            size="sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <Trash2
              className={cn('h-4 w-4 mr-2', isDeleting && 'animate-spin')}
            />
            Delete
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-[250px_1fr] gap-6 p-6 overflow-hidden">
        {/* Metadata sidebar */}
        <aside className="space-y-4 overflow-y-auto">
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              Conversation Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Messages
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">
                    {session.session.messageCount}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Status
                </span>
                <div className="mt-1">
                  <Badge
                    variant={session.session.endedAt ? 'inactive' : 'active'}
                  >
                    {session.session.endedAt ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  AI Model
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Bot className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">
                    {session.session.model || 'Unknown'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Started
                </span>
                <p className="text-sm text-zinc-300 mt-1">
                  {formatTimestamp(session.session.startedAt)}
                </p>
              </div>
              {session.session.endedAt && (
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">
                    Ended
                  </span>
                  <p className="text-sm text-zinc-300 mt-1">
                    {formatTimestamp(session.session.endedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              Statistics
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">User messages</span>
                <span className="text-white font-medium">
                  {
                    session.messages.filter((m) => m.role === 'user').length
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">AI responses</span>
                <span className="text-white font-medium">
                  {
                    session.messages.filter((m) => m.role === 'assistant')
                      .length
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Avg. response</span>
                <span className="text-white font-medium">
                  {(() => {
                    const assistantMsgs = session.messages.filter(
                      (m) => m.role === 'assistant'
                    )
                    if (assistantMsgs.length === 0) return '—'
                    const avgLength =
                      assistantMsgs.reduce(
                        (sum, m) => sum + m.content.length,
                        0
                      ) / assistantMsgs.length
                    if (avgLength < 100) return 'Short'
                    if (avgLength < 500) return 'Medium'
                    return 'Long'
                  })()}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Messages panel */}
        <div className="flex flex-col rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-300">
              Conversation Transcript
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {formattedMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                No messages recorded in this conversation.
              </div>
            ) : (
              <MessageList messages={formattedMessages} isLoading={false} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { HistoryDetail }
