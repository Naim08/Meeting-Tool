# Electron.js Cross-Platform App Development Skill

You are an expert in building cross-platform desktop applications using Electron.js with React, focusing on the Interview Copilot architecture.

## Tech Stack Overview

### Core Technologies
- **Electron.js v28+**: Desktop app framework with main/renderer/preload processes
- **React 18** with **TypeScript**: UI component library
- **Vite + electron-vite**: Fast build tooling
- **Tailwind CSS v4** with **shadcn/ui**: Styling and component primitives
- **Deepgram SDK**: Real-time speech-to-text transcription
- **Claude (Anthropic) API**: LLM integration for AI responses
- **CaptureKit**: macOS system audio capture (native binary in `resources/mac/capturekit`)
- **better-sqlite3**: Local database for meetings, chat history, transcriptions

### Project Structure (original-proper/)
```
src/
├── main/               # Electron main process (Node.js)
│   ├── index.ts        # Main entry, window creation, hotkeys
│   ├── audioRecorder.ts
│   ├── hotkeyHandlers.ts
│   ├── ipc/            # IPC handlers
│   │   ├── chatHistoryHandlers.ts
│   │   ├── meetingHandlers.ts
│   │   └── transcriptionsHandlers.ts
│   ├── services/
│   │   ├── AudioProcessor.ts
│   │   ├── AudioWriter.ts
│   │   ├── Database.ts
│   │   ├── MeetingSessionManager.ts
│   │   ├── RecordingController.ts
│   │   ├── TranscriptionService.ts
│   │   └── ChatHistoryService.ts
│   └── config/
├── preload/            # Preload scripts (bridge)
│   └── index.ts        # Expose IPC APIs to renderer
└── renderer/           # React app (browser)
    ├── main.tsx        # Entry point
    ├── App.tsx         # Main component with tab routing
    ├── components/
    │   ├── ui/         # shadcn components
    │   ├── meetings/   # Meeting views
    │   ├── history/    # Chat history
    │   └── settings/   # Settings panels
    ├── hooks/          # Custom React hooks
    └── services/       # Renderer-side services
```

## Key Architectural Patterns

### 1. IPC Communication (Main ↔ Renderer)
**Pattern**: Use `contextBridge` in preload for secure IPC

**Preload (src/preload/index.ts)**:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // Invoke pattern (request/response)
  getMeetings: () => ipcRenderer.invoke('meetings:get-all'),
  startRecording: (config) => ipcRenderer.invoke('recording:start', config),

  // On pattern (listen to events)
  onTranscriptionData: (callback) => {
    const listener = (_, data) => callback(data)
    ipcRenderer.on('transcription:data', listener)
    return () => ipcRenderer.removeListener('transcription:data', listener)
  }
})
```

**Main process (src/main/ipc/\*.ts)**:
```typescript
import { ipcMain } from 'electron'

ipcMain.handle('meetings:get-all', async () => {
  return await Database.getAllMeetings()
})

// Send events to renderer
mainWindow.webContents.send('transcription:data', transcriptionChunk)
```

**Renderer (React)**:
```typescript
// TypeScript types for window.electron
declare global {
  interface Window {
    electron: {
      getMeetings: () => Promise<Meeting[]>
      onTranscriptionData: (callback: (data: any) => void) => () => void
    }
  }
}

// Use in component
const meetings = await window.electron.getMeetings()
```

### 2. System Audio Capture (CaptureKit)
**Location**: `resources/mac/capturekit` (native binary)

```typescript
// src/main/audioRecorder.ts
import { spawn } from 'child_process'
import path from 'path'

export class AudioRecorder {
  private captureProcess: ChildProcess | null = null

  startSystemAudioCapture() {
    const captureKitPath = path.join(
      process.resourcesPath,
      'mac',
      'capturekit'
    )

    this.captureProcess = spawn(captureKitPath, ['--audio', '--format', 'wav'])

    this.captureProcess.stdout?.on('data', (chunk) => {
      // Raw PCM audio data
      this.processAudioChunk(chunk)
    })
  }

  stopCapture() {
    this.captureProcess?.kill()
  }
}
```

### 3. Deepgram Real-Time Transcription
**Config**: `src/renderer/config/deepgram.ts`

```typescript
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'

export class TranscriptionService {
  private deepgram = createClient(process.env.DEEPGRAM_API_KEY)
  private connection: any

  async startLiveTranscription() {
    this.connection = this.deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      punctuate: true,
      interim_results: true
    })

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript
      const isFinal = data.is_final

      // Send to renderer via IPC
      mainWindow.webContents.send('transcription:data', {
        text: transcript,
        isFinal,
        timestamp: Date.now()
      })
    })
  }

  sendAudio(audioBuffer: Buffer) {
    this.connection?.send(audioBuffer)
  }
}
```

### 4. Claude LLM Integration
**Usage**: Process transcription with Claude API

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

async function processChatWithClaude(messages: Message[]) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: "You are an interview assistant...",
    messages: messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  })

  return response.content[0].text
}
```

### 5. React UI with Tailwind + shadcn
**Pattern**: Tab-based navigation with sidebar

```typescript
// src/renderer/App.tsx
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

type Tab = 'CHAT' | 'SETTINGS' | 'MEETINGS' | 'HISTORY'

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('CHAT')

  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppSidebar onTabChange={setCurrentTab} />
        <SidebarInset>
          {currentTab === 'CHAT' && <Chat />}
          {currentTab === 'MEETINGS' && <MeetingsView />}
          {currentTab === 'HISTORY' && <ChatHistoryView />}
          {currentTab === 'SETTINGS' && <Settings />}
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}
```

