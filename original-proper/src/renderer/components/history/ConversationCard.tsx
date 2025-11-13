import * as React from 'react'
import { Copy, ExternalLink, Trash2, Clock, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChatSessionRecord } from '../../../types/chat-history'

interface ConversationCardProps {
  session: ChatSessionRecord
  isActive?: boolean
  isDeleting?: boolean
  onClick: () => void
  onDelete: () => void
  onCopy?: () => void
  className?: string
}

const formatTimestamp = (value: number | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }
}

const formatDuration = (session: ChatSessionRecord) => {
  if (!session.endedAt) return 'In progress'
  const durationMs = session.endedAt - session.startedAt
  if (durationMs <= 0) return '<1m'
  const minutes = Math.floor(durationMs / 60000)
  if (minutes < 1) {
    const seconds = Math.floor(durationMs / 1000)
    return `${seconds}s`
  }
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  session,
  isActive = false,
  isDeleting = false,
  onClick,
  onDelete,
  onCopy,
  className,
}) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCopy) {
      onCopy()
    } else {
      // Default copy behavior - copy title and preview
      const text = `${session.title || 'Untitled'}\n${session.lastMessagePreview || ''}`
      navigator.clipboard.writeText(text)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border p-4 transition-all duration-200 cursor-pointer',
        {
          'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10': isActive,
          'border-white/10 bg-zinc-900 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10':
            !isActive,
          'opacity-50': isDeleting,
        },
        className
      )}
      onClick={onClick}
    >
      {/* Quick Actions - visible on hover */}
      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
          title="Copy conversation"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
          title="Open conversation"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Delete conversation"
          disabled={isDeleting}
        >
          <Trash2
            className={cn('h-3.5 w-3.5', isDeleting && 'animate-spin')}
          />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-2 pr-24">
        {/* Title and Status */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              'font-medium truncate',
              isActive ? 'text-blue-400' : 'text-white'
            )}
          >
            {session.title || 'Untitled conversation'}
          </h3>
        </div>

        {/* Preview */}
        {session.lastMessagePreview && (
          <p className="text-sm text-zinc-400 line-clamp-2">
            {session.lastMessagePreview}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(session.startedAt)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {session.messageCount} messages
          </span>
          <Badge
            variant={session.endedAt ? 'inactive' : 'blue'}
            size="sm"
          >
            {formatDuration(session)}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export { ConversationCard }
