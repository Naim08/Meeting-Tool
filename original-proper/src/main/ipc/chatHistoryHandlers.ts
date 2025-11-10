import { ipcMain } from "electron";
import type {
  AppendChatMessagePayload,
  CreateChatSessionPayload,
  ListChatSessionsParams,
} from "../../types/chat-history";
import {
  appendChatMessage,
  completeChatSession,
  createChatSession,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  updateChatSessionTitle,
} from "../services/ChatHistoryService";

export function setupChatHistoryHandlers() {
  ipcMain.handle(
    "chat-history:create-session",
    async (_event, payload?: CreateChatSessionPayload) => {
      try {
        return createChatSession(payload ?? {});
      } catch (error) {
        console.error("[Main] Failed to create chat session:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "chat-history:append-message",
    async (_event, sessionId: string, payload: AppendChatMessagePayload) => {
      try {
        if (typeof sessionId !== "string" || !sessionId) {
          throw new Error("Invalid session id for appendMessage");
        }
        appendChatMessage(sessionId, payload);
      } catch (error) {
        console.error("[Main] Failed to append chat message:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "chat-history:complete-session",
    async (_event, sessionId: string, endedAt?: number) => {
      try {
        if (typeof sessionId !== "string" || !sessionId) {
          throw new Error("Invalid session id for completeSession");
        }
        completeChatSession(sessionId, endedAt);
      } catch (error) {
        console.error("[Main] Failed to complete chat session:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "chat-history:list",
    async (_event, params?: ListChatSessionsParams) => {
      try {
        return listChatSessions(params ?? {});
      } catch (error) {
        console.error("[Main] Failed to list chat sessions:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "chat-history:get",
    async (_event, sessionId: string) => {
      try {
        if (typeof sessionId !== "string" || !sessionId) {
          throw new Error("Invalid session id for getSession");
        }
        return getChatSession(sessionId);
      } catch (error) {
        console.error("[Main] Failed to fetch chat session:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "chat-history:update-title",
    async (_event, sessionId: string, title: string | null) => {
      try {
        if (typeof sessionId !== "string" || !sessionId) {
          throw new Error("Invalid session id for updateTitle");
        }
        updateChatSessionTitle(sessionId, title ?? null);
      } catch (error) {
        console.error("[Main] Failed to update chat session title:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "chat-history:delete",
    async (_event, sessionId: string) => {
      try {
        if (typeof sessionId !== "string" || !sessionId) {
          throw new Error("Invalid session id for delete");
        }
        return deleteChatSession(sessionId);
      } catch (error) {
        console.error("[Main] Failed to delete chat session:", error);
        throw error;
      }
    }
  );
}
