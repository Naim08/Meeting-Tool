/**
 * Asset Renderer - Uses hidden BrowserWindow to render Mermaid/KaTeX to SVG/PNG
 */

import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AssetRenderRequest, AssetRenderResult } from '../../types/export';

let hiddenWindow: BrowserWindow | null = null;

/**
 * Get or create hidden rendering window
 */
async function getHiddenWindow(): Promise<BrowserWindow> {
  if (hiddenWindow && !hiddenWindow.isDestroyed()) {
    return hiddenWindow;
  }

  hiddenWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      offscreen: true,
    },
  });

  // Use base64 encoding for data URL - more compact than URL encoding
  const htmlContent = getOfflineHtml();
  const base64Html = Buffer.from(htmlContent).toString('base64');
  await hiddenWindow.loadURL(`data:text/html;base64,${base64Html}`);

  // Wait for page to be ready
  await new Promise<void>((resolve) => {
    hiddenWindow!.webContents.once('did-finish-load', () => {
      resolve();
    });
  });

  return hiddenWindow;
}

/**
 * Generate offline HTML with embedded libraries
 */
function getOfflineHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: white;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }
        #render-container {
          display: inline-block;
          max-width: 100%;
        }
        .mermaid {
          text-align: center;
        }
        .katex {
          font-size: 1.3em;
        }
        .katex-display {
          margin: 0;
          padding: 10px 0;
        }
        pre {
          margin: 0;
          padding: 16px;
          background: #f6f8fa;
          border-radius: 6px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        code {
          font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
          font-size: 14px;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div id="render-container"></div>
    </body>
    </html>
  `;
}

/**
 * Get path to node_modules for loading bundled libraries
 */
function getNodeModulesPath(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(process.cwd(), 'node_modules');
  }
  // In packaged mode, node_modules should be in resources
  return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');
}

/**
 * Render Mermaid diagram to SVG
 */
async function renderMermaid(content: string): Promise<{ svg: string; error?: string }> {
  const window = await getHiddenWindow();
  const nodeModulesPath = getNodeModulesPath();

  try {
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const container = document.getElementById('render-container');
        container.innerHTML = '';

        // Initialize mermaid if not already done
        if (typeof mermaid === 'undefined') {
          // Load mermaid from local node_modules
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'file://${nodeModulesPath.replace(/\\/g, '/')}/mermaid/dist/mermaid.min.js';
            script.onload = resolve;
            script.onerror = (e) => reject(new Error('Failed to load local mermaid library'));
            document.head.appendChild(script);
          });
        }

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        });

        const id = 'mermaid-' + Date.now();
        const { svg } = await mermaid.render(id, ${JSON.stringify(content)});
        return { svg, error: null };
      })().catch(err => ({ svg: null, error: err.message || String(err) }));
    `);

    return result;
  } catch (error) {
    return { svg: '', error: String(error) };
  }
}

/**
 * Render KaTeX to SVG
 * Note: We use latex.js which is already in package.json instead of katex
 */
async function renderKatex(content: string, displayMode: boolean): Promise<{ html: string; error?: string }> {
  const window = await getHiddenWindow();
  const nodeModulesPath = getNodeModulesPath();

  try {
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const container = document.getElementById('render-container');
        container.innerHTML = '';

        // Load latex.js if not already done (using the bundled version)
        if (typeof latexjs === 'undefined') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // latex.js provides a browser bundle
            script.src = 'file://${nodeModulesPath.replace(/\\/g, '/')}/latex.js/dist/latex.js';
            script.onload = resolve;
            script.onerror = (e) => reject(new Error('Failed to load local latex.js library'));
            document.head.appendChild(script);
          });
        }

        // latex.js uses a different API - it parses full LaTeX documents
        // For math expressions, we wrap them appropriately
        let latexDoc = ${displayMode}
          ? '\\\\[' + ${JSON.stringify(content)} + '\\\\]'
          : '\\\\(' + ${JSON.stringify(content)} + '\\\\)';

        try {
          const generator = new latexjs.HtmlGenerator({ hyphenate: false });
          const { parse } = latexjs;
          const doc = parse(latexDoc, { generator });
          const fragment = doc.domFragment();
          container.innerHTML = '';
          container.appendChild(fragment);
          return { html: container.innerHTML, error: null };
        } catch (parseErr) {
          // Fallback: just render the raw math
          container.innerHTML = '<code>' + ${JSON.stringify(content)} + '</code>';
          return { html: container.innerHTML, error: null };
        }
      })().catch(err => ({ html: null, error: err.message || String(err) }));
    `);

    return result;
  } catch (error) {
    return { html: '', error: String(error) };
  }
}

/**
 * Capture rendered content as SVG
 */
async function captureAsSvg(window: BrowserWindow): Promise<string> {
  const svgContent = await window.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('render-container');
      const svg = container.querySelector('svg');
      if (svg) {
        // Clone SVG and embed styles
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return new XMLSerializer().serializeToString(clone);
      }
      // If no SVG, convert HTML to SVG using foreignObject
      const html = container.innerHTML;
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 100);
      const height = Math.max(rect.height, 50);

      return \`<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="\${width}" height="\${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif;">
              \${html}
            </div>
          </foreignObject>
        </svg>\`;
    })();
  `);

  return svgContent;
}

