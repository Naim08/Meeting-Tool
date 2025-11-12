/**
 * Markdown Serializer - Pure TypeScript Implementation
 *
 * Converts ExportConversation to Markdown with asset placeholders.
 * No I/O, IPC, Electron, or Node.js imports - just pure string manipulation.
 *
 * Features:
 * - Detects fenced code blocks and preserves them
 * - Detects Mermaid diagrams and generates image placeholders
 * - Detects KaTeX (inline $ and block $$) and generates image placeholders
 * - Stable, deterministic IDs: msg-<i>-<kind>-<j>
 * - Minimal escaping for markdown safety
 */

import type {
  ExportConversation,
  ExportMessage,
  SerializedMarkdown,
  AssetRequest,
  ExportOptions,
} from '../types/export';

/**
 * Default export options
 */
const DEFAULT_OPTIONS: Required<ExportOptions> = {
  includeSystemPrompt: true,
  includeMetadata: true,
  maxImageWidth: 1200,
  preferSvg: true,
};

/**
 * Internal parsed block representation
 */
interface ParsedBlock {
  type: 'text' | 'code' | 'mermaid' | 'katex-inline' | 'katex-block';
  content: string;
  language?: string;
  start: number;
  end: number;
}

/**
 * Convert an ExportConversation to Markdown with asset placeholders
 *
 * @param conversation - The conversation to serialize
 * @param options - Export options (optional)
 * @returns SerializedMarkdown with markdown string and asset requests
 */
export function toMarkdown(
  conversation: ExportConversation,
  options?: ExportOptions
): SerializedMarkdown {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const assetRequests: AssetRequest[] = [];
  let markdown = '';

  // Header with metadata
  markdown += '# Conversation Export\n\n';

  if (opts.includeMetadata) {
    markdown += `**Title:** ${escapeMarkdown(conversation.title)}\n`;
    markdown += `**Started:** ${formatTimestamp(conversation.startedAt)}\n`;

    if (conversation.endedAt) {
      markdown += `**Ended:** ${formatTimestamp(conversation.endedAt)}\n`;
    }

    if (conversation.model) {
      markdown += `**Model:** ${escapeMarkdown(conversation.model)}\n`;
    }

    markdown += `**Messages:** ${conversation.messages.length}\n\n`;

    if (opts.includeSystemPrompt && conversation.systemPrompt) {
      markdown += '**System Prompt:**\n\n';
      markdown += '```\n';
      markdown += conversation.systemPrompt;
      markdown += '\n```\n\n';
    }

    markdown += '---\n\n';
  }

  // Process each message
  conversation.messages.forEach((message, messageIndex) => {
    markdown += serializeMessage(message, messageIndex, assetRequests, opts);
    markdown += '\n';
  });

  // Footer with export metadata
  if (opts.includeMetadata) {
    markdown += '---\n\n';
    markdown += '## Export Metadata\n\n';
    markdown += `**Exported:** ${formatTimestamp(new Date().toISOString())}\n`;
    markdown += `**Assets:** ${assetRequests.length} items\n`;
  }

  return {
    markdown,
    assetRequests,
  };
}

/**
 * Serialize a single message
 */
function serializeMessage(
  message: ExportMessage,
  messageIndex: number,
  assetRequests: AssetRequest[],
  options: Required<ExportOptions>
): string {
  let markdown = '';

  // Message header
  const roleCapitalized = message.role.charAt(0).toUpperCase() + message.role.slice(1);
  markdown += `## Message ${messageIndex + 1} - ${roleCapitalized} (${formatTimestamp(message.createdAt)})\n\n`;

  // Parse content into blocks
  const blocks = parseContent(message.content);

  // Track block indices per type
  const blockCounters: Record<string, number> = {
    mermaid: 0,
    'katex-inline': 0,
    'katex-block': 0,
    'code-image': 0,
  };

  // Serialize each block
  blocks.forEach((block) => {
    if (block.type === 'text') {
      markdown += block.content;
    } else if (block.type === 'code') {
      // Preserve code blocks as-is
      markdown += '```';
      if (block.language) {
        markdown += block.language;
      }
      markdown += '\n';
      markdown += block.content;
      markdown += '\n```\n\n';
    } else if (block.type === 'mermaid') {
      // Generate asset request and placeholder
      const blockIndex = blockCounters.mermaid++;
      const assetId = `msg-${messageIndex}-mermaid-${blockIndex}`;
      const format = options.preferSvg ? 'svg' : 'png';
      const filename = `${assetId}.${format}`;

      assetRequests.push({
        id: assetId,
        type: 'mermaid',
        content: block.content,
        preferredFormat: format,
        messageIndex,
        blockIndex,
      });

      markdown += `![Mermaid Diagram](./assets/${filename})\n\n`;
    } else if (block.type === 'katex-inline') {
      // Generate asset request and inline placeholder
      const blockIndex = blockCounters['katex-inline']++;
      const assetId = `msg-${messageIndex}-katex-inline-${blockIndex}`;
      const format = options.preferSvg ? 'svg' : 'png';
      const filename = `${assetId}.${format}`;

      assetRequests.push({
        id: assetId,
        type: 'katex-inline',
        content: block.content,
        preferredFormat: format,
        messageIndex,
        blockIndex,
      });

      markdown += `![LaTeX](./assets/${filename})`;
    } else if (block.type === 'katex-block') {
      // Generate asset request and block placeholder
      const blockIndex = blockCounters['katex-block']++;
      const assetId = `msg-${messageIndex}-katex-block-${blockIndex}`;
      const format = options.preferSvg ? 'svg' : 'png';
      const filename = `${assetId}.${format}`;

      assetRequests.push({
        id: assetId,
        type: 'katex-block',
        content: block.content,
        preferredFormat: format,
        messageIndex,
        blockIndex,
      });

      markdown += `![LaTeX Block](./assets/${filename})\n\n`;
    }
  });

  markdown += '---\n\n';

  return markdown;
}

