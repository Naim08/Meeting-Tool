import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  ChatSessionRecord,
  ChatSessionWithMessages,
  ListChatSessionsParams,
} from '../../types/chat-history'

interface UseChatHistoryOptions {
  autoLoad?: boolean
  initialLimit?: number
}

interface UseChatHistoryReturn {
  // Data
  sessions: ChatSessionRecord[]
  selectedSession: ChatSessionWithMessages | null
  filteredSessions: ChatSessionRecord[]

  // Loading states
  isLoadingSessions: boolean
  isLoadingDetails: boolean
  isDeletingSession: boolean

  // Error state
  error: string | null

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Actions
  loadSessions: (params?: ListChatSessionsParams) => Promise<void>
  loadMoreSessions: () => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  clearSelection: () => void
  deleteSession: (sessionId: string) => Promise<void>
  deleteAllSessions: () => Promise<void>
  refreshSessions: () => Promise<void>

  // Pagination
  hasMore: boolean
  totalLoaded: number
}

export function useChatHistory(
  options: UseChatHistoryOptions = {}
): UseChatHistoryReturn {
  const { autoLoad = true, initialLimit = 50 } = options

  const [sessions, setSessions] = useState<ChatSessionRecord[]>([])
  const [selectedSession, setSelectedSession] =
    useState<ChatSessionWithMessages | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isDeletingSession, setIsDeletingSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(0)

  const chatHistory = window.api?.chatHistory

  const loadSessions = useCallback(
    async (params?: ListChatSessionsParams) => {
      if (!chatHistory?.listSessions) {
        setError('Chat history is unavailable in this build.')
        return
      }

      setIsLoadingSessions(true)
      setError(null)

      try {
        const limit = params?.limit ?? initialLimit
        const offset = params?.offset ?? 0

        const result = await chatHistory.listSessions({ limit, offset })
        const newSessions = result ?? []

        if (offset === 0) {
          setSessions(newSessions)
        } else {
          setSessions((prev) => [...prev, ...newSessions])
        }

        setHasMore(newSessions.length === limit)
        setCurrentOffset(offset + newSessions.length)
      } catch (err) {
        console.error('[useChatHistory] Failed to load sessions:', err)
        setError('Unable to load chat history.')
      } finally {
        setIsLoadingSessions(false)
      }
    },
    [chatHistory, initialLimit]
  )

  const loadMoreSessions = useCallback(async () => {
    if (!hasMore || isLoadingSessions) return
    await loadSessions({ limit: initialLimit, offset: currentOffset })
  }, [hasMore, isLoadingSessions, loadSessions, initialLimit, currentOffset])

  const selectSession = useCallback(
    async (sessionId: string) => {
      if (!chatHistory?.getSession) {
        setError('Chat history is unavailable.')
        return
      }

      setIsLoadingDetails(true)
      setError(null)

      try {
        const fullSession = await chatHistory.getSession(sessionId)
        setSelectedSession(fullSession ?? null)
      } catch (err) {
        console.error('[useChatHistory] Failed to load session details:', err)
        setError('Unable to load conversation details.')
      } finally {
        setIsLoadingDetails(false)
      }
    },
    [chatHistory]
  )

  const clearSelection = useCallback(() => {
    setSelectedSession(null)
  }, [])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!chatHistory?.deleteSession) {
        setError('Delete functionality is unavailable.')
        return
      }

      setIsDeletingSession(true)
      setError(null)

      try {
        await chatHistory.deleteSession(sessionId)

        // Clear selection if we deleted the selected session
        if (selectedSession?.session.id === sessionId) {
          setSelectedSession(null)
        }

        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } catch (err) {
        console.error('[useChatHistory] Failed to delete session:', err)
        setError('Unable to delete conversation.')
      } finally {
        setIsDeletingSession(false)
      }
    },
    [chatHistory, selectedSession?.session.id]
  )

  const deleteAllSessions = useCallback(async () => {
    if (!chatHistory?.deleteSession) {
      setError('Delete functionality is unavailable.')
      return
    }

    setIsDeletingSession(true)
    setError(null)

    try {
      // Delete all sessions one by one
      for (const session of sessions) {
        await chatHistory.deleteSession(session.id)
      }

      setSelectedSession(null)
      setSessions([])
    } catch (err) {
      console.error('[useChatHistory] Failed to delete all sessions:', err)
      setError('Unable to delete all conversations.')
    } finally {
      setIsDeletingSession(false)
    }
  }, [chatHistory, sessions])

  const refreshSessions = useCallback(async () => {
    setCurrentOffset(0)
    setHasMore(true)
    await loadSessions({ limit: initialLimit, offset: 0 })
  }, [loadSessions, initialLimit])

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      return sessions
    }

    const query = searchQuery.toLowerCase()
    return sessions.filter((session) => {
      const titleMatch = session.title?.toLowerCase().includes(query)
      const previewMatch = session.lastMessagePreview
        ?.toLowerCase()
        .includes(query)
      return titleMatch || previewMatch
    })
  }, [sessions, searchQuery])

  // Sort by most recent first
  const sortedFilteredSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => b.startedAt - a.startedAt)
  }, [filteredSessions])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      void loadSessions({ limit: initialLimit, offset: 0 })
    }
  }, [autoLoad, loadSessions, initialLimit])

  return {
    sessions,
    selectedSession,
    filteredSessions: sortedFilteredSessions,
    isLoadingSessions,
    isLoadingDetails,
    isDeletingSession,
    error,
    searchQuery,
    setSearchQuery,
    loadSessions,
    loadMoreSessions,
    selectSession,
    clearSelection,
    deleteSession,
    deleteAllSessions,
    refreshSessions,
    hasMore,
    totalLoaded: sessions.length,
  }
}
