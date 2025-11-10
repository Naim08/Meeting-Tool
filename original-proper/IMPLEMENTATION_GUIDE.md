# Transcription & Notes Roadmap

## Goal
Ship a reliable flow that records microphone and system audio transcripts into SQLite and exposes a minimal notes experience. Tackle it in thin, verifiable slices instead of a monolithic drop.

---

## Current Baseline
- **Storage:** `src/main/services/Database.ts` defines the SQLite schema (transcriptions, segments, speakers, notes, tags) and is already initialized on app start.
- **Session plumbing:** `TranscriptionRecorder`/`SessionManager` (`src/main/services/TranscriptionRecorder.ts`) can persist segments but are never fed real audio data. The renderer `TranscriptionSessionManager` keeps its own in-memory map, so direct IPC calls can leave the two out of sync.
- **UI:** `ActiveSessionsTab` renders a placeholder dashboard and uses `window.api.transcriptions.*`, but recorded stats stay at zero because no segments are written.

---

## Milestone 1 – Persist Live Transcriptions
**Objective:** When users record mic or system audio, store the transcript, speaker data, and session metadata in SQLite and surface real stats in the Active Sessions tab.

### Tasks
1. **Unify session control**
   - Ensure every start/stop entry point (`ActiveSessionsTab`, tray/IPC toggles, auto-stop flows) calls `transcriptionSessionManager.startSession/endSession`.
   - Make `TranscriptionSessionManager.endSession` delegate to `window.api.transcriptions.endSession` to keep renderer state and main DB aligned.

2. **Capture microphone transcripts**
   - In `useTranscription.tsx`, whenever Deepgram emits a final chunk, call `transcriptionSessionManager.addSegment('microphone', …)` with timing, speaker (if present), and confidence.
   - Optionally batch diarization data via `addSpeakerSegment` when Deepgram utterance events arrive.

3. **Capture system audio transcripts**
   - Extend `AssemblyAITranscriptionService` so a final transcript calls into `sessionManager.getSession(sessionId)?.addSegment(...)` and `addSpeakerSegment(...)`.
   - Store the active system session id on start and clear it on stop.

4. **Refresh live stats**
   - Keep `ActiveSessionsTab` polling, but now the data returned from the main process should show duration, word count, and full text changing as segments arrive.

5. **Guard with automation**
   - Add a lightweight integration test or script that starts a fake session, injects a segment, and verifies `transcriptions` and `transcription_segments` tables update as expected.

### Acceptance Criteria
- Starting a mic or system recording creates exactly one active session per source and no “already recording” errors appear on restart.
- Speaking during a recording increases duration, word count, and transcript preview in the Active Sessions UI.
- Stopping a recording flushes the session to SQLite; rerunning the app keeps the historical record.
- A diagnostic script/test passes, proving segments persist.

### Key Files
`src/renderer/App.tsx`, `src/renderer/hooks/useTranscription.tsx`, `src/renderer/components/transcriptions/ActiveSessionsTab.tsx`, `src/renderer/services/TranscriptionSessionManager.ts`, `src/main/services/TranscriptionService.ts`, `src/main/services/TranscriptionRecorder.ts`.

---

## Milestone 2 – Minimal Notes Experience
**Objective:** Let users create and view notes derived from saved transcripts without building the full management suite yet.

### Tasks
1. **Main-process API**
   - Implement a focused notes manager that wraps the existing `notes` table (`create`, `list`, `update`, `favorite`, `delete`, tag association when ready).
   - Expose IPC endpoints plus preload wrappers under `window.api.notes`.

2. **Renderer data layer**
   - Add a `useNotes` hook (load, create, save, favorite).
   - Surface notes in a simple list/detail view; reuse existing layout primitives.

3. **Create from transcription**
   - Add a CTA in the Active Sessions detail or future transcripts list that calls `useNotes.createFromTranscription`, pre-filling the note with transcript text and a generated title.

### Acceptance Criteria
- Notes persist across restarts and include title, body, timestamps, and optional `transcriptionId`.
- Users can create a note from a finished transcription and see it immediately in the new Notes view.
- CRUD actions never block chat or transcription flows (no renderer crashes, no console errors).

### Key Files
`src/main/services/NotesManager.ts` (new), `src/main/ipc/notesHandlers.ts` (new), `src/preload/index.ts`, `src/renderer/hooks/useNotes.ts`, `src/renderer/components/notes/*`.

---

## Deferred / Nice-to-Haves
- Speaker diarization UI polish (colors, renaming, timelines).
- Advanced filters and exports for transcriptions/notes.
- Auto-tagging, search highlighting, storage quotas.

---

## Testing & Verification
- **Manual:** Record short mic/system sessions, confirm Active Sessions updates in real time, stop recordings, and inspect persisted data via SQLite browser or script.
- **Automated:** Add regression tests for session start/end flows and note creation once APIs are stable.
- **Diagnostics:** Log session ids and segment counts at INFO level while iterating; remove or gate behind debug flags before release.

---

## Dependencies
- `better-sqlite3` is already part of the project. No additional packages are required for Milestone 1. Install TypeScript types (`@types/better-sqlite3`) only if type errors appear.