/**
 * Parse message content into blocks (text, code, mermaid, katex)
 */
function parseContent(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let position = 0;

  // First pass: Extract fenced code blocks (including mermaid)
  const fencedBlocks: Array<{ start: number; end: number; type: 'code' | 'mermaid'; content: string; language?: string }> = [];

  const fencedRegex = /```([a-z]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fencedRegex.exec(content)) !== null) {
    const language = match[1] || undefined;
    let code = match[2];
    const start = match.index;
    const end = start + match[0].length;

    // Trim trailing newline if present (common in fenced blocks)
    if (code.endsWith('\n')) {
      code = code.slice(0, -1);
    }

    if (language === 'mermaid') {
      fencedBlocks.push({ start, end, type: 'mermaid', content: code });
    } else {
      fencedBlocks.push({ start, end, type: 'code', content: code, language });
    }
  }

  // Sort by start position
  fencedBlocks.sort((a, b) => a.start - b.start);

  // Second pass: Extract KaTeX blocks outside of fenced code
  const allBlocks: Array<{ start: number; end: number; block: ParsedBlock }> = [];

  // Add fenced blocks
  fencedBlocks.forEach((fb) => {
    allBlocks.push({
      start: fb.start,
      end: fb.end,
      block: {
        type: fb.type,
        content: fb.content,
        language: fb.language,
        start: fb.start,
        end: fb.end,
      },
    });
  });

  // Extract KaTeX blocks ($$...$$ for block, $...$ for inline)
  // Only outside of fenced blocks
  const katexBlockRegex = /\$\$([\s\S]*?)\$\$/g;
  const katexInlineRegex = /\$([^\$\n]+?)\$/g;

  // Find KaTeX block $$...$$
  while ((match = katexBlockRegex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // Check if this is inside a fenced block
    if (isInsideFencedBlock(start, end, fencedBlocks)) {
      continue;
    }

    allBlocks.push({
      start,
      end,
      block: {
        type: 'katex-block',
        content: match[1],
        start,
        end,
      },
    });
  }

  // Find KaTeX inline $...$
  katexInlineRegex.lastIndex = 0; // Reset regex
  while ((match = katexInlineRegex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // Check if this is inside a fenced block or already captured as block
    if (isInsideFencedBlock(start, end, fencedBlocks) || isOverlappingWithKatexBlock(start, end, allBlocks)) {
      continue;
    }

    allBlocks.push({
      start,
      end,
      block: {
        type: 'katex-inline',
        content: match[1],
        start,
        end,
      },
    });
  }

  // Sort all blocks by start position
  allBlocks.sort((a, b) => a.start - b.start);

  // Third pass: Build final blocks with text in between
  position = 0;
  allBlocks.forEach((ab) => {
    // Add text before this block
    if (position < ab.start) {
      const textContent = content.substring(position, ab.start);
      if (textContent) {
        blocks.push({
          type: 'text',
          content: textContent,
          start: position,
          end: ab.start,
        });
      }
    }

    // Add the block
    blocks.push(ab.block);
    position = ab.end;
  });

  // Add remaining text
  if (position < content.length) {
    const textContent = content.substring(position);
    if (textContent) {
      blocks.push({
        type: 'text',
        content: textContent,
        start: position,
        end: content.length,
      });
    }
  }

  return blocks;
}

/**
 * Check if a range is inside a fenced code block
 */
function isInsideFencedBlock(
  start: number,
  end: number,
  fencedBlocks: Array<{ start: number; end: number }>
): boolean {
  return fencedBlocks.some((fb) => start >= fb.start && end <= fb.end);
}

/**
 * Check if a range overlaps with a KaTeX block (to prevent $$ from capturing $ inside)
 */
function isOverlappingWithKatexBlock(
  start: number,
  end: number,
  allBlocks: Array<{ start: number; end: number; block: ParsedBlock }>
): boolean {
  return allBlocks.some((ab) => {
    if (ab.block.type !== 'katex-block') return false;
    // Check for overlap
    return (start >= ab.start && start < ab.end) || (end > ab.start && end <= ab.end);
  });
}

/**
 * Format ISO timestamp to readable string (UTC)
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Escape markdown special characters (minimal escaping)
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