/**
 * Capture rendered content as PNG
 */
async function captureAsPng(window: BrowserWindow): Promise<Buffer> {
  // Get the bounding rect of the content
  const rect = await window.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('render-container');
      const rect = container.getBoundingClientRect();
      return {
        x: Math.floor(rect.x),
        y: Math.floor(rect.y),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
      };
    })();
  `);

  // Capture the specific region
  const image = await window.webContents.capturePage({
    x: rect.x,
    y: rect.y,
    width: Math.min(rect.width, 2000), // Limit to prevent huge images
    height: Math.min(rect.height, 2000),
  });

  return image.toPNG();
}

/**
 * Main render function for assets
 */
export async function renderAsset(
  request: AssetRenderRequest,
  outputDir: string
): Promise<AssetRenderResult> {
  const { type, content, messageIndex, blockIndex } = request;
  const filename = `msg-${messageIndex}-${type}-${blockIndex}`;

  try {
    if (type === 'mermaid') {
      const { svg, error } = await renderMermaid(content);
      if (error || !svg) {
        return {
          success: false,
          format: 'svg',
          error: error || 'Failed to render Mermaid diagram',
          fallbackToRaw: true,
        };
      }

      const relativePath = `assets/${filename}.svg`;
      const absolutePath = path.join(outputDir, relativePath);
      await fs.writeFile(absolutePath, svg, 'utf-8');

      return {
        success: true,
        path: relativePath,
        absolutePath,
        format: 'svg',
        fallbackToRaw: false,
      };
    }

    if (type === 'katex') {
      const isBlockMode = content.startsWith('$$') || content.includes('\n');
      const cleanContent = content.replace(/^\$\$?|\$\$?$/g, '').trim();

      const { html, error } = await renderKatex(cleanContent, isBlockMode);
      if (error || !html) {
        return {
          success: false,
          format: 'svg',
          error: error || 'Failed to render KaTeX',
          fallbackToRaw: true,
        };
      }

      // Convert KaTeX HTML to SVG
      const window = await getHiddenWindow();
      await window.webContents.executeJavaScript(`
        document.getElementById('render-container').innerHTML = ${JSON.stringify(html)};
      `);

      // Give it a moment to render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const svg = await captureAsSvg(window);
      const relativePath = `assets/${filename}.svg`;
      const absolutePath = path.join(outputDir, relativePath);
      await fs.writeFile(absolutePath, svg, 'utf-8');

      return {
        success: true,
        path: relativePath,
        absolutePath,
        format: 'svg',
        fallbackToRaw: false,
      };
    }

    if (type === 'codeblock') {
      // For code blocks, we'll create a simple PNG screenshot
      const window = await getHiddenWindow();
      await window.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('render-container');
          const pre = document.createElement('pre');
          const code = document.createElement('code');
          code.textContent = ${JSON.stringify(content)};
          pre.appendChild(code);
          container.innerHTML = '';
          container.appendChild(pre);
        })();
      `);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const pngBuffer = await captureAsPng(window);
      const relativePath = `assets/${filename}.png`;
      const absolutePath = path.join(outputDir, relativePath);
      await fs.writeFile(absolutePath, pngBuffer);

      return {
        success: true,
        path: relativePath,
        absolutePath,
        format: 'png',
        fallbackToRaw: false,
      };
    }

    return {
      success: false,
      format: 'svg',
      error: `Unknown asset type: ${type}`,
      fallbackToRaw: true,
    };
  } catch (error) {
    return {
      success: false,
      format: 'svg',
      error: String(error),
      fallbackToRaw: true,
    };
  }
}

/**
 * Cleanup hidden window when app is quitting
 */
export function cleanupAssetRenderer(): void {
  if (hiddenWindow && !hiddenWindow.isDestroyed()) {
    hiddenWindow.destroy();
    hiddenWindow = null;
  }
}

/**
 * Pre-warm the hidden window for faster first render
 */
export async function initAssetRenderer(): Promise<void> {
  try {
    await getHiddenWindow();
  } catch (error) {
    console.error('Failed to initialize asset renderer:', error);
  }
}
