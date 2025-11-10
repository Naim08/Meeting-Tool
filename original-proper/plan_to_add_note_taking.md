

# Complete Technical Specification: Voice Transcription & Note-Taking System
## Electron App Enhancement - Comprehensive Implementation Guide

---

## 📋 Table of Contents

1. [Project Context & Current Architecture](#1-project-context--current-architecture)
2. [Voice Transcription System Overview](#2-voice-transcription-system-overview)
3. [Speaker Diarization Implementation](#3-speaker-diarization-implementation)
4. [Note-Taking System Design](#4-note-taking-system-design)
5. [Transcriptions Management System](#5-transcriptions-management-system)
6. [Complete File Structure](#6-complete-file-structure)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Code Examples & Snippets](#8-code-examples--snippets)

---

## 1. Project Context & Current Architecture

### 1.1 Application Overview
- **Type**: Electron-based desktop application
- **Framework**: React + TypeScript
- **Purpose**: AI chat assistant with voice transcription capabilities
- **Platform**: macOS (with Windows compatibility)

### 1.2 Current Technology Stack

**Main Process (Node.js/Electron):**
- `electron-store` - Configuration and data persistence
- `assemblyai` - System audio transcription
- Native `capturekit` binary - macOS system audio capture

**Renderer Process (React):**
- `@deepgram/sdk` - Microphone transcription
- Web Audio API + AudioWorklet - Audio processing
- Radix UI - Component library
- Tailwind CSS - Styling

### 1.3 Existing Storage Patterns

```typescript
// Main Process Storage
const store = new Store({
  name: 'config',
  cwd: app.getPath('userData'),
  fileExtension: 'json'
});

// Renderer Process Storage
localStorage.setItem('key', JSON.stringify(value));
```

**Storage Locations:**
- Config: `~/Library/Application Support/[AppName]/config.json`
- User Data: `~/Library/Application Support/[AppName]/`

### 1.4 Current UI Structure

```
App.tsx
├── SidebarProvider
│   └── AppSidebar
├── Main Content Area
│   ├── CHAT Tab (active)
│   └── SETTINGS Tab
└── ChatInterface
    ├── MessageList
    ├── TranscriptionDisplay
    └── Input Form
```

---

## 2. Voice Transcription System Overview

### 2.1 Dual Transcription Architecture

The app uses **two separate transcription systems**:

#### **System 1: Microphone Transcription** (User's Voice)
- **Service**: Deepgram SDK (real-time streaming)
- **Location**: `src/renderer/hooks/useTranscription.tsx`
- **Audio Capture**: Web Audio API with AudioWorklet
- **Use Case**: Capturing user's spoken input

**Flow:**
```
Microphone → getUserMedia() → AudioContext → AudioWorklet 
→ Float32Array samples → Convert to PCM → Deepgram WebSocket 
→ Real-time transcription → UI Display
```

#### **System 2: System Audio Transcription** (Computer Audio)
- **Service**: AssemblyAI (real-time streaming)
- **Location**: `src/main/audioRecorder.ts`
- **Audio Capture**: Native `capturekit` binary (macOS)
- **Use Case**: Capturing meeting audio (Zoom, Teams, etc.)

**Flow:**
```
System Audio → capturekit process → stdout pipe → Node.js Transform stream
→ Downmix stereo to mono → Downsample 48kHz to 16kHz 
→ AssemblyAI streaming → IPC to renderer → UI Display
```

### 2.2 Current Transcription Configuration

**Deepgram Config** (`src/renderer/config/deepgram.ts`):
```typescript
export const getTranscriptionOptions = (
  language: string = "en",
  sampleRate: number = 16000
) => {
  return {
    model: language === "en" ? "nova-3" : "nova-2",
    smart_format: true,
    language: language,
    encoding: "linear16",
    channels: 1,
    sample_rate: sampleRate,
    interim_results: true,
  };
};
```

**AssemblyAI Config** (`src/main/config/audio.ts`):
```typescript
export const TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  sampleRate: 16000,
  encoding: "pcm_s16le" as AudioEncoding,
};
```

### 2.3 Transcription State Management

**Hook**: `src/renderer/hooks/useTranscriptionManager.ts`

```typescript
interface TranscriptState {
  partial: string;      // Interim results
  final: string;        // Final confirmed text
  transcriptions: string[];  // All final transcriptions
}

// Manages both sources separately
const useTranscriptionManager = () => {
  const micManager = useSingleTranscriptSource();
  const systemManager = useSingleTranscriptSource();
  
  return {
    micTranscriptUI,
    systemTranscriptUI,
    micTranscriptionsUI,
    systemTranscriptionsUI,
    handleMicTranscript,
    handleSystemTranscript,
    // ... more methods
  };
};
```

---

## 3. Speaker Diarization Implementation

### 3.1 Overview

**Speaker Diarization** = Automatic detection and labeling of different speakers in audio.

**Capabilities:**
- ✅ Deepgram: Supports speaker diarization in real-time streaming
- ✅ AssemblyAI: Supports speaker labels in real-time streaming
- ❌ Currently NOT enabled in the app

### 3.2 Deepgram Speaker Diarization

#### Enable Diarization

**Update** `src/renderer/config/deepgram.ts`:

```typescript
export const getTranscriptionOptions = (
  language: string = "en",
  sampleRate: number = 16000,
  enableDiarization: boolean = true  // NEW PARAMETER
) => {
  let cleanLanguage = language;

  if (
    typeof language === "string" &&
    language.startsWith('"') &&
    language.endsWith('"')
  ) {
    try {
      cleanLanguage = JSON.parse(language);
    } catch (e) {
      console.error("Error parsing language:", e);
    }
  }

  return {
    model: language === "en" ? "nova-3" : "nova-2",
    smart_format: true,
    language: cleanLanguage,
    encoding: "linear16",
    channels: 1,
    sample_rate: sampleRate,
    interim_results: true,
    
    // ✨ SPEAKER DIARIZATION
    diarize: enableDiarization,        // Enable speaker detection
    utterances: enableDiarization,     // Get speaker-labeled segments
    punctuate: true,                   // Better formatting
  };
};
```

#### Handle Speaker Data in Transcription Hook

**Update** `src/renderer/hooks/useTranscription.tsx`:

```typescript
// Around line 294-312
deepgramLive.current.on(
  LiveTranscriptionEvents.Transcript,
  (transcription) => {
    try {
      if (transcription?.channel?.alternatives?.[0]) {
        const alternative = transcription.channel.alternatives[0];
        const isFinal = transcription.is_final;

        // ✨ Extract speaker information from words
        const words = alternative.words || [];
        const speakerInfo = words.length > 0 ? {
          speaker: words[0].speaker,
          speakerConfidence: words[0].speaker_confidence
        } : null;

        setTranscript({
          text: alternative.transcript,
          type: isFinal ? "FinalTranscript" : "PartialTranscript",
          speaker: speakerInfo?.speaker,              // NEW
          speakerConfidence: speakerInfo?.speakerConfidence  // NEW
        });
      }
    } catch (e) {
      console.error("Error processing transcription:", e);
    }
  }
);

// ✨ NEW: Handle utterance events for speaker segments
deepgramLive.current.on(
  LiveTranscriptionEvents.UtteranceEnd,
  (utterance) => {
    const words = utterance.channel.alternatives[0].words || [];
    const speaker = words[0]?.speaker || 0;
    const text = utterance.channel.alternatives[0].transcript;
    
    console.log(`[Speaker ${speaker}]: ${text}`);
    
    // Emit speaker segment for storage
    const speakerSegment = {
      speaker,
      text,
      timestamp: Date.now(),
      confidence: utterance.channel.alternatives[0].confidence
    };
    
    // Store this segment (will be used in transcriptions system)
  }
);
```

### 3.3 AssemblyAI Speaker Diarization

#### Enable Speaker Labels

**Update** `src/main/config/audio.ts`:

```typescript
export const TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  sampleRate: 16000,
  encoding: "pcm_s16le" as AudioEncoding,
  
  // ✨ SPEAKER DIARIZATION
  speaker_labels: true,  // Enable speaker detection
};
```

#### Handle Speaker Data in Service

**Update** `src/main/services/TranscriptionService.ts`:

```typescript
private setupEventHandlers(): void {
  this.transcriber.on("open", ({ sessionId }) => {
    console.log(`[AssemblyAI] Session opened: ${sessionId}`);
  });

  this.transcriber.on("transcript", (transcript: RealtimeTranscript) => {
    if (!transcript.text) return;

    // ✨ Extract speaker information
    const speakerLabel = transcript.speaker_label || "Unknown";
    
    this.window.webContents.send("message", {
      type: "transcription.update",
      value: {
        text: transcript.text,
        isFinal: transcript.message_type === "FinalTranscript",
        speaker: speakerLabel,  // NEW: Speaker identifier (A, B, C, etc.)
      },
    });

    console.log(
      `[Speaker ${speakerLabel}] ${
        transcript.message_type === "FinalTranscript" ? "Final" : "Partial"
      }: ${transcript.text}`
    );
  });

  this.transcriber.on("error", (error: Error) => {
    console.error("[AssemblyAI] Error:", error);
    this.window.webContents.send("message", {
      type: "transcription.error",
      value: error.message,
    });
  });

  this.transcriber.on("close", (code: number, reason: string) => {
    console.log("[AssemblyAI] Session closed:", code, reason);
  });
}
```

### 3.4 Speaker Data Model

```typescript
interface SpeakerSegment {
  speaker: number | string;  // Deepgram: 0,1,2... | AssemblyAI: A,B,C...
  text: string;              // What they said
  timestamp: number;         // Unix timestamp
  confidence?: number;       // Confidence score (0-1)
  startTime?: number;        // Start time in audio (ms)
  endTime?: number;          // End time in audio (ms)
}

interface TranscriptWithSpeakers {
  text: string;              // Full combined text
  type: 'PartialTranscript' | 'FinalTranscript';
  speaker?: number | string; // Current speaker
  speakerConfidence?: number;
  segments?: SpeakerSegment[]; // All speaker segments
}
```

---

## 4. Note-Taking System Design

### 4.1 Concept

**Notes** are user-curated, edited content created from transcriptions or manually written.

**Key Features:**
- Create notes from transcriptions (mic or system audio)
- Manual note creation
- Edit, organize, tag, and favorite notes
- Search and filter
- Export capabilities

### 4.2 Data Model

```typescript
interface Note {
  id: string;                    // UUID
  title: string;                 // Auto-generated or user-defined
  content: string;               // Note text content
  source: 'microphone' | 'system' | 'manual'; // Origin
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
  tags: string[];                // For categorization
  isFavorite: boolean;           // Quick access flag
  
  // Multi-speaker support
  speakers?: {
    segments: SpeakerSegment[];           // Speaker-labeled segments
    speakerCount: number;                 // Total unique speakers
    speakerNames?: Record<number, string>; // Map speaker IDs to names
  };
  
  metadata: {
    duration?: number;           // Recording duration (seconds)
    language?: string;           // Transcription language
    wordCount: number;           // Auto-calculated
    transcriptionId?: string;    // Link to source transcription
  };
}

interface NotesStore {
  notes: Record<string, Note>;   // Keyed by note ID
  tags: string[];                // All unique tags
  settings: {
    autoSaveTranscriptions: boolean;
    defaultTags: string[];
    sortBy: 'createdAt' | 'updatedAt' | 'title';
    sortOrder: 'asc' | 'desc';
  };
}
```

### 4.3 Storage Strategy

**Primary: electron-store** (for metadata and small notes)
```typescript
// src/main/services/NotesStore.ts
import Store from 'electron-store';

const notesStore = new Store({
  name: 'notes',
  defaults: {
    notes: {},
    tags: [],
    settings: {
      autoSaveTranscriptions: false,
      defaultTags: [],
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  }
});
```

**Secondary: File System** (optional, for large notes)
```typescript
import { app } from 'electron';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';

const NOTES_DIR = join(app.getPath('userData'), 'notes');
```

### 4.4 File Structure

```
original-proper/src/
├── main/
│   ├── services/
│   │   ├── NotesStore.ts          # Notes storage service
│   │   └── NotesManager.ts        # CRUD operations
│   └── ipc/
│       └── notesHandlers.ts       # IPC handlers
│
├── renderer/
│   ├── components/
│   │   └── notes/
│   │       ├── NotesList.tsx      # List view
│   │       ├── NoteCard.tsx       # Note preview card
│   │       ├── NoteEditor.tsx     # Edit/view detail
│   │       ├── NoteCreator.tsx    # Create from transcription
│   │       ├── NotesSearch.tsx    # Search UI
│   │       ├── TagManager.tsx     # Tag management
│   │       └── NotesSettings.tsx  # Settings
│   │
│   ├── hooks/
│   │   ├── useNotes.ts            # CRUD operations
│   │   └── useNoteSearch.ts       # Search/filter
│   │
│   └── lib/
│       └── notes-utils.ts         # Helper functions
│
└── types/
    └── notes.ts                   # TypeScript interfaces
```

### 4.5 Core Features

#### Create Note from Transcription

```typescript
// src/renderer/hooks/useNotes.ts
const createNoteFromTranscription = async (
  source: 'microphone' | 'system',
  transcriptionText: string,
  speakerSegments?: SpeakerSegment[]
) => {
  const note: Note = {
    id: crypto.randomUUID(),
    title: generateTitle(transcriptionText), // First 50 chars
    content: transcriptionText,
    source,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [],
    isFavorite: false,
    speakers: speakerSegments ? {
      segments: speakerSegments,
      speakerCount: countUniqueSpeakers(speakerSegments),
    } : undefined,
    metadata: {
      language: localStorage.getItem('selectedLanguage') || 'en',
      wordCount: transcriptionText.split(/\s+/).length,
    }
  };
  
  await window.electronAPI.notes.create(note);
  return note;
};
```

#### IPC Handlers

```typescript
// src/main/ipc/notesHandlers.ts
import { ipcMain } from 'electron';
import { notesStore } from '../services/NotesStore';

export function setupNotesHandlers() {
  ipcMain.handle('notes:getAll', async () => {
    return notesStore.get('notes');
  });

  ipcMain.handle('notes:create', async (_, note: Note) => {
    const notes = notesStore.get('notes');
    notes[note.id] = note;
    notesStore.set('notes', notes);
    return note;
  });

  ipcMain.handle('notes:update', async (_, noteId: string, updates: Partial<Note>) => {
    const notes = notesStore.get('notes');
    notes[noteId] = { ...notes[noteId], ...updates, updatedAt: Date.now() };
    notesStore.set('notes', notes);
    return notes[noteId];
  });

  ipcMain.handle('notes:delete', async (_, noteId: string) => {
    const notes = notesStore.get('notes');
    delete notes[noteId];
    notesStore.set('notes', notes);
    return true;
  });

  ipcMain.handle('notes:search', async (_, query: string) => {
    const notes = Object.values(notesStore.get('notes'));
    return notes.filter(note => 
      note.title.toLowerCase().includes(query.toLowerCase()) ||
      note.content.toLowerCase().includes(query.toLowerCase())
    );
  });
}
```

#### Preload API

```typescript
// src/preload/index.ts
notes: {
  getAll: () => ipcRenderer.invoke('notes:getAll'),
  create: (note: Note) => ipcRenderer.invoke('notes:create', note),
  update: (id: string, updates: Partial<Note>) => 
    ipcRenderer.invoke('notes:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
  search: (query: string) => ipcRenderer.invoke('notes:search', query),
}
```

### 4.6 UI Components

#### Notes Tab Layout

```tsx
// src/renderer/components/notes/NotesTab.tsx
const NotesTab = () => {
  const { notes, loading } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'microphone' | 'system' | 'favorites'>('all');

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r p-4">
        <h2 className="font-semibold mb-4">Notes</h2>
        
        <nav className="space-y-2">
          <button onClick={() => setFilter('all')}>All Notes</button>
          <button onClick={() => setFilter('microphone')}>From Microphone</button>
          <button onClick={() => setFilter('system')}>From System Audio</button>
          <button onClick={() => setFilter('favorites')}>Favorites</button>
        </nav>

        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Tags</h3>
          <TagList />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <NotesSearch value={searchQuery} onChange={setSearchQuery} />
        <NotesList filter={filter} searchQuery={searchQuery} />
      </div>
    </div>
  );
};
```

#### Note Card Component

```tsx
// src/renderer/components/notes/NoteCard.tsx
const NoteCard = ({ note }: { note: Note }) => {
  const speakerCount = note.speakers?.speakerCount || 0;
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{note.title}</h3>
        {note.isFavorite && <Star className="text-yellow-500" />}
      </div>
      
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {note.content}
      </p>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
        <span>•</span>
        <span>{note.metadata.wordCount} words</span>
        {speakerCount > 0 && (
          <>
            <span>•</span>
            <span>{speakerCount} speakers</span>
          </>
        )}
      </div>
      
      {note.tags.length > 0 && (
        <div className="flex gap-1 mt-2">
          {note.tags.map(tag => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 5. Transcriptions Management System

### 5.1 Concept

**Transcriptions** are raw, auto-saved transcription sessions - a complete archive of all voice recordings.

**Key Differences from Notes:**
- **Transcriptions**: Raw, unedited, auto-saved, chronological archive
- **Notes**: Curated, edited, organized, user-created content

**Relationship:**
- Transcriptions can be converted to Notes
- Notes can reference source Transcription

### 5.2 Data Model

```typescript
interface Transcription {
  id: string;                    // UUID
  sessionId: string;             // Unique session identifier
  source: 'microphone' | 'system'; // Audio source
  startTime: number;             // Session start (Unix timestamp)
  endTime: number;               // Session end (Unix timestamp)
  duration: number;              // Duration in seconds
  
  // Content
  fullText: string;              // Complete transcribed text
  segments: TranscriptionSegment[]; // Time-stamped segments
  
  // Speaker information
  speakers: {
    count: number;               // Number of unique speakers
    segments: SpeakerSegment[];  // Speaker-labeled segments
    names?: Record<number | string, string>; // Optional speaker names
  };
  
  // Metadata
  metadata: {
    language: string;            // Transcription language
    wordCount: number;           // Total words
    confidence: number;          // Average confidence score
    model: string;               // AI model used (nova-3, nova-2, etc.)
  };
  
  // Organization
  tags: string[];                // User-added tags
  isFavorite: boolean;           // Quick access
  notes?: string;                // User notes about this transcription
  linkedNoteId?: string;         // If converted to a Note
}

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;             // Relative to session start (ms)
  endTime: number;               // Relative to session start (ms)
  speaker?: number | string;     // Speaker identifier
  confidence: number;            // Confidence score
  isFinal: boolean;              // Final vs interim
}

interface TranscriptionsStore {
  transcriptions: Record<string, Transcription>; // Keyed by ID
  sessions: {
    active?: string;             // Currently active session ID
    history: string[];           // Session IDs in chronological order
  };
  settings: {
    autoSave: boolean;           // Auto-save all transcriptions
    savePartialResults: boolean; // Save interim results
    minDuration: number;         // Min duration to save (seconds)
    maxStorageSize: number;      // Max storage in MB
    sortBy: 'startTime' | 'duration' | 'wordCount';
    sortOrder: 'asc' | 'desc';
  };
}
```

### 5.3 Storage Strategy

**Local Storage Only** (no cloud):

```typescript
// src/main/services/TranscriptionsStore.ts
import Store from 'electron-store';
import { app } from 'electron';
import { join } from 'path';

const transcriptionsStore = new Store({
  name: 'transcriptions',
  defaults: {
    transcriptions: {},
    sessions: {
      active: null,
      history: []
    },
    settings: {
      autoSave: true,
      savePartialResults: false,
      minDuration: 5,
      maxStorageSize: 500,
      sortBy: 'startTime',
      sortOrder: 'desc'
    }
  }
});

// For large transcriptions, store content separately
const TRANSCRIPTIONS_DIR = join(app.getPath('userData'), 'transcriptions');
```

### 5.4 File Structure

```
original-proper/src/
├── main/
│   ├── services/
│   │   ├── TranscriptionsStore.ts      # Storage service
│   │   ├── TranscriptionsManager.ts    # Session management
│   │   └── TranscriptionRecorder.ts    # Auto-save logic
│   └── ipc/
│       └── transcriptionsHandlers.ts   # IPC handlers
│
├── renderer/
│   ├── components/
│   │   └── transcriptions/
│   │       ├── TranscriptionsList.tsx  # List view
│   │       ├── TranscriptionCard.tsx   # Preview card
│   │       ├── TranscriptionViewer.tsx # Detail view
│   │       ├── SpeakerTimeline.tsx     # Speaker visualization
│   │       ├── TranscriptionsSearch.tsx # Search UI
│   │       └── TranscriptionsSettings.tsx # Settings
│   │
│   ├── hooks/
│   │   ├── useTranscriptions.ts        # CRUD operations
│   │   ├── useTranscriptionRecorder.ts # Auto-save logic
│   │   └── useTranscriptionSearch.ts   # Search/filter
│   │
│   └── lib/
│       └── transcriptions-utils.ts     # Helper functions
│
└── types/
    └── transcriptions.ts               # TypeScript interfaces
```

### 5.5 Auto-Save Implementation

#### Transcription Recorder Service

```typescript
// src/main/services/TranscriptionRecorder.ts
import { BrowserWindow } from 'electron';
import { transcriptionsStore } from './TranscriptionsStore';

export class TranscriptionRecorder {
  private currentSession: Transcription | null = null;
  private segments: TranscriptionSegment[] = [];
  private speakerSegments: SpeakerSegment[] = [];

  startSession(source: 'microphone' | 'system', language: string) {
    const sessionId = crypto.randomUUID();
    
    this.currentSession = {
      id: sessionId,
      sessionId,
      source,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      fullText: '',
      segments: [],
      speakers: {
        count: 0,
        segments: [],
      },
      metadata: {
        language,
        wordCount: 0,
        confidence: 0,
        model: source === 'microphone' ? 'nova-3' : 'assemblyai',
      },
      tags: [],
      isFavorite: false,
    };

    // Mark as active session
    transcriptionsStore.set('sessions.active', sessionId);
    
    console.log(`[TranscriptionRecorder] Started session: ${sessionId}`);
    return sessionId;
  }

  addSegment(segment: TranscriptionSegment) {
    if (!this.currentSession) return;

    this.segments.push(segment);
    
    // Update full text
    if (segment.isFinal) {
      this.currentSession.fullText += segment.text + ' ';
    }

    // Track speaker segments
    if (segment.speaker !== undefined) {
      this.speakerSegments.push({
        speaker: segment.speaker,
        text: segment.text,
        timestamp: Date.now(),
        confidence: segment.confidence,
        startTime: segment.startTime,
        endTime: segment.endTime,
      });
    }
  }

  async endSession() {
    if (!this.currentSession) return null;

    const endTime = Date.now();
    const duration = (endTime - this.currentSession.startTime) / 1000;

    // Check minimum duration
    const minDuration = transcriptionsStore.get('settings.minDuration');
    if (duration < minDuration) {
      console.log(`[TranscriptionRecorder] Session too short (${duration}s), not saving`);
      this.reset();
      return null;
    }

    // Finalize transcription
    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;
    this.currentSession.segments = this.segments;
    this.currentSession.speakers = {
      count: this.countUniqueSpeakers(),
      segments: this.speakerSegments,
    };
    this.currentSession.metadata.wordCount = 
      this.currentSession.fullText.split(/\s+/).filter(w => w).length;
    this.currentSession.metadata.confidence = 
      this.calculateAverageConfidence();

    // Save to store
    const transcriptions = transcriptionsStore.get('transcriptions');
    transcriptions[this.currentSession.id] = this.currentSession;
    transcriptionsStore.set('transcriptions', transcriptions);

    // Update session history
    const history = transcriptionsStore.get('sessions.history');
    history.push(this.currentSession.id);
    transcriptionsStore.set('sessions.history', history);
    transcriptionsStore.set('sessions.active', null);

    console.log(`[TranscriptionRecorder] Saved session: ${this.currentSession.id}`);
    
    const savedSession = this.currentSession;
    this.reset();
    return savedSession;
  }

  private reset() {
    this.currentSession = null;
    this.segments = [];
    this.speakerSegments = [];
  }

  private countUniqueSpeakers(): number {
    const speakers = new Set(
      this.speakerSegments.map(s => s.speaker)
    );
    return speakers.size;
  }

  private calculateAverageConfidence(): number {
    if (this.segments.length === 0) return 0;
    const sum = this.segments.reduce((acc, s) => acc + s.confidence, 0);
    return sum / this.segments.length;
  }
}
```

#### Integration with Existing Transcription Hooks

**Update** `src/renderer/hooks/useTranscription.tsx`:

```typescript
// Add at the top
const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

const startTranscription = async () => {
  // ... existing code ...
  
  // ✨ Start recording session
  const sessionId = await window.electronAPI.transcriptions.startSession(
    'microphone',
    selectedLanguage
  );
  setCurrentSessionId(sessionId);
  
  // ... rest of existing code ...
};

const endTranscription = async () => {
  // ... existing code ...
  
  // ✨ End recording session
  if (currentSessionId) {
    await window.electronAPI.transcriptions.endSession(currentSessionId);
    setCurrentSessionId(null);
  }
  
  // ... rest of existing code ...
};

// ✨ Add segment to session on each transcript
deepgramLive.current.on(
  LiveTranscriptionEvents.Transcript,
  (transcription) => {
    // ... existing code ...
    
    // Save segment to session
    if (currentSessionId && transcription.is_final) {
      window.electronAPI.transcriptions.addSegment(currentSessionId, {
        id: crypto.randomUUID(),
        text: alternative.transcript,
        startTime: transcription.start || 0,
        endTime: transcription.duration || 0,
        speaker: speakerInfo?.speaker,
        confidence: alternative.confidence,
        isFinal: true,
      });
    }
  }
);
```

### 5.6 Transcriptions Tab UI

#### Main Tab Component

```tsx
// src/renderer/components/transcriptions/TranscriptionsTab.tsx
const TranscriptionsTab = () => {
  const { transcriptions, loading } = useTranscriptions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState({
    source: 'all' as 'all' | 'microphone' | 'system',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
    speakers: 'all' as 'all' | 'single' | 'multiple',
  });

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 space-y-6">
        <div>
          <h2 className="font-semibold mb-4">Transcriptions</h2>
          
          <nav className="space-y-2">
            <button onClick={() => setFilter({...filter, source: 'all'})}>
              All Transcriptions
            </button>
            <button onClick={() => setFilter({...filter, source: 'microphone'})}>
              Microphone
            </button>
            <button onClick={() => setFilter({...filter, source: 'system'})}>
              System Audio
            </button>
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Date Range</h3>
          <select 
            value={filter.dateRange}
            onChange={(e) => setFilter({...filter, dateRange: e.target.value})}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Speakers</h3>
          <select
            value={filter.speakers}
            onChange={(e) => setFilter({...filter, speakers: e.target.value})}
          >
            <option value="all">All</option>
            <option value="single">Single Speaker</option>
            <option value="multiple">Multiple Speakers</option>
          </select>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Storage</h3>
          <StorageIndicator />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <TranscriptionsSearch 
            value={searchQuery} 
            onChange={setSearchQuery} 
          />
        </div>
        
        <TranscriptionsList 
          filter={filter} 
          searchQuery={searchQuery} 
        />
      </div>
    </div>
  );
};
```

#### Transcription Card Component

```tsx
// src/renderer/components/transcriptions/TranscriptionCard.tsx
const TranscriptionCard = ({ transcription }: { transcription: Transcription }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {transcription.source === 'microphone' ? (
            <Mic className="w-4 h-4 text-blue-500" />
          ) : (
            <Speaker className="w-4 h-4 text-green-500" />
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(transcription.startTime).toLocaleString()}
          </span>
        </div>
        {transcription.isFavorite && <Star className="w-4 h-4 text-yellow-500" />}
      </div>

      <p className="text-sm line-clamp-3 mb-3">
        {transcription.fullText}
      </p>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatDuration(transcription.duration)}</span>
        <span>•</span>
        <span>{transcription.metadata.wordCount} words</span>
        <span>•</span>
        <span>{transcription.speakers.count} speaker{transcription.speakers.count !== 1 ? 's' : ''}</span>
      </div>

      {transcription.tags.length > 0 && (
        <div className="flex gap-1 mt-2">
          {transcription.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {transcription.linkedNoteId && (
        <div className="mt-2 text-xs text-blue-500 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          <span>Linked to note</span>
        </div>
      )}
    </div>
  );
};
```

#### Transcription Viewer (Detail View)

```tsx
// src/renderer/components/transcriptions/TranscriptionViewer.tsx
const TranscriptionViewer = ({ transcriptionId }: { transcriptionId: string }) => {
  const { transcription, loading } = useTranscription(transcriptionId);
  const [showSpeakerView, setShowSpeakerView] = useState(true);

  if (loading) return <Spinner />;
  if (!transcription) return <div>Transcription not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {new Date(transcription.startTime).toLocaleString()}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{formatDuration(transcription.duration)}</span>
              <span>•</span>
              <span>{transcription.metadata.wordCount} words</span>
              <span>•</span>
              <span>{transcription.speakers.count} speakers</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => toggleFavorite(transcriptionId)}>
              <Star className={transcription.isFavorite ? 'fill-yellow-500' : ''} />
            </button>
            <button onClick={() => createNoteFromTranscription(transcription)}>
              <FileText /> Create Note
            </button>
            <button onClick={() => exportTranscription(transcription)}>
              <Download /> Export
            </button>
            <button onClick={() => deleteTranscription(transcriptionId)}>
              <Trash2 /> Delete
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowSpeakerView(true)}
            className={showSpeakerView ? 'bg-primary text-white' : ''}
          >
            Speaker View
          </button>
          <button
            onClick={() => setShowSpeakerView(false)}
            className={!showSpeakerView ? 'bg-primary text-white' : ''}
          >
            Full Text
          </button>
        </div>
      </div>

      {/* Content */}
      {showSpeakerView ? (
        <SpeakerView transcription={transcription} />
      ) : (
        <div className="prose max-w-none">
          <p>{transcription.fullText}</p>
        </div>
      )}
    </div>
  );
};
```

#### Speaker View Component

```tsx
// src/renderer/components/transcriptions/SpeakerView.tsx
const SpeakerView = ({ transcription }: { transcription: Transcription }) => {
  const [speakerNames, setSpeakerNames] = useState(
    transcription.speakers.names || {}
  );

  const speakerColors = {
    0: 'border-l-blue-500',
    1: 'border-l-green-500',
    2: 'border-l-purple-500',
    3: 'border-l-orange-500',
  };

  const updateSpeakerName = (speakerId: number | string, name: string) => {
    const updated = { ...speakerNames, [speakerId]: name };
    setSpeakerNames(updated);
    window.electronAPI.transcriptions.updateSpeakerNames(
      transcription.id,
      updated
    );
  };

  return (
    <div className="space-y-4">
      {/* Speaker Name Editor */}
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Speaker Names</h3>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: transcription.speakers.count }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm">Speaker {i}:</span>
              <input
                type="text"
                value={speakerNames[i] || ''}
                onChange={(e) => updateSpeakerName(i, e.target.value)}
                placeholder={`Speaker ${i}`}
                className="flex-1 px-2 py-1 text-sm border rounded"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Speaker Segments */}
      <div className="space-y-3">
        {transcription.speakers.segments.map((segment, idx) => (
          <div
            key={idx}
            className={`border-l-4 pl-4 py-2 ${speakerColors[segment.speaker] || 'border-l-gray-500'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">
                {speakerNames[segment.speaker] || `Speaker ${segment.speaker}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(segment.startTime)}
              </span>
            </div>
            <p className="text-sm">{segment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 5.7 Search & Filter Implementation

```typescript
// src/renderer/hooks/useTranscriptionSearch.ts
export const useTranscriptionSearch = (
  transcriptions: Transcription[],
  searchQuery: string,
  filter: FilterOptions
) => {
  return useMemo(() => {
    let filtered = transcriptions;

    // Filter by source
    if (filter.source !== 'all') {
      filtered = filtered.filter(t => t.source === filter.source);
    }

    // Filter by date range
    if (filter.dateRange !== 'all') {
      const now = Date.now();
      const ranges = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[filter.dateRange];
      filtered = filtered.filter(t => t.startTime >= cutoff);
    }

    // Filter by speaker count
    if (filter.speakers === 'single') {
      filtered = filtered.filter(t => t.speakers.count === 1);
    } else if (filter.speakers === 'multiple') {
      filtered = filtered.filter(t => t.speakers.count > 1);
    }

    // Search in text
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.fullText.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [transcriptions, searchQuery, filter]);
};
```

### 5.8 Export Functionality

```typescript
// src/main/services/TranscriptionsManager.ts
export const exportTranscription = async (
  transcription: Transcription,
  format: 'txt' | 'md' | 'json' | 'srt'
) => {
  const { dialog, app } = require('electron');
  const { writeFile } = require('fs/promises');
  const { join } = require('path');

  const defaultPath = join(
    app.getPath('downloads'),
    `transcription-${transcription.id}.${format}`
  );

  const { filePath } = await dialog.showSaveDialog({
    defaultPath,
    filters: [
      { name: format.toUpperCase(), extensions: [format] }
    ]
  });

  if (!filePath) return null;

  let content = '';

  switch (format) {
    case 'txt':
      content = transcription.fullText;
      break;

    case 'md':
      content = `# Transcription - ${new Date(transcription.startTime).toLocaleString()}\n\n`;
      content += `**Duration:** ${transcription.duration}s\n`;
      content += `**Speakers:** ${transcription.speakers.count}\n\n`;
      content += `---\n\n`;
      
      if (transcription.speakers.segments.length > 0) {
        transcription.speakers.segments.forEach(seg => {
          const name = transcription.speakers.names?.[seg.speaker] || `Speaker ${seg.speaker}`;
          content += `**${name}:** ${seg.text}\n\n`;
        });
      } else {
        content += transcription.fullText;
      }
      break;

    case 'json':
      content = JSON.stringify(transcription, null, 2);
      break;

    case 'srt':
      // SRT subtitle format
      transcription.speakers.segments.forEach((seg, idx) => {
        content += `${idx + 1}\n`;
        content += `${formatSRTTime(seg.startTime)} --> ${formatSRTTime(seg.endTime)}\n`;
        content += `${seg.text}\n\n`;
      });
      break;
  }

  await writeFile(filePath, content, 'utf-8');
  return filePath;
};
```

---

## 6. Complete File Structure

```
original-proper/
├── src/
│   ├── main/
│   │   ├── index.ts                          # Main entry (add IPC setup)
│   │   ├── audioRecorder.ts                  # Existing (modify for auto-save)
│   │   ├── hotkeyHandlers.ts                 # Existing
│   │   │
│   │   ├── config/
│   │   │   └── audio.ts                      # Existing (add speaker_labels)
│   │   │
│   │   ├── services/
│   │   │   ├── AudioProcessor.ts             # Existing
│   │   │   ├── AudioWriter.ts                # Existing
│   │   │   ├── TranscriptionService.ts       # Existing (modify for speakers)
│   │   │   ├── NotesStore.ts                 # NEW
│   │   │   ├── NotesManager.ts               # NEW
│   │   │   ├── TranscriptionsStore.ts        # NEW
│   │   │   ├── TranscriptionsManager.ts      # NEW
│   │   │   └── TranscriptionRecorder.ts      # NEW
│   │   │
│   │   └── ipc/
│   │       ├── notesHandlers.ts              # NEW
│   │       └── transcriptionsHandlers.ts     # NEW
│   │
│   ├── preload/
│   │   └── index.ts                          # Existing (add notes & transcriptions APIs)
│   │
│   └── renderer/
│       ├── App.tsx                           # Existing (add NOTES & TRANSCRIPTIONS tabs)
│       ├── main.tsx                          # Existing
│       ├── supabase-provider.tsx             # Existing
│       │
│       ├── audio/
│       │   └── microphoneWorkletProcessor.js # Existing
│       │
│       ├── components/
│       │   ├── chat.tsx                      # Existing
│       │   ├── message-list.jsx              # Existing
│       │   ├── TranscriptionDisplay.tsx      # Existing (modify for speakers)
│       │   ├── app-sidebar.tsx               # Existing
│       │   │
│       │   ├── notes/                        # NEW
│       │   │   ├── NotesTab.tsx
│       │   │   ├── NotesList.tsx
│       │   │   ├── NoteCard.tsx
│       │   │   ├── NoteEditor.tsx
│       │   │   ├── NoteCreator.tsx
│       │   │   ├── NotesSearch.tsx
│       │   │   ├── TagManager.tsx
│       │   │   └── NotesSettings.tsx
│       │   │
│       │   ├── transcriptions/               # NEW
│       │   │   ├── TranscriptionsTab.tsx
│       │   │   ├── TranscriptionsList.tsx
│       │   │   ├── TranscriptionCard.tsx
│       │   │   ├── TranscriptionViewer.tsx
│       │   │   ├── SpeakerView.tsx
│       │   │   ├── SpeakerTimeline.tsx
│       │   │   ├── TranscriptionsSearch.tsx
│       │   │   ├── StorageIndicator.tsx
│       │   │   └── TranscriptionsSettings.tsx
│       │   │
│       │   ├── settings/                     # Existing
│       │   │   └── ...
│       │   │
│       │   └── ui/                           # Existing
│       │       ├── badge.tsx                 # NEW (if not exists)
│       │       ├── card.tsx                  # NEW (if not exists)
│       │       └── ...
│       │
│       ├── config/
│       │   └── deepgram.ts                   # Existing (add diarization)
│       │
│       ├── hooks/
│       │   ├── useTranscription.tsx          # Existing (modify for speakers & auto-save)
│       │   ├── useTranscriptionManager.ts    # Existing (modify for speakers)
│       │   ├── use-local-storage.js          # Existing
│       │   ├── useNotes.ts                   # NEW
│       │   ├── useNoteSearch.ts              # NEW
│       │   ├── useTranscriptions.ts          # NEW
│       │   ├── useTranscriptionRecorder.ts   # NEW
│       │   └── useTranscriptionSearch.ts     # NEW
│       │
│       └── lib/
│           ├── utils.ts                      # Existing
│           ├── notes-utils.ts                # NEW
│           └── transcriptions-utils.ts       # NEW
│
└── types/
    ├── notes.ts                              # NEW
    └── transcriptions.ts                     # NEW
```

---

## 7. Implementation Roadmap

### Phase 1: Speaker Diarization (Week 1)
**Goal:** Enable multi-speaker detection in existing transcription system

- [ ] **Day 1-2: Deepgram Diarization**
  - Update `src/renderer/config/deepgram.ts` to add diarization parameters
  - Modify `src/renderer/hooks/useTranscription.tsx` to handle speaker data
  - Test with multi-speaker audio

- [ ] **Day 3-4: AssemblyAI Diarization**
  - Update `src/main/config/audio.ts` to enable speaker labels
  - Modify `src/main/services/TranscriptionService.ts` to extract speaker info
  - Test with system audio (meeting recordings)

- [ ] **Day 5: UI Updates**
  - Update `TranscriptionDisplay.tsx` to show speaker labels
  - Add speaker color coding
  - Test end-to-end

### Phase 2: Transcriptions System (Week 2)
**Goal:** Auto-save all transcriptions locally

- [ ] **Day 1-2: Storage Layer**
  - Create `src/main/services/TranscriptionsStore.ts`
  - Create `src/main/services/TranscriptionRecorder.ts`
  - Set up IPC handlers in `src/main/ipc/transcriptionsHandlers.ts`
  - Add preload APIs

- [ ] **Day 3-4: Auto-Save Integration**
  - Modify `useTranscription.tsx` to start/end sessions
  - Integrate segment recording
  - Test auto-save functionality

- [ ] **Day 5: Basic UI**
  - Create `TranscriptionsTab.tsx`
  - Create `TranscriptionsList.tsx` and `TranscriptionCard.tsx`
  - Add TRANSCRIPTIONS tab to App.tsx

### Phase 3: Transcriptions Features (Week 3)
**Goal:** Full transcription management capabilities

- [ ] **Day 1-2: Detail View**
  - Create `TranscriptionViewer.tsx`
  - Create `SpeakerView.tsx` with speaker name editing
  - Implement speaker timeline visualization

- [ ] **Day 3-4: Search & Filter**
  - Implement `useTranscriptionSearch.ts` hook
  - Create `TranscriptionsSearch.tsx` component
  - Add filter sidebar

- [ ] **Day 5: Export & Delete**
  - Implement export functionality (TXT, MD, JSON, SRT)
  - Add delete with confirmation
  - Add storage management

### Phase 4: Notes System (Week 4)
**Goal:** User-curated note-taking from transcriptions

- [ ] **Day 1-2: Storage Layer**
  - Create `src/main/services/NotesStore.ts`
  - Create `src/main/services/NotesManager.ts`
  - Set up IPC handlers
  - Add preload APIs

- [ ] **Day 3-4: Core UI**
  - Create `NotesTab.tsx`
  - Create `NotesList.tsx`, `NoteCard.tsx`, `NoteEditor.tsx`
  - Add NOTES tab to App.tsx

- [ ] **Day 5: Integration**
  - Add "Create Note from Transcription" button
  - Implement note creation from transcription
  - Link notes to source transcriptions

### Phase 5: Advanced Features (Week 5)
**Goal:** Polish and advanced capabilities

- [ ] **Day 1-2: Tag System**
  - Implement tag management for both notes and transcriptions
  - Add tag-based filtering
  - Create `TagManager.tsx` component

- [ ] **Day 3-4: Search Enhancement**
  - Implement full-text search
  - Add keyword highlighting
  - Optimize search performance

- [ ] **Day 5: Settings & Polish**
  - Create settings panels for notes and transcriptions
  - Add storage indicators
  - Implement auto-cleanup for old transcriptions
  - Final testing and bug fixes

---

## 8. Code Examples & Snippets

### 8.1 Update App.tsx for New Tabs

```typescript
// src/renderer/App.tsx
import NotesTab from '@/components/notes/NotesTab';
import TranscriptionsTab from '@/components/transcriptions/TranscriptionsTab';

export const TABS = {
  CHAT: "chat",
  NOTES: "notes",              // NEW
  TRANSCRIPTIONS: "transcriptions",  // NEW
  SETTINGS: "settings",
};

export default function Chat() {
  const [activeTab, setActiveTab] = useState(TABS.CHAT);
  
  // ... existing code ...

  return (
    <SidebarProvider>
      <AppSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        // ... other props
      />
      
      <SidebarInset>
        {activeTab === TABS.CHAT && (
          <ChatInterface {...chatProps} />
        )}
        
        {activeTab === TABS.NOTES && (
          <NotesTab />
        )}
        
        {activeTab === TABS.TRANSCRIPTIONS && (
          <TranscriptionsTab />
        )}
        
        {activeTab === TABS.SETTINGS && (
          <Settings {...settingsProps} />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 8.2 Complete IPC Setup

```typescript
// src/main/index.ts
import { setupNotesHandlers } from './ipc/notesHandlers';
import { setupTranscriptionsHandlers } from './ipc/transcriptionsHandlers';

app.whenReady().then(() => {
  createWindow();
  
  // Setup IPC handlers
  setupNotesHandlers();
  setupTranscriptionsHandlers();
  
  // ... existing code ...
});
```

### 8.3 Complete Preload API

```typescript
// src/preload/index.ts
const electronAPI = {
  // ... existing APIs ...
  
  // Notes API
  notes: {
    getAll: () => ipcRenderer.invoke('notes:getAll'),
    create: (note: Note) => ipcRenderer.invoke('notes:create', note),
    update: (id: string, updates: Partial<Note>) => 
      ipcRenderer.invoke('notes:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
    search: (query: string) => ipcRenderer.invoke('notes:search', query),
    export: (id: string, format: string) => 
      ipcRenderer.invoke('notes:export', id, format),
  },
  
  // Transcriptions API
  transcriptions: {
    getAll: () => ipcRenderer.invoke('transcriptions:getAll'),
    get: (id: string) => ipcRenderer.invoke('transcriptions:get', id),
    startSession: (source: string, language: string) => 
      ipcRenderer.invoke('transcriptions:startSession', source, language),
    addSegment: (sessionId: string, segment: any) => 
      ipcRenderer.invoke('transcriptions:addSegment', sessionId, segment),
    endSession: (sessionId: string) => 
      ipcRenderer.invoke('transcriptions:endSession', sessionId),
    update: (id: string, updates: any) => 
      ipcRenderer.invoke('transcriptions:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('transcriptions:delete', id),
    search: (query: string) => ipcRenderer.invoke('transcriptions:search', query),
    export: (id: string, format: string) => 
      ipcRenderer.invoke('transcriptions:export', id, format),
    updateSpeakerNames: (id: string, names: Record<number, string>) =>
      ipcRenderer.invoke('transcriptions:updateSpeakerNames', id, names),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

### 8.4 useNotes Hook

```typescript
// src/renderer/hooks/useNotes.ts
import { useState, useEffect, useCallback } from 'react';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const notesData = await window.electronAPI.notes.getAll();
      setNotes(Object.values(notesData));
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async (note: Note) => {
    await window.electronAPI.notes.create(note);
    await loadNotes();
  }, [loadNotes]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    await window.electronAPI.notes.update(id, updates);
    await loadNotes();
  }, [loadNotes]);

  const deleteNote = useCallback(async (id: string) => {
    await window.electronAPI.notes.delete(id);
    await loadNotes();
  }, [loadNotes]);

  const searchNotes = useCallback(async (query: string) => {
    const results = await window.electronAPI.notes.search(query);
    setNotes(results);
  }, []);

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    refresh: loadNotes,
  };
};
```

### 8.5 useTranscriptions Hook

```typescript
// src/renderer/hooks/useTranscriptions.ts
import { useState, useEffect, useCallback } from 'react';

export const useTranscriptions = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTranscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.transcriptions.getAll();
      setTranscriptions(Object.values(data));
    } catch (error) {
      console.error('Failed to load transcriptions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTranscriptions();
  }, [loadTranscriptions]);

  const deleteTranscription = useCallback(async (id: string) => {
    await window.electronAPI.transcriptions.delete(id);
    await loadTranscriptions();
  }, [loadTranscriptions]);

  const updateTranscription = useCallback(async (id: string, updates: any) => {
    await window.electronAPI.transcriptions.update(id, updates);
    await loadTranscriptions();
  }, [loadTranscriptions]);

  const exportTranscription = useCallback(async (id: string, format: string) => {
    return await window.electronAPI.transcriptions.export(id, format);
  }, []);

  return {
    transcriptions,
    loading,
    deleteTranscription,
    updateTranscription,
    exportTranscription,
    refresh: loadTranscriptions,
  };
};
```

---
