import { useState } from 'react'
import {
  Search,
  History as HistoryIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useChatHistory } from '@/hooks/useChatHistory'
import { useDebounce } from '@/hooks/useDebounce'
import { ConversationCard } from './ConversationCard'
import { HistoryDetail } from './HistoryDetail'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export default function ChatHistoryView() {
  const {
    filteredSessions,
    selectedSession,
    isLoadingSessions,
    isLoadingDetails,
    isDeletingSession,
    error,
    searchQuery,
    setSearchQuery,
    selectSession,
    clearSelection,
    deleteSession,
    deleteAllSessions,
    refreshSessions,
    totalLoaded,
  } = useChatHistory({ autoLoad: true, initialLimit: 100 })

  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)

  // Debounce the search query
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300)

  // Update the actual search query when debounced value changes
  useState(() => {
    setSearchQuery(debouncedSearchQuery)
  })

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearchQuery(value)
    setSearchQuery(value) // Immediate update for responsiveness
  }

  const handleDeleteAll = async () => {
    await deleteAllSessions()
    setShowDeleteAllDialog(false)
  }

  // Show detail view if a session is selected
  if (selectedSession) {
    return (
      <HistoryDetail
        session={selectedSession}
        onBack={clearSelection}
        onDelete={() => deleteSession(selectedSession.session.id)}
        isDeleting={isDeletingSession}
        className="h-full"
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <HistoryIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Chat History</h1>
            <p className="text-sm text-zinc-400">
              Review and resume previous conversations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue-subtle" size="lg">
            {totalLoaded} conversations
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshSessions}
            disabled={isLoadingSessions}
            className="border-white/10 hover:border-blue-500/50"
          >
            <RefreshCw
              className={cn(
                'h-4 w-4 mr-2',
                isLoadingSessions && 'animate-spin'
              )}
            />
            Refresh
          </Button>
          {filteredSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteAllDialog(true)}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={localSearchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-white/10 bg-zinc-800 px-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {localSearchQuery && (
            <button
              type="button"
              onClick={() => {
                setLocalSearchQuery('')
                setSearchQuery('')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
        {localSearchQuery && (
          <p className="mt-2 text-xs text-zinc-500">
            Found {filteredSessions.length} conversation
            {filteredSessions.length !== 1 ? 's' : ''} matching "{localSearchQuery}"
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoadingSessions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-white/10 bg-zinc-900 p-4"
              >
                <div className="h-5 w-3/4 rounded bg-zinc-800 mb-3" />
                <div className="h-4 w-full rounded bg-zinc-800 mb-2" />
                <div className="h-4 w-2/3 rounded bg-zinc-800 mb-3" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 rounded bg-zinc-800" />
                  <div className="h-5 w-24 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/10 bg-zinc-900/50 p-8">
            <HistoryIcon className="h-12 w-12 text-zinc-600" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-zinc-400">
                {localSearchQuery
                  ? 'No matching conversations'
                  : 'No conversations yet'}
              </h3>
              <p className="text-sm text-zinc-500 mt-1">
                {localSearchQuery
                  ? 'Try adjusting your search query'
                  : 'Start chatting to build your history'}
              </p>
            </div>
            {localSearchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalSearchQuery('')
                  setSearchQuery('')
                }}
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => (
              <ConversationCard
                key={session.id}
                session={session}
                isActive={false}
                isDeleting={isDeletingSession}
                onClick={() => selectSession(session.id)}
                onDelete={() => deleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete All Conversations</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete all {filteredSessions.length}{' '}
              conversation{filteredSessions.length !== 1 ? 's' : ''}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllDialog(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeletingSession}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeletingSession ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
