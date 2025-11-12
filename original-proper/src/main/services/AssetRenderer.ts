/**
 * AssetRenderer - Headless rendering of Mermaid and KaTeX
 *
 * This service creates a hidden BrowserWindow to render diagrams and formulas
 * to SVG/PNG without requiring user interaction.
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import type { AssetRequest, RenderedAsset, RenderConfig } from '../../types/export';

const DEFAULT_RENDER_CONFIG: RenderConfig = {
  width: 1200,
  height: 800,
  backgroundColor: 'transparent',
  scale: 2,
};

export class AssetRenderer {
  private hiddenWindow: BrowserWindow | null = null;
  private isInitialized = false;

  /**
   * Initialize the hidden rendering window
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.hiddenWindow && !this.hiddenWindow.isDestroyed()) {
      return;
    }

    this.hiddenWindow = new BrowserWindow({
      width: DEFAULT_RENDER_CONFIG.width,
      height: DEFAULT_RENDER_CONFIG.height,
      show: false,
      webPreferences: {
        offscreen: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load a minimal HTML page with Mermaid and KaTeX
    const htmlContent = this.generateRenderHTML();
    await this.hiddenWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Wait for libraries to load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.isInitialized = true;
    console.log('[AssetRenderer] Initialized hidden rendering window');
  }

  /**
   * Render an array of asset requests
   */
  async renderAssets(requests: AssetRequest[]): Promise<RenderedAsset[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results: RenderedAsset[] = [];

    for (const request of requests) {
      try {
        const result = await this.renderSingleAsset(request);
        results.push(result);
      } catch (error) {
        console.error(`[AssetRenderer] Failed to render ${request.id}:`, error);
        // Return failed asset
        results.push({
          id: request.id,
          filename: `${request.id}.${request.preferredFormat}`,
          format: request.preferredFormat,
          data: Buffer.alloc(0),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Render a single asset
   */
  private async renderSingleAsset(request: AssetRequest): Promise<RenderedAsset> {
    if (!this.hiddenWindow || this.hiddenWindow.isDestroyed()) {
      throw new Error('Rendering window not available');
    }

    const filename = `${request.id}.${request.preferredFormat}`;

    try {
      let svgContent: string;

      if (request.type === 'mermaid') {
        svgContent = await this.renderMermaid(request.content);
      } else if (request.type === 'katex-inline' || request.type === 'katex-block') {
        svgContent = await this.renderKaTeX(request.content, request.type === 'katex-block');
      } else {
        throw new Error(`Unsupported asset type: ${request.type}`);
      }

      // Convert SVG to buffer
      const data = Buffer.from(svgContent, 'utf-8');

      return {
        id: request.id,
        filename,
        format: 'svg',
        data,
        success: true,
      };
    } catch (error) {
      throw new Error(`Rendering failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Render Mermaid diagram to SVG
   */
  private async renderMermaid(content: string): Promise<string> {
    if (!this.hiddenWindow || this.hiddenWindow.isDestroyed()) {
      throw new Error('Window not available');
    }

    const escapedContent = content.replace(/`/g, '\\`').replace(/\$/g, '\\$');

    const result = await this.hiddenWindow.webContents.executeJavaScript(`
      (async () => {
        try {
          const { svg } = await mermaid.render('preview', \`${escapedContent}\`);
          return svg;
        } catch (error) {
          throw new Error('Mermaid render failed: ' + error.message);
        }
      })()
    `);

    if (!result) {
      throw new Error('Mermaid rendering returned empty result');
    }

    return result;
  }

  /**
   * Render KaTeX to SVG
   */
  private async renderKaTeX(content: string, isBlock: boolean): Promise<string> {
    if (!this.hiddenWindow || this.hiddenWindow.isDestroyed()) {
      throw new Error('Window not available');
    }

    const escapedContent = content.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const result = await this.hiddenWindow.webContents.executeJavaScript(`
      (async () => {
        try {
          const container = document.createElement('div');
          container.style.display = 'inline-block';
          container.style.padding = '${isBlock ? '20px' : '5px'}';
          document.body.appendChild(container);

          katex.render('${escapedContent}', container, {
            displayMode: ${isBlock},
            throwOnError: true,
            output: 'html',
          });

          // Convert to SVG
          const bbox = container.getBoundingClientRect();
          const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${bbox.width}" height="\${bbox.height}">
            <foreignObject width="100%" height="100%">
              <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 16px; font-family: 'KaTeX_Main', 'Times New Roman', serif;">
                \${container.innerHTML}
              </div>
            </foreignObject>
          </svg>\`;

          document.body.removeChild(container);
          return svg;
        } catch (error) {
          throw new Error('KaTeX render failed: ' + error.message);
        }
      })()
    `);

    if (!result) {
      throw new Error('KaTeX rendering returned empty result');
    }

    return result;
  }

  /**
   * Generate HTML page for rendering
   */
  private generateRenderHTML(): string {
    // Determine paths based on whether app is packaged
    const isPackaged = app.isPackaged;
    const mermaidPath = isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')
      : path.join(__dirname, '../../../node_modules/mermaid/dist/mermaid.min.js');

    const katexCSSPath = isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'node_modules', 'katex', 'dist', 'katex.min.css')
      : path.join(__dirname, '../../../node_modules/katex/dist/katex.min.css');

    const katexJSPath = isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'node_modules', 'katex', 'dist', 'katex.min.js')
      : path.join(__dirname, '../../../node_modules/katex/dist/katex.min.js');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="file://${katexCSSPath}">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #ffffff;
    }
    #preview {
      width: 100%;
      min-height: 400px;
    }
  </style>
</head>
<body>
  <div id="preview"></div>
  <script src="file://${mermaidPath}"></script>
  <script src="file://${katexJSPath}"></script>
  <script>
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    console.log('Render page loaded');
  </script>
</body>
</html>`;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.hiddenWindow && !this.hiddenWindow.isDestroyed()) {
      this.hiddenWindow.close();
      this.hiddenWindow = null;
    }
    this.isInitialized = false;
    console.log('[AssetRenderer] Destroyed');
  }
}

// Singleton instance
let rendererInstance: AssetRenderer | null = null;

export function getAssetRenderer(): AssetRenderer {
  if (!rendererInstance) {
    rendererInstance = new AssetRenderer();
  }
  return rendererInstance;
}

export function destroyAssetRenderer(): void {
  if (rendererInstance) {
    rendererInstance.destroy();
    rendererInstance = null;
  }
}
