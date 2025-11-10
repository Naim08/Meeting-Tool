import { randomUUID } from "crypto";
import type {
  AppendChatMessagePayload,
  ChatMessageRecord,
  ChatRole,
  ChatSessionRecord,
  ChatSessionWithMessages,
  CreateChatSessionPayload,
  ListChatSessionsParams,
} from "../../types/chat-history";
import { getDb, isDatabaseInitialized } from "./Database";

const PREVIEW_MAX_LENGTH = 280;

const toEpoch = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : Date.now();

const normaliseText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const truncateForPreview = (content: string) => {
  if (content.length <= PREVIEW_MAX_LENGTH) {
    return content;
  }
  return `${content.slice(0, PREVIEW_MAX_LENGTH).trim()}…`;
};

const mapSessionRow = (row: any): ChatSessionRecord => ({
  id: row.id,
  title: row.title ?? null,
  startedAt: Number(row.started_at),
  endedAt: row.ended_at !== null && row.ended_at !== undefined ? Number(row.ended_at) : null,
  messageCount: Number(row.message_count ?? 0),
  model: row.model ?? null,
  systemPromptHash: row.system_prompt_hash ?? null,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
  lastMessagePreview: row.last_message_preview ?? null,
  lastMessageRole: row.last_message_role ?? null,
});

const mapMessageRow = (row: any): ChatMessageRecord => ({
  id: row.id,
  sessionId: row.session_id,
  role: row.role as ChatRole,
  content: row.content,
  rawJson: row.raw_json ?? null,
  tokens: row.tokens !== undefined && row.tokens !== null ? Number(row.tokens) : null,
  attachmentMeta: row.attachment_meta ?? null,
  createdAt: Number(row.created_at),
});

export function createChatSession(
  payload: CreateChatSessionPayload = {}
): ChatSessionRecord {
  if (!isDatabaseInitialized()) {
    throw new Error("Database not initialized");
  }
  const db = getDb();
  const id = randomUUID();
  const now = toEpoch(payload.startedAt);
  const insert = db.prepare(`
    INSERT INTO chat_sessions (
      id,
      title,
      started_at,
      ended_at,
      message_count,
      model,
      system_prompt_hash,
      created_at,
      updated_at,
      last_message_preview,
      last_message_role
    )
    VALUES (
      @id,
      @title,
      @started_at,
      NULL,
      0,
      @model,
      @system_prompt_hash,
      @created_at,
      @updated_at,
      NULL,
      NULL
    );
  `);

  insert.run({
    id,
    title: normaliseText(payload.title),
    started_at: now,
    model: normaliseText(payload.model),
    system_prompt_hash: normaliseText(payload.systemPromptHash),
    created_at: now,
    updated_at: now,
  });

  const sessionRow = db
    .prepare(`SELECT * FROM chat_sessions WHERE id = ?`)
    .get(id);

  return mapSessionRow(sessionRow);
}

export function appendChatMessage(
  sessionId: string,
  payload: AppendChatMessagePayload
): void {
  if (!isDatabaseInitialized()) {
    throw new Error("Database not initialized");
  }
  if (!payload.content || !payload.content.trim()) {
    return;
  }

  const db = getDb();
  const id = randomUUID();
  const createdAt = toEpoch(payload.createdAt);
  const rawJson =
    payload.rawJson !== undefined ? JSON.stringify(payload.rawJson) : null;
  const attachmentMeta =
    payload.attachmentMeta !== undefined
      ? JSON.stringify(payload.attachmentMeta)
      : null;

  const insertMessage = db.prepare(
    `
      INSERT INTO chat_messages (
        id,
        session_id,
        role,
        content,
        raw_json,
        tokens,
        attachment_meta,
        created_at
      )
      VALUES (
        @id,
        @session_id,
        @role,
        @content,
        @raw_json,
        @tokens,
        @attachment_meta,
        @created_at
      );
    `
  );

  const updateSession = db.prepare(
    `
      UPDATE chat_sessions
      SET
        message_count = message_count + 1,
        updated_at = @updated_at,
        last_message_preview = @last_message_preview,
        last_message_role = @last_message_role
      WHERE id = @session_id;
    `
  );

  const transaction = db.transaction(() => {
    insertMessage.run({
      id,
      session_id: sessionId,
      role: payload.role,
      content: payload.content,
      raw_json: rawJson,
      tokens:
        payload.tokens !== undefined && payload.tokens !== null
          ? Number(payload.tokens)
          : null,
      attachment_meta: attachmentMeta,
      created_at: createdAt,
    });

    updateSession.run({
      session_id: sessionId,
      updated_at: createdAt,
      last_message_preview: truncateForPreview(payload.content.trim()),
      last_message_role: payload.role,
    });
  });

  transaction();
}

