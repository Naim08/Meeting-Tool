import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";

let db: Database.Database | null = null;

export function initializeDatabase() {
  if (db) {
    return db;
  }

  const dbPath = join(app.getPath("userData"), "transcriptions.db");
  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration INTEGER,
      word_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      meeting_id TEXT,
      source TEXT NOT NULL,
      language TEXT,
      model TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      full_text TEXT,
      word_count INTEGER DEFAULT 0,
      speaker_count INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (meeting_id) REFERENCES meeting_sessions(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transcription_segments (
      id TEXT PRIMARY KEY,
      transcription_id TEXT NOT NULL,
      meeting_id TEXT,
      text TEXT NOT NULL,
      start_time INTEGER,
      end_time INTEGER,
      speaker TEXT,
      confidence REAL,
      is_final INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (meeting_id) REFERENCES meeting_sessions(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS speaker_segments (
      id TEXT PRIMARY KEY,
      transcription_id TEXT NOT NULL,
      meeting_id TEXT,
      speaker TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      confidence REAL,
      start_time INTEGER,
      end_time INTEGER,
      FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (meeting_id) REFERENCES meeting_sessions(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      session_id TEXT PRIMARY KEY,
      transcription_id TEXT NOT NULL,
      meeting_id TEXT,
      source TEXT NOT NULL,
      language TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      last_updated INTEGER NOT NULL,
      FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (meeting_id) REFERENCES meeting_sessions(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS unified_transcriptions (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      meeting_id TEXT,
      microphone_transcription_id TEXT,
      system_audio_transcription_id TEXT,
      speaker_mapping TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (meeting_id) REFERENCES meeting_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (microphone_transcription_id) REFERENCES transcriptions(id) ON DELETE SET NULL,
      FOREIGN KEY (system_audio_transcription_id) REFERENCES transcriptions(id) ON DELETE SET NULL
    );
  `);

  const ensureColumn = (table: string, column: string, definition: string) => {
    const pragmaStmt = db.prepare(`PRAGMA table_info(${table})`);
    const columns = pragmaStmt.all() as Array<{ name: string }>;
    if (!columns.some((col) => col.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  ensureColumn("transcriptions", "meeting_id", "TEXT");
  ensureColumn("transcription_segments", "meeting_id", "TEXT");
  ensureColumn("speaker_segments", "meeting_id", "TEXT");
  ensureColumn("active_sessions", "meeting_id", "TEXT");
  ensureColumn("meeting_sessions", "word_count", "INTEGER DEFAULT 0");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_meeting_sessions_started_at ON meeting_sessions(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transcriptions_source ON transcriptions(source);
    CREATE INDEX IF NOT EXISTS idx_transcriptions_meeting_id ON transcriptions(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_transcriptions_start_time ON transcriptions(start_time DESC);
    CREATE INDEX IF NOT EXISTS idx_segments_transcription_id ON transcription_segments(transcription_id);
    CREATE INDEX IF NOT EXISTS idx_segments_meeting_id ON transcription_segments(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_speaker_segments_transcription_id ON speaker_segments(transcription_id);
    CREATE INDEX IF NOT EXISTS idx_speaker_segments_meeting_id ON speaker_segments(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_active_sessions_meeting_id ON active_sessions(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_unified_transcriptions_session_id ON unified_transcriptions(session_id);
    CREATE INDEX IF NOT EXISTS idx_unified_transcriptions_status ON unified_transcriptions(status);
    CREATE INDEX IF NOT EXISTS idx_unified_transcriptions_meeting_id ON unified_transcriptions(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_unified_transcriptions_started_at ON unified_transcriptions(started_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      transcription_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      language TEXT,
      word_count INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (note_id, tag),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      message_count INTEGER DEFAULT 0,
      model TEXT,
      system_prompt_hash TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_message_preview TEXT,
      last_message_role TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      raw_json TEXT,
      tokens INTEGER,
      attachment_meta TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at ON chat_messages(session_id, created_at);
  `);

  const CURRENT_DB_VERSION = 1;
  const userVersion = db.pragma("user_version", { simple: true }) as number;
  if (userVersion < CURRENT_DB_VERSION) {
    db.pragma(`user_version = ${CURRENT_DB_VERSION}`);
  }

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

export function isDatabaseInitialized() {
  return db !== null;
}
