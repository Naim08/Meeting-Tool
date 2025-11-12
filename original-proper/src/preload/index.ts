import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppendChatMessagePayload,
  ChatSessionRecord,
  ChatSessionWithMessages,
  CreateChatSessionPayload,
  ListChatSessionsParams,
} from '../types/chat-history'
import type {
  ExportRequest,
  ExportResult,
  ExportProgress,
} from '../types/export'

const api = {
  sendMessage: (message: string) => {
    ipcRenderer.send('message', message)
  },

  /**
   * Here function for AppBar
   */
  Minimize: () => {
    ipcRenderer.send('minimize')
  },
  Maximize: () => {
    ipcRenderer.send('maximize')
  },
  Close: () => {
    ipcRenderer.send('close')
  },

  /**
   * Provide an easier way to listen to events
   */
  on: (channel: string, callback: (data: any) => void) => {
    const wrappedCallback = (_: any, data: any) => callback(data)
    ;(callback as any)._wrappedCallback = wrappedCallback
    ipcRenderer.on(channel, wrappedCallback)
  },
  off: (channel: string, callback: (data: any) => void) => {
    const wrappedCallback = (callback as any)._wrappedCallback
    if (wrappedCallback) {
      ipcRenderer.off(channel, wrappedCallback)
      delete (callback as any)._wrappedCallback
    }
  },

  isOSX: () => process.platform === 'darwin',
  isWindows: () => process.platform === 'win32',
  isLinux: () => /linux/.test(process.platform),
  isProd: () => ipcRenderer.invoke('electronMain:isProd'),
  getVersion: () => ipcRenderer.invoke('electronMain:getVersion'),
  openScreenSecurity: () => ipcRenderer.invoke('electronMain:openScreenSecurity'),
  getScreenAccess: () => ipcRenderer.invoke('electronMain:getScreenAccess'),
  getScreenSources: () => ipcRenderer.invoke('electronMain:screen:getSources'),
  setScreenSource: (sourceId: string) => {
    ipcRenderer.send('electronMain:screen:setSource', sourceId)
  },
  openAudioSettings: () => ipcRenderer.invoke('electronMain:audio:openSystemPreferences'),
  getHotkeys: () => ipcRenderer.invoke('electronMain:getHotkeys'),
  updateHotkey: (func: string, newHotkey: string) => 
    ipcRenderer.invoke('electronMain:updateHotkey', func, newHotkey),
  resetHotkeys: () => ipcRenderer.invoke('electronMain:resetHotkeys'),
  toggleDockIcon: () => ipcRenderer.invoke('electronMain:toggleDockIcon'),
  getTransparencyValue: () => ipcRenderer.invoke('electronMain:getTransparencyValue'),
  updateTransparencyValue: (value: number) => 
    ipcRenderer.invoke('electronMain:updateTransparencyValue', value),
  isTranscriptionsEnabled: () =>
    ipcRenderer.invoke('transcriptions:isEnabled'),
  transcriptions: {
    startSession: (source: 'microphone' | 'system', language: string, meetingId?: string) =>
      ipcRenderer.invoke('transcriptions:startSession', source, language, meetingId),
    addSegment: (sessionId: string, segment: any) =>
      ipcRenderer.invoke('transcriptions:addSegment', sessionId, segment),
    addSpeakerSegment: (sessionId: string, segment: any) =>
      ipcRenderer.invoke('transcriptions:addSpeakerSegment', sessionId, segment),
    endSession: (sessionId: string) =>
      ipcRenderer.invoke('transcriptions:endSession', sessionId),
    getActiveSessions: () =>
      ipcRenderer.invoke('transcriptions:getActiveSessions'),
    get: (id: string) => ipcRenderer.invoke('transcriptions:get', id),
    getAll: (limit?: number, offset?: number) =>
      ipcRenderer.invoke('transcriptions:getAll', limit, offset),
    setRecording: (source: 'microphone' | 'system', enabled: boolean) =>
      ipcRenderer.invoke('transcriptions:setRecording', source, enabled),
  },
  meetings: {
    start: (config: { mic: boolean; system: boolean; language?: string; title?: string }) =>
      ipcRenderer.invoke('meeting:start', config),
    stop: () => ipcRenderer.invoke('meeting:stop'),
    toggleSource: (source: 'microphone' | 'system', enabled: boolean) =>
      ipcRenderer.invoke('meeting:toggleSource', source, enabled),
    getActive: () => ipcRenderer.invoke('meeting:getActive'),
    getRecent: (limit?: number, offset?: number) =>
      ipcRenderer.invoke('meeting:getRecent', limit, offset),
    getDetails: (meetingId: string) =>
      ipcRenderer.invoke('meeting:getDetails', meetingId),
  },
  chatHistory: {
    createSession: (payload?: CreateChatSessionPayload): Promise<ChatSessionRecord> =>
      ipcRenderer.invoke('chat-history:create-session', payload),
    appendMessage: (sessionId: string, payload: AppendChatMessagePayload): Promise<void> =>
      ipcRenderer.invoke('chat-history:append-message', sessionId, payload),
    completeSession: (sessionId: string, endedAt?: number): Promise<void> =>
      ipcRenderer.invoke('chat-history:complete-session', sessionId, endedAt),
    listSessions: (params?: ListChatSessionsParams): Promise<ChatSessionRecord[]> =>
      ipcRenderer.invoke('chat-history:list', params),
    getSession: (sessionId: string): Promise<ChatSessionWithMessages | null> =>
      ipcRenderer.invoke('chat-history:get', sessionId),
    updateSessionTitle: (sessionId: string, title: string | null): Promise<void> =>
      ipcRenderer.invoke('chat-history:update-title', sessionId, title),
    deleteSession: (sessionId: string): Promise<boolean> =>
      ipcRenderer.invoke('chat-history:delete', sessionId),
  },
  export: {
    exportConversation: (request: ExportRequest): Promise<ExportResult> =>
      ipcRenderer.invoke('export:request', request),
    openDirectory: (dirPath: string): Promise<void> =>
      ipcRenderer.invoke('export:openDirectory', dirPath),
    openFile: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('export:openFile', filePath),
    onProgress: (callback: (progress: ExportProgress) => void) => {
      const wrappedCallback = (_: any, progress: ExportProgress) => callback(progress)
      ;(callback as any)._wrappedCallback = wrappedCallback
      ipcRenderer.on('export:progress', wrappedCallback)
    },
    offProgress: (callback: (progress: ExportProgress) => void) => {
      const wrappedCallback = (callback as any)._wrappedCallback
      if (wrappedCallback) {
        ipcRenderer.off('export:progress', wrappedCallback)
        delete (callback as any)._wrappedCallback
      }
    },
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('env', {
      STRIPE_PUBLISHABLE_KEY:
        'pk_live_51Oi3JOAP9DeYOBCPs3VQnR8L37GjYwMqMlkhaQXzd0RkniBzBbBaHYT5yxcKq3Fm7grBt4ZyRQj9BpYhdPsjABUF00nj5lfOwl'
    })
  } catch (error) {
    console.error(error)
  }
} else {
  ;(window as any).api = api
}