**Styling conventions**:
- Use shadcn components from `@/components/ui/*`
- Tailwind utilities: `bg-background`, `text-foreground`, `border-border`
- Dark mode via `dark:` prefix and CSS variables
- Glassmorphism: `bg-card/95 backdrop-blur-sm`

### 6. Database (better-sqlite3)
**Pattern**: Service class for data persistence

```typescript
// src/main/services/Database.ts
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

export class DBService {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'data.db')
    this.db = new Database(dbPath)
    this.initTables()
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT,
        date INTEGER,
        transcription TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        messages TEXT,
        created_at INTEGER
      );
    `)
  }

  saveMeeting(meeting: Meeting) {
    const stmt = this.db.prepare(
      'INSERT INTO meetings (id, title, date, transcription, notes) VALUES (?, ?, ?, ?, ?)'
    )
    stmt.run(meeting.id, meeting.title, meeting.date,
             JSON.stringify(meeting.transcription), meeting.notes)
  }

  getAllMeetings(): Meeting[] {
    return this.db.prepare('SELECT * FROM meetings ORDER BY date DESC').all()
  }
}
```

## Common Development Tasks

### Adding a New IPC Handler
1. **Define handler in main** (`src/main/ipc/myHandlers.ts`):
```typescript
import { ipcMain } from 'electron'

export function setupMyHandlers() {
  ipcMain.handle('my:action', async (event, arg) => {
    // Process
    return result
  })
}
```

2. **Expose in preload** (`src/preload/index.ts`):
```typescript
contextBridge.exposeInMainWorld('electron', {
  myAction: (arg) => ipcRenderer.invoke('my:action', arg)
})
```

3. **Use in renderer**:
```typescript
const result = await window.electron.myAction(arg)
```

### Creating a New React Component
1. Use shadcn if available: `npx shadcn@latest add [component]`
2. Place in `src/renderer/components/`
3. Use TypeScript + Tailwind styling
4. Follow existing patterns (see `src/renderer/components/meetings/`)

### Adding Audio Processing
1. Extend `AudioProcessor.ts` or `AudioWriter.ts`
2. Handle PCM buffers from CaptureKit
3. Convert to format needed by Deepgram (16kHz, 16-bit, mono)
4. Use Node.js streams for efficiency

### Hotkey Management
**Location**: `src/main/hotkeyHandlers.ts`

```typescript
import { globalShortcut } from 'electron'

export function registerHotkeys(mainWindow: BrowserWindow) {
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    // Toggle microphone
    mainWindow.webContents.send('hotkey:toggle-mic')
  })

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    // Toggle system audio
    mainWindow.webContents.send('hotkey:toggle-system-audio')
  })
}
```

## Build & Development

### Dev Mode
```bash
yarn dev                    # Run electron-vite dev server
```

### Building
```bash
yarn build:vite            # Build renderer + main
yarn build:asar            # Package as ASAR
yarn build:app             # Replace app.asar in .app bundle
```

### Key Config Files
- `electron.vite.config.ts`: Vite config for main/renderer/preload
- `package.json`: Scripts and dependencies
- `tsconfig.json`: TypeScript settings
- `components.json`: shadcn/ui config
- `tailwind.config.js`: Tailwind theme

## Best Practices

### Security
- Never expose full `ipcRenderer` to renderer
- Use `contextBridge` always
- Validate all IPC inputs
- Store API keys in electron-store, never hardcode

### Performance
- Use Web Workers for heavy processing in renderer
- Stream audio data, don't buffer everything in memory
- Debounce transcription updates in UI
- Use React.memo for expensive components

### State Management
- Use React hooks (`useState`, `useEffect`) for UI state
- Electron store for persistence (settings, API keys)
- SQLite for structured data (meetings, chat history)
- IPC events for cross-process state sync

### Error Handling
```typescript
// Main process
ipcMain.handle('my:action', async (event, arg) => {
  try {
    const result = await someAsyncOperation(arg)
    return { success: true, data: result }
  } catch (error) {
    console.error('Error in my:action:', error)
    return { success: false, error: error.message }
  }
})

// Renderer
const { success, data, error } = await window.electron.myAction(arg)
if (!success) {
  // Show error to user
  toast.error(error)
}
```

## Troubleshooting

### CaptureKit not working
- Ensure binary is executable: `chmod +x resources/mac/capturekit`
- Check macOS permissions: System Settings > Privacy > Screen Recording
- Verify path resolution in production build

### Deepgram connection issues
- Check API key validity
- Ensure audio format matches Deepgram requirements (16kHz, linear16)
- Handle reconnection on disconnect

### IPC not working
- Check that handler is registered before `app.whenReady()`
- Verify preload script is loaded in BrowserWindow config
- Use DevTools console to debug renderer-side calls

### Build errors
- Clear `.vite` and `out` directories
- Run `yarn install` to ensure native modules are rebuilt
- Check electron-rebuild for native dependencies (better-sqlite3, etc.)

## Resources
- Electron docs: https://www.electronjs.org/docs
- electron-vite: https://electron-vite.org/
- Deepgram SDK: https://developers.deepgram.com/
- Claude API: https://docs.anthropic.com/
- shadcn/ui: https://ui.shadcn.com/

---

When working on this codebase:
1. Follow the existing architecture patterns
2. Add IPC handlers to appropriate service files
3. Use TypeScript strictly, avoid `any` types
4. Test audio/transcription flows on macOS with real permissions
5. Keep UI responsive—offload heavy work to main process
6. Document new IPC channels and APIs