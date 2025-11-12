/**
 * Export Service - Handles conversation export to Markdown with asset rendering
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { getChatSession } from './ChatHistoryService';
import { renderAsset, cleanupAssetRenderer } from '../utils/assetRenderer';
import {
  ExportRequest,
  ExportResult,
  ExportProgress,
  ContentBlock,
  AssetRenderRequest,
  MeetingExportRequest,
  MeetingExportResult,
} from '../../types/export';
import { ChatSessionWithMessages } from '../../types/chat-history';
import { meetingSessionManager } from './MeetingSessionManager';

// Mutex for serializing concurrent exports
let exportMutex: Promise<void> = Promise.resolve();

/**
 * Get the base exports directory (cross-platform safe)
 */
function getExportsBaseDir(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(process.cwd(), 'exports');
  }
  return path.join(app.getPath('userData'), 'exports');
}

/**
 * Generate a unique timestamp-based folder name
 */
function generateExportFolderName(): string {
  const now = new Date();
  // ISO format but replace colons with dashes for filesystem safety
  return now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

/**
 * Parse message content to extract special blocks (mermaid, latex, code)
 */
export function parseMessageContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let currentIndex = 0;

  // Regex patterns
  const mermaidPattern = /```mermaid\n([\s\S]*?)```/g;
  const latexBlockPattern = /\$\$([\s\S]*?)\$\$/g;
  const latexInlinePattern = /\$([^$\n]+?)\$/g;
  const codeBlockPattern = /```(\w*)\n([\s\S]*?)```/g;

  // First pass: find all special blocks
  interface FoundBlock {
    type: 'mermaid' | 'katex-inline' | 'katex-block' | 'code';
    content: string;
    language?: string;
    startIndex: number;
    endIndex: number;
  }

  const foundBlocks: FoundBlock[] = [];

  // Find mermaid blocks
  let match: RegExpExecArray | null;
  while ((match = mermaidPattern.exec(content)) !== null) {
    foundBlocks.push({
      type: 'mermaid',
      content: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Find code blocks (but not mermaid)
  while ((match = codeBlockPattern.exec(content)) !== null) {
    const language = match[1] || 'plaintext';
    if (language !== 'mermaid') {
      // Check if this overlaps with a mermaid block
      const overlaps = foundBlocks.some(
        (b) =>
          b.type === 'mermaid' &&
          match!.index >= b.startIndex &&
          match!.index < b.endIndex
      );
      if (!overlaps) {
        foundBlocks.push({
          type: 'code',
          content: match[2],
          language,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Find LaTeX block expressions ($$...$$)
  while ((match = latexBlockPattern.exec(content)) !== null) {
    // Check if inside a code block
    const insideCode = foundBlocks.some(
      (b) =>
        (b.type === 'code' || b.type === 'mermaid') &&
        match!.index >= b.startIndex &&
        match!.index < b.endIndex
    );
    if (!insideCode) {
      foundBlocks.push({
        type: 'katex-block',
        content: match[1].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Find LaTeX inline expressions ($...$)
  while ((match = latexInlinePattern.exec(content)) !== null) {
    // Check if inside a code block or latex block
    const inside = foundBlocks.some(
      (b) => match!.index >= b.startIndex && match!.index < b.endIndex
    );
    if (!inside) {
      foundBlocks.push({
        type: 'katex-inline',
        content: match[1].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Sort blocks by start index
  foundBlocks.sort((a, b) => a.startIndex - b.startIndex);

  // Build final block list including text segments
  for (const block of foundBlocks) {
    // Add text before this block
    if (block.startIndex > currentIndex) {
      blocks.push({
        type: 'text',
        content: content.slice(currentIndex, block.startIndex),
        startIndex: currentIndex,
        endIndex: block.startIndex,
      });
    }

    blocks.push(block);
    currentIndex = block.endIndex;
  }

  // Add remaining text
  if (currentIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.slice(currentIndex),
      startIndex: currentIndex,
      endIndex: content.length,
    });
  }

  return blocks;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format time only (HH:MM:SS)
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate content hash for deduplication
 */
function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

/**
 * Serialize messages to markdown with asset references
 */
export async function serializeToMarkdown(
  session: ChatSessionWithMessages,
  assetsDir: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<{ markdown: string; failedAssets: string[] }> {
  const lines: string[] = [];
  const failedAssets: string[] = [];

  // Track rendered assets by content hash to avoid duplicates
  const assetCache = new Map<string, string>();

  // Header
  lines.push('# Conversation Export');
  lines.push('');
  if (session.session.title) {
    lines.push(`**Title:** ${session.session.title}`);
  }
  lines.push(`**Exported:** ${formatTimestamp(Date.now())}`);
  lines.push(`**Started:** ${formatTimestamp(session.session.startedAt)}`);
  if (session.session.endedAt) {
    lines.push(`**Ended:** ${formatTimestamp(session.session.endedAt)}`);
  }
  lines.push(`**Messages:** ${session.messages.length}`);
  if (session.session.model) {
    lines.push(`**Model:** ${session.session.model}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Process each message
  const totalMessages = session.messages.length;

  for (let msgIdx = 0; msgIdx < session.messages.length; msgIdx++) {
    const message = session.messages[msgIdx];

    if (onProgress) {
      onProgress({
        current: msgIdx + 1,
        total: totalMessages,
        message: `Processing message ${msgIdx + 1}/${totalMessages}`,
      });
    }

    // Message header
    const role = capitalize(message.role);
    const time = formatTime(message.createdAt);
    lines.push(`## ${role} (${time})`);
    lines.push('');

    // Parse message content
    const blocks = parseMessageContent(message.content);

    // Process blocks
    let blockCounters = { mermaid: 0, katex: 0, code: 0 };

    for (const block of blocks) {
      if (block.type === 'text') {
        // Text is passed through as-is
        lines.push(block.content.trim());
      } else if (block.type === 'mermaid') {
        // Render mermaid diagram
        const contentHash = hashContent(block.content);

        if (assetCache.has(contentHash)) {
          // Reuse existing asset
          lines.push('');
          lines.push(`![Diagram](${assetCache.get(contentHash)})`);
          lines.push('');
        } else {
          const request: AssetRenderRequest = {
            type: 'mermaid',
            content: block.content,
            messageIndex: msgIdx,
            blockIndex: blockCounters.mermaid++,
          };

          try {
            const result = await renderAsset(request, path.dirname(assetsDir));

            if (result.success && result.path) {
              assetCache.set(contentHash, result.path);
              lines.push('');
              lines.push(`![Diagram](${result.path})`);
              lines.push('');
            } else {
              // Fallback to raw block
              failedAssets.push(
                `Mermaid (msg ${msgIdx}): ${result.error || 'Unknown error'}`
              );
              lines.push('');
              lines.push('```mermaid');
              lines.push(block.content);
              lines.push('```');
              lines.push('');
            }
          } catch (error) {
            failedAssets.push(`Mermaid (msg ${msgIdx}): ${String(error)}`);
            lines.push('');
            lines.push('```mermaid');
            lines.push(block.content);
            lines.push('```');
            lines.push('');
          }
        }
      } else if (block.type === 'katex-block' || block.type === 'katex-inline') {
        // Render LaTeX
        const contentHash = hashContent(block.content);

        if (assetCache.has(contentHash)) {
          // Reuse existing asset
          if (block.type === 'katex-block') {
            lines.push('');
            lines.push(`![Math](${assetCache.get(contentHash)})`);
            lines.push('');
          } else {
            lines.push(`![Math](${assetCache.get(contentHash)})`);
          }
        } else {
          const request: AssetRenderRequest = {
            type: 'katex',
            content: block.content,
            messageIndex: msgIdx,
            blockIndex: blockCounters.katex++,
          };

          try {
            const result = await renderAsset(request, path.dirname(assetsDir));

            if (result.success && result.path) {
              assetCache.set(contentHash, result.path);
              if (block.type === 'katex-block') {
                lines.push('');
                lines.push(`![Math](${result.path})`);
                lines.push('');
              } else {
                lines.push(`![Math](${result.path})`);
              }
            } else {
              // Fallback to raw LaTeX
              failedAssets.push(
                `LaTeX (msg ${msgIdx}): ${result.error || 'Unknown error'}`
              );
              if (block.type === 'katex-block') {
                lines.push('');
                lines.push(`$$${block.content}$$`);
                lines.push('');
              } else {
                lines.push(`$${block.content}$`);
              }
            }
          } catch (error) {
            failedAssets.push(`LaTeX (msg ${msgIdx}): ${String(error)}`);
            if (block.type === 'katex-block') {
              lines.push('');
              lines.push(`$$${block.content}$$`);
              lines.push('');
            } else {
              lines.push(`$${block.content}$`);
            }
          }
        }
      } else if (block.type === 'code') {
        // Preserve code blocks with language fences
        lines.push('');
        lines.push(`\`\`\`${block.language || ''}`);
        lines.push(block.content);
        lines.push('```');
        lines.push('');
      }
    }

    lines.push('');
  }

  return {
    markdown: lines.join('\n'),
    failedAssets,
  };
}

/**
 * Main export function
 */
export async function exportConversation(
  request: ExportRequest,
  mainWindow?: BrowserWindow
): Promise<ExportResult> {
  // Serialize access to prevent concurrent export corruption
  const release = await acquireMutex();

  try {
    const { sessionId, includeAssets } = request;

    // Get conversation from database
    const sessionData = getChatSession(sessionId);
    if (!sessionData) {
      return {
        success: false,
        exportPath: '',
        markdownPath: '',
        assetCount: 0,
        failedAssets: [],
        timestamp: '',
        error: `Session not found: ${sessionId}`,
      };
    }

    // Create export directory
    const baseDir = getExportsBaseDir();
    const timestamp = generateExportFolderName();
    const exportDir = path.join(baseDir, timestamp);
    const assetsDir = path.join(exportDir, 'assets');

    // Ensure directories exist
    await fs.mkdir(assetsDir, { recursive: true });

    // Progress callback
    const onProgress = mainWindow
      ? (progress: ExportProgress) => {
          if (!mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send('export:progress', progress);
          }
        }
      : undefined;

    // Serialize to markdown (with asset rendering if requested)
    let markdown: string;
    let failedAssets: string[] = [];

    if (includeAssets) {
      const result = await serializeToMarkdown(
        sessionData,
        assetsDir,
        onProgress
      );
      markdown = result.markdown;
      failedAssets = result.failedAssets;
    } else {
      // Simple export without asset rendering
      markdown = serializeToMarkdownSimple(sessionData);
    }

    // Write markdown file
    const markdownPath = path.join(exportDir, 'conversation.md');
    await fs.writeFile(markdownPath, markdown, 'utf-8');

    // Count assets
    let assetCount = 0;
    try {
      const assetFiles = await fs.readdir(assetsDir);
      assetCount = assetFiles.length;
    } catch {
      // Assets directory might be empty or not exist
    }

    return {
      success: true,
      exportPath: exportDir,
      markdownPath,
      assetCount,
      failedAssets,
      timestamp,
    };
  } catch (error) {
    return {
      success: false,
      exportPath: '',
      markdownPath: '',
      assetCount: 0,
      failedAssets: [],
      timestamp: '',
      error: String(error),
    };
  } finally {
    release();
  }
}

/**
 * Simple markdown serialization without asset rendering
 */
function serializeToMarkdownSimple(session: ChatSessionWithMessages): string {
  const lines: string[] = [];

  // Header
  lines.push('# Conversation Export');
  lines.push('');
  if (session.session.title) {
    lines.push(`**Title:** ${session.session.title}`);
  }
  lines.push(`**Exported:** ${formatTimestamp(Date.now())}`);
  lines.push(`**Started:** ${formatTimestamp(session.session.startedAt)}`);
  lines.push(`**Messages:** ${session.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  for (const message of session.messages) {
    const role = capitalize(message.role);
    const time = formatTime(message.createdAt);
    lines.push(`## ${role} (${time})`);
    lines.push('');
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Mutex implementation for serializing exports
 */
async function acquireMutex(): Promise<() => void> {
  let release: () => void;
  const newMutex = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previousMutex = exportMutex;
  exportMutex = previousMutex.then(() => newMutex);

  await previousMutex;
  return release!;
}

/**
 * Cleanup resources on app quit
 */
export function cleanupExportService(): void {
  cleanupAssetRenderer();
}

/**
 * Get the export base directory (for UI display)
 */
export function getExportDirectory(): string {
  return getExportsBaseDir();
}

/**
 * Export meeting transcription to markdown
 */
export async function exportMeetingTranscription(
  request: MeetingExportRequest
): Promise<MeetingExportResult> {
  const release = await acquireMutex();

  try {
    // Get meeting details
    const meetingDetails = meetingSessionManager.getMeetingDetails(request.meetingId);

    if (!meetingDetails) {
      return {
        success: false,
        exportPath: '',
        markdownPath: '',
        timestamp: '',
        error: `Meeting not found: ${request.meetingId}`,
      };
    }

    // Create export directory
    const timestamp = generateExportFolderName();
    const exportDir = path.join(getExportsBaseDir(), `meeting-${timestamp}`);
    await fs.mkdir(exportDir, { recursive: true });

    // Generate markdown content
    const markdownContent = serializeMeetingToMarkdown(meetingDetails, request.includeTimestamps);

    // Write markdown file
    const markdownPath = path.join(exportDir, 'transcription.md');
    await fs.writeFile(markdownPath, markdownContent, 'utf-8');

    return {
      success: true,
      exportPath: exportDir,
      markdownPath,
      timestamp,
    };
  } catch (error) {
    console.error('[ExportService] Meeting export failed:', error);
    return {
      success: false,
      exportPath: '',
      markdownPath: '',
      timestamp: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    release();
  }
}

/**
 * Serialize meeting transcription to markdown
 */
function serializeMeetingToMarkdown(meeting: any, includeTimestamps: boolean): string {
  const lines: string[] = [];

  // Header
  lines.push('# Meeting Transcription Export');
  lines.push('');
  lines.push(`**Title:** ${meeting.title || 'Untitled Meeting'}`);
  lines.push(`**Started:** ${new Date(meeting.startedAt).toLocaleString()}`);
  if (meeting.endedAt) {
    lines.push(`**Ended:** ${new Date(meeting.endedAt).toLocaleString()}`);
  }
  if (meeting.duration) {
    const minutes = Math.floor(meeting.duration / 60);
    const seconds = meeting.duration % 60;
    lines.push(`**Duration:** ${minutes}m ${seconds}s`);
  }
  if (meeting.wordCount) {
    lines.push(`**Word Count:** ${meeting.wordCount}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Transcriptions by source
  if (meeting.transcriptions && meeting.transcriptions.length > 0) {
    for (const transcription of meeting.transcriptions) {
      const sourceLabel = transcription.source === 'microphone' ? 'Microphone' : 'System Audio';
      lines.push(`## ${sourceLabel}`);
      lines.push('');

      if (transcription.segments && transcription.segments.length > 0) {
        for (const segment of transcription.segments) {
          if (includeTimestamps && segment.startTime) {
            const time = new Date(segment.startTime).toLocaleTimeString();
            lines.push(`**[${time}]**`);
          }
          lines.push(segment.text);
          lines.push('');
        }
      } else if (transcription.fullText) {
        lines.push(transcription.fullText);
        lines.push('');
      } else {
        lines.push('*No transcription content available*');
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  } else {
    lines.push('*No transcriptions recorded for this meeting*');
    lines.push('');
  }

  return lines.join('\n');
}
