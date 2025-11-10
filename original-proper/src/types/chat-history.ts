export type ChatRole = "user" | "assistant" | "system";

export interface ChatSessionRecord {
  id: string;
  title: string | null;
  startedAt: number;
  endedAt: number | null;
  messageCount: number;
  model: string | null;
  systemPromptHash: string | null;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string | null;
  lastMessageRole?: ChatRole | null;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  rawJson: string | null;
  tokens: number | null;
  attachmentMeta: string | null;
  createdAt: number;
}

export interface ChatSessionWithMessages {
  session: ChatSessionRecord;
  messages: ChatMessageRecord[];
}

export interface CreateChatSessionPayload {
  title?: string | null;
  startedAt?: number;
  model?: string | null;
  systemPromptHash?: string | null;
}

export interface AppendChatMessagePayload {
  role: ChatRole;
  content: string;
  rawJson?: unknown;
  tokens?: number | null;
  attachmentMeta?: unknown;
  createdAt?: number;
}

export interface ListChatSessionsParams {
  limit?: number;
  offset?: number;
}
