/**
 * Export Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the
 * Export Conversation feature.
 */

// ============================================================================
// Conversation Data Structures (Input)
// ============================================================================

/**
 * Conversation data structure for export (fetched from database)
 */
export interface ExportConversation {
  sessionId: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  messages: ExportMessage[];
  model?: string;
  systemPrompt?: string;
}

/**
 * Individual message within a conversation
 */
export interface ExportMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  tokens?: number;
}

// ============================================================================
// Content Block Parsing
// ============================================================================

/**
 * Parsed content block within a message
 * Used by the serializer to detect special content types
 */
export interface ContentBlock {
  type: 'text' | 'code' | 'mermaid' | 'katex-inline' | 'katex-block';
  content: string;
  language?: string; // For code blocks
  lineStart: number;
  lineEnd: number;
}

// ============================================================================
// Serialization Output
// ============================================================================

/**
 * Result of markdown serialization
 */
export interface SerializedMarkdown {
  markdown: string; // Full markdown content with asset placeholders
  assetRequests: AssetRequest[]; // Assets that need rendering
}

/**
 * Request to render a specific asset
 */
export interface AssetRequest {
  id: string; // Unique identifier (e.g., "msg-0-mermaid-0")
  type: 'mermaid' | 'katex-inline' | 'katex-block' | 'code-image';
  content: string; // Source content to render
  preferredFormat: 'svg' | 'png';
  messageIndex: number;
  blockIndex: number;
}

// ============================================================================
// Asset Rendering
// ============================================================================

/**
 * Configuration for headless rendering
 */
export interface RenderConfig {
  width: number; // Default 1200px for diagrams
  height: number; // Default 800px, auto-adjust
  backgroundColor: string; // 'transparent' or '#1a1a1a' for dark theme
  scale: number; // Device pixel ratio (2 for retina)
}

/**
 * Result of rendering a single asset
 */
export interface RenderedAsset {
  id: string; // Matches AssetRequest.id
  filename: string; // e.g., "msg-0-mermaid-0.svg"
  format: 'svg' | 'png';
  data: Buffer; // File data
  success: boolean;
  error?: string; // If rendering failed
}

/**
 * Complete asset rendering pipeline result
 */
export interface AssetRenderResult {
  assets: RenderedAsset[];
  fallbacks: AssetFallback[]; // Failed renders
}

/**
 * Information about a failed asset render (fallback to source code)
 */
export interface AssetFallback {
  id: string;
  type: string;
  reason: string; // Error message
  originalContent: string; // Source to embed as fenced block
}

// ============================================================================
// Export Request & Options
// ============================================================================

/**
 * Request to export a conversation (renderer → main)
 */
export interface ExportRequest {
  sessionId: string;
  type: 'conversation' | 'meeting';
  options?: ExportOptions;
}

/**
 * Options for customizing export behavior
 */
export interface ExportOptions {
  includeSystemPrompt?: boolean; // Default: true
  includeMetadata?: boolean; // Default: true
  maxImageWidth?: number; // Default: 1200
  preferSvg?: boolean; // Default: true
}

// ============================================================================
// Export Progress & Result
// ============================================================================

/**
 * Export progress updates (main → renderer)
 */
export interface ExportProgress {
  stage: 'fetching' | 'serializing' | 'rendering' | 'writing' | 'complete';
  progress: number; // 0-100
  message: string; // User-friendly status
  assetsRendered?: number;
  assetsTotal?: number;
}

/**
 * Final export result (main → renderer)
 */
export interface ExportResult {
  success: boolean;
  exportPath: string; // Absolute path to exports/<timestamp>/
  conversationPath: string; // Path to conversation.md
  assetsCount: number;
  fallbacksCount: number;
  fallbacks: AssetFallback[]; // Non-fatal render failures
  error?: string; // Fatal error message
  duration: number; // Export time in ms
}

// ============================================================================
// Internal Service Types
// ============================================================================

/**
 * Asset cache entry for detecting duplicates
 */
export interface AssetCacheEntry {
  contentHash: string;
  filename: string;
}

/**
 * Export statistics for logging/debugging
 */
export interface ExportStats {
  messageCount: number;
  assetCount: number;
  fallbackCount: number;
  totalSize: number; // bytes
  duration: number; // ms
}