export function completeChatSession(sessionId: string, endedAt?: number) {
  if (!isDatabaseInitialized()) {
    return;
  }
  const db = getDb();
  const timestamp = toEpoch(endedAt);
  db.prepare(
    `
      UPDATE chat_sessions
      SET ended_at = COALESCE(ended_at, @ended_at),
          updated_at = CASE
            WHEN ended_at IS NULL THEN @ended_at
            ELSE updated_at
          END
      WHERE id = @id;
    `
  ).run({ id: sessionId, ended_at: timestamp });
}

export function completeAllOpenChatSessions() {
  if (!isDatabaseInitialized()) {
    return;
  }
  const db = getDb();
  const timestamp = Date.now();
  db.prepare(
    `
      UPDATE chat_sessions
      SET ended_at = COALESCE(ended_at, @ended_at),
          updated_at = CASE
            WHEN ended_at IS NULL THEN @ended_at
            ELSE updated_at
          END
      WHERE ended_at IS NULL;
    `
  ).run({ ended_at: timestamp });
}

export function updateChatSessionTitle(sessionId: string, title: string | null) {
  if (!isDatabaseInitialized()) {
    throw new Error("Database not initialized");
  }
  const db = getDb();
  const normalised = normaliseText(title);
  const timestamp = Date.now();
  db.prepare(
    `
      UPDATE chat_sessions
      SET title = @title,
          updated_at = @updated_at
      WHERE id = @id;
    `
  ).run({ id: sessionId, title: normalised, updated_at: timestamp });
}

export function listChatSessions(
  params: ListChatSessionsParams = {}
): ChatSessionRecord[] {
  if (!isDatabaseInitialized()) {
    throw new Error("Database not initialized");
  }
  const db = getDb();
  const limit = Math.max(1, Math.min(params.limit ?? 50, 200));
  const offset = Math.max(0, params.offset ?? 0);

  const rows = db
    .prepare(
      `
        SELECT
          id,
          title,
          started_at,
          ended_at,
          message_count,
          model,
          system_prompt_hash,
          created_at,
          updated_at,
          last_message_preview,
          last_message_role
        FROM chat_sessions
        ORDER BY started_at DESC
        LIMIT @limit OFFSET @offset;
      `
    )
    .all({ limit, offset });

  return rows.map(mapSessionRow);
}

export function getChatSession(
  sessionId: string
): ChatSessionWithMessages | null {
  if (!isDatabaseInitialized()) {
    throw new Error("Database not initialized");
  }
  const db = getDb();
  const sessionRow = db
    .prepare(`SELECT * FROM chat_sessions WHERE id = ?`)
    .get(sessionId);

  if (!sessionRow) {
    return null;
  }

  const messageRows = db
    .prepare(
      `
        SELECT *
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at ASC;
      `
    )
    .all(sessionId);

  return {
    session: mapSessionRow(sessionRow),
    messages: messageRows.map(mapMessageRow),
  };
}

export function deleteChatSession(sessionId: string) {
  if (!isDatabaseInitialized()) {
    throw new Error("Database not initialized");
  }
  const db = getDb();
  const deleteStmt = db.prepare(`DELETE FROM chat_sessions WHERE id = ?`);
  const result = deleteStmt.run(sessionId);
  return result.changes > 0;
}
