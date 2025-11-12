/**
 * Export feature type definitions
 */

export interface ExportRequest {
  sessionId: string;
  includeAssets: boolean;
}

export interface MeetingExportRequest {
  meetingId: string;
  includeTimestamps: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  message: string;
}

export interface AssetRenderRequest {
  type: 'mermaid' | 'katex' | 'codeblock';
  content: string;
  messageIndex: number;
  blockIndex: number;
}

export interface AssetRenderResult {
  success: boolean;
  path?: string; // Relative path within export folder (e.g., 'assets/msg-0-mermaid-0.svg')
  absolutePath?: string; // Full path on disk
  format: 'svg' | 'png';
  error?: string;
  fallbackToRaw: boolean;
}

export interface ExportedAsset {
  originalContent: string;
  renderedPath: string; // Relative path for markdown reference
  type: 'mermaid' | 'katex' | 'codeblock';
  format: 'svg' | 'png';
}

export interface ExportResult {
  success: boolean;
  exportPath: string; // Full path to export directory
  markdownPath: string; // Full path to conversation.md
  assetCount: number;
  failedAssets: string[]; // Non-fatal render fallbacks (content previews)
  timestamp: string;
  error?: string;
}

export interface MeetingExportResult {
  success: boolean;
  exportPath: string;
  markdownPath: string;
  timestamp: string;
  error?: string;
}

export interface MessageForExport {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export interface ConversationForExport {
  sessionId: string;
  title: string | null;
  startedAt: number;
  messages: MessageForExport[];
}

// Content block types detected during parsing
export interface ContentBlock {
  type: 'text' | 'mermaid' | 'katex-inline' | 'katex-block' | 'code';
  content: string;
  language?: string; // For code blocks
  startIndex: number;
  endIndex: number;
}

export interface ParsedMessage {
  message: MessageForExport;
  blocks: ContentBlock[];
}
