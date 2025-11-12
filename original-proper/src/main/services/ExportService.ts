/**
 * ExportService - Orchestrates the complete export flow
 *
 * Responsibilities:
 * - Fetch conversation data from database
 * - Serialize to markdown
 * - Render assets headlessly
 * - Write files to disk
 * - Emit progress events
 */

import { promises as fs } from 'fs';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { toMarkdown } from '../../export/markdownSerializer';
import { getAssetRenderer } from './AssetRenderer';
import { getChatSession } from './ChatHistoryService';
import { meetingSessionManager } from './MeetingSessionManager';
import type {
  ExportRequest,
  ExportResult,
  ExportProgress,
  ExportConversation,
  AssetCacheEntry,
  ExportOptions,
  RenderedAsset,
} from '../../types/export';

export class ExportService extends EventEmitter {
  private assetCache = new Map<string, AssetCacheEntry>();
  private exportInProgress = false;

  constructor() {
    super();
  }

  /**
   * Export a conversation to markdown with assets
   */
  async exportConversation(request: ExportRequest): Promise<ExportResult> {
    if (this.exportInProgress) {
      throw new Error('Export already in progress');
    }

    this.exportInProgress = true;
    const startTime = Date.now();

    try {
      this.emitProgress({
        stage: 'fetching',
        progress: 10,
        message: 'Fetching conversation from database...',
      });

      // Step 1: Fetch conversation data
      const chatData = getChatSession(request.sessionId);
      if (!chatData) {
        throw new Error(`Conversation not found: ${request.sessionId}`);
      }

      const exportConversation = this.convertToExportFormat(chatData);

      this.emitProgress({
        stage: 'serializing',
        progress: 30,
        message: 'Converting to markdown format...',
      });

      // Step 2: Serialize to markdown
      const options: ExportOptions = {
        includeSystemPrompt: request.options?.includeSystemPrompt ?? true,
        includeMetadata: request.options?.includeMetadata ?? true,
        maxImageWidth: request.options?.maxImageWidth ?? 1200,
        preferSvg: request.options?.preferSvg ?? true,
      };

      const serialized = toMarkdown(exportConversation, options);

      this.emitProgress({
        stage: 'rendering',
        progress: 50,
        message: `Rendering ${serialized.assetRequests.length} assets...`,
        assetsTotal: serialized.assetRequests.length,
        assetsRendered: 0,
      });

      // Step 3: Render assets
      const renderer = getAssetRenderer();
      const renderedAssets = await renderer.renderAssets(serialized.assetRequests);

      const successfulAssets = renderedAssets.filter((a) => a.success);
      const failedAssets = renderedAssets.filter((a) => !a.success);

      this.emitProgress({
        stage: 'writing',
        progress: 80,
        message: 'Writing files to disk...',
        assetsRendered: renderedAssets.length,
      });

      // Step 4: Create export directory
      const timestamp = this.generateTimestamp();
      const exportDir = await this.createExportDirectory(timestamp);
      const assetsDir = path.join(exportDir, 'assets');
      await fs.mkdir(assetsDir, { recursive: true });

      // Step 5: Write markdown file
      const conversationPath = path.join(exportDir, 'conversation.md');
      await fs.writeFile(conversationPath, serialized.markdown, 'utf-8');

      // Step 6: Write asset files
      for (const asset of successfulAssets) {
        const assetPath = path.join(assetsDir, asset.filename);
        await fs.writeFile(assetPath, asset.data);
      }

      const duration = Date.now() - startTime;

      this.emitProgress({
        stage: 'complete',
        progress: 100,
        message: 'Export complete!',
        assetsRendered: renderedAssets.length,
        assetsTotal: serialized.assetRequests.length,
      });

      return {
        success: true,
        exportPath: exportDir,
        conversationPath,
        assetsCount: successfulAssets.length,
        fallbacksCount: failedAssets.length,
        fallbacks: failedAssets.map((asset) => ({
          id: asset.id,
          type: serialized.assetRequests.find((r) => r.id === asset.id)?.type || 'unknown',
          reason: asset.error || 'Unknown error',
          originalContent: serialized.assetRequests.find((r) => r.id === asset.id)?.content || '',
        })),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[ExportService] Export failed:', error);

      return {
        success: false,
        exportPath: '',
        conversationPath: '',
        assetsCount: 0,
        fallbacksCount: 0,
        fallbacks: [],
        error: error instanceof Error ? error.message : String(error),
        duration,
      };
    } finally {
      this.exportInProgress = false;
      this.assetCache.clear();
    }
  }

  /**
   * Export a meeting to markdown with assets
   */
  async exportMeeting(request: ExportRequest): Promise<ExportResult> {
    if (this.exportInProgress) {
      throw new Error('Export already in progress');
    }

    this.exportInProgress = true;
    const startTime = Date.now();

    try {
      this.emitProgress({
        stage: 'fetching',
        progress: 10,
        message: 'Fetching meeting from database...',
      });

      // Step 1: Fetch meeting data
      const meetingData = await meetingSessionManager.getMeetingDetails(request.sessionId);
      if (!meetingData) {
        throw new Error(`Meeting not found: ${request.sessionId}`);
      }

      const exportConversation = this.convertMeetingToExportFormat(meetingData);

      // Rest of the export flow is the same as regular conversations
      return await this.performExport(exportConversation, request, startTime);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[ExportService] Meeting export failed:', error);

      return {
        success: false,
        exportPath: '',
        conversationPath: '',
        assetsCount: 0,
        fallbacksCount: 0,
        fallbacks: [],
        error: error instanceof Error ? error.message : String(error),
        duration,
      };
    } finally {
      this.exportInProgress = false;
      this.assetCache.clear();
    }
  }

  /**
   * Common export logic (shared between conversations and meetings)
   */
  private async performExport(
    exportConversation: ExportConversation,
    request: ExportRequest,
    startTime: number
  ): Promise<ExportResult> {
    this.emitProgress({
      stage: 'serializing',
      progress: 30,
      message: 'Converting to markdown format...',
    });

    // Step 2: Serialize to markdown
    const options: ExportOptions = {
      includeSystemPrompt: request.options?.includeSystemPrompt ?? true,
      includeMetadata: request.options?.includeMetadata ?? true,
      maxImageWidth: request.options?.maxImageWidth ?? 1200,
      preferSvg: request.options?.preferSvg ?? true,
    };

    const serialized = toMarkdown(exportConversation, options);

    this.emitProgress({
      stage: 'rendering',
      progress: 50,
      message: `Rendering ${serialized.assetRequests.length} assets...`,
      assetsTotal: serialized.assetRequests.length,
      assetsRendered: 0,
    });

    // Step 3: Render assets
    const renderer = getAssetRenderer();
    const renderedAssets = await renderer.renderAssets(serialized.assetRequests);

    const successfulAssets = renderedAssets.filter((a) => a.success);
    const failedAssets = renderedAssets.filter((a) => !a.success);

    this.emitProgress({
      stage: 'writing',
      progress: 80,
      message: 'Writing files to disk...',
      assetsRendered: renderedAssets.length,
    });

    // Step 4: Create export directory
    const timestamp = this.generateTimestamp();
    const exportDir = await this.createExportDirectory(timestamp);
    const assetsDir = path.join(exportDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    // Step 5: Write markdown file
    const conversationPath = path.join(exportDir, 'conversation.md');
    await fs.writeFile(conversationPath, serialized.markdown, 'utf-8');

    // Step 6: Write asset files
    for (const asset of successfulAssets) {
      const assetPath = path.join(assetsDir, asset.filename);
      await fs.writeFile(assetPath, asset.data);
    }

    const duration = Date.now() - startTime;

    this.emitProgress({
      stage: 'complete',
      progress: 100,
      message: 'Export complete!',
      assetsRendered: renderedAssets.length,
      assetsTotal: serialized.assetRequests.length,
    });

    return {
      success: true,
      exportPath: exportDir,
      conversationPath,
      assetsCount: successfulAssets.length,
      fallbacksCount: failedAssets.length,
      fallbacks: failedAssets.map((asset) => ({
        id: asset.id,
        type: serialized.assetRequests.find((r) => r.id === asset.id)?.type || 'unknown',
        reason: asset.error || 'Unknown error',
        originalContent: serialized.assetRequests.find((r) => r.id === asset.id)?.content || '',
      })),
      duration,
    };
  }

  /**
   * Convert meeting data to ExportConversation format
   */
  private convertMeetingToExportFormat(meetingData: any): ExportConversation {
    const messages: ExportConversation['messages'] = [];

    // Process each transcription
    if (meetingData.transcriptions) {
      meetingData.transcriptions.forEach((transcription: any) => {
        if (transcription.segments) {
          transcription.segments.forEach((segment: any, index: number) => {
            // Determine role based on source (microphone = user, system = assistant)
            const role = transcription.source === 'microphone' ? 'user' : 'assistant';

            messages.push({
              id: segment.id || `${transcription.id}-segment-${index}`,
              role,
              content: segment.text || '',
              createdAt: segment.start_time
                ? new Date(segment.start_time).toISOString()
                : new Date(transcription.start_time).toISOString(),
            });
          });
        }
      });
    }

    // Sort messages by timestamp
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      sessionId: meetingData.id,
      title: meetingData.title || 'Untitled Meeting',
      startedAt: new Date(meetingData.started_at || meetingData.startedAt).toISOString(),
      endedAt: meetingData.ended_at || meetingData.endedAt
        ? new Date(meetingData.ended_at || meetingData.endedAt).toISOString()
        : null,
      messages,
    };
  }

  /**
   * Convert ChatSessionWithMessages to ExportConversation format
   */
  private convertToExportFormat(data: any): ExportConversation {
    return {
      sessionId: data.session.id,
      title: data.session.title || 'Untitled Conversation',
      startedAt: new Date(data.session.startedAt).toISOString(),
      endedAt: data.session.endedAt ? new Date(data.session.endedAt).toISOString() : null,
      model: data.session.model || undefined,
      messages: data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.createdAt).toISOString(),
        tokens: msg.tokens || undefined,
      })),
    };
  }

  /**
   * Generate timestamp for export directory
   */
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${ms}`;
  }

  /**
   * Create export directory
   */
  private async createExportDirectory(timestamp: string): Promise<string> {
    const userDataPath = app.getPath('userData');
    const exportsBase = path.join(userDataPath, 'exports');
    const exportDir = path.join(exportsBase, timestamp);

    await fs.mkdir(exportDir, { recursive: true });

    return exportDir;
  }

  /**
   * Emit progress update
   */
  private emitProgress(progress: ExportProgress): void {
    this.emit('progress', progress);
  }

  /**
   * Check if asset is duplicate (by content hash)
   */
  private getAssetHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}

// Singleton instance
let serviceInstance: ExportService | null = null;

export function getExportService(): ExportService {
  if (!serviceInstance) {
    serviceInstance = new ExportService();
  }
  return serviceInstance;
}

export function destroyExportService(): void {
  if (serviceInstance) {
    serviceInstance.removeAllListeners();
    serviceInstance = null;
  }
}
