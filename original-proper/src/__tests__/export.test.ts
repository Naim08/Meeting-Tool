/**
 * Unit tests for Export Service
 * Tests the markdown serializer and content parsing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseMessageContent } from '../main/services/ExportService';

describe('parseMessageContent', () => {
  describe('text content', () => {
    it('should handle plain text', () => {
      const content = 'This is plain text';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        type: 'text',
        content: 'This is plain text',
        startIndex: 0,
        endIndex: 18,
      });
    });

    it('should handle empty content', () => {
      const blocks = parseMessageContent('');
      expect(blocks).toHaveLength(0);
    });

    it('should handle multiline text', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('text');
      expect(blocks[0].content).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('fenced code blocks', () => {
    it('should detect code block with language', () => {
      const content = '```typescript\nconst x = 1;\n```';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        type: 'code',
        content: 'const x = 1;\n',
        language: 'typescript',
        startIndex: 0,
        endIndex: 30,
      });
    });

    it('should detect code block without language', () => {
      const content = '```\nplain code\n```';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('code');
      expect(blocks[0].content).toBe('plain code\n');
      // Defaults to 'plaintext' when no language specified
      expect(blocks[0].language).toBe('plaintext');
    });

    it('should preserve language fence for various languages', () => {
      const languages = ['javascript', 'python', 'rust', 'go', 'java', 'cpp'];

      for (const lang of languages) {
        const content = `\`\`\`${lang}\ncode here\n\`\`\``;
        const blocks = parseMessageContent(content);

        expect(blocks[0].language).toBe(lang);
      }
    });

    it('should handle multiple code blocks', () => {
      const content = '```js\ncode1\n```\nText\n```python\ncode2\n```';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe('code');
      expect(blocks[0].language).toBe('js');
      expect(blocks[1].type).toBe('text');
      expect(blocks[2].type).toBe('code');
      expect(blocks[2].language).toBe('python');
    });
  });

  describe('mermaid blocks', () => {
    it('should detect mermaid diagram', () => {
      const content = '```mermaid\ngraph TD\nA --> B\n```';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('mermaid');
      expect(blocks[0].content).toBe('graph TD\nA --> B');
    });

    it('should handle complex mermaid diagrams', () => {
      const content = `\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob
    B->>A: Hi Alice
\`\`\``;
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('mermaid');
      expect(blocks[0].content).toContain('sequenceDiagram');
      expect(blocks[0].content).toContain('Alice');
    });

    it('should differentiate mermaid from other code blocks', () => {
      const content = '```mermaid\ngraph\n```\n```javascript\ncode\n```';
      const blocks = parseMessageContent(content);

      // Includes a text block for the newline between
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      const mermaidBlocks = blocks.filter((b) => b.type === 'mermaid');
      const codeBlocks = blocks.filter((b) => b.type === 'code');

      expect(mermaidBlocks).toHaveLength(1);
      expect(codeBlocks).toHaveLength(1);
      expect(codeBlocks[0].language).toBe('javascript');
    });
  });

  describe('KaTeX expressions', () => {
    it('should detect inline LaTeX', () => {
      const content = 'The formula is $E = mc^2$ inline.';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe('text');
      expect(blocks[1].type).toBe('katex-inline');
      expect(blocks[1].content).toBe('E = mc^2');
      expect(blocks[2].type).toBe('text');
    });

    it('should detect block LaTeX', () => {
      const content = 'Before\n$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$\nAfter';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe('text');
      expect(blocks[1].type).toBe('katex-block');
      expect(blocks[1].content).toBe('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
      expect(blocks[2].type).toBe('text');
    });

    it('should handle multiple inline LaTeX expressions', () => {
      const content = 'Variables $x$ and $y$ are related by $z = x + y$.';
      const blocks = parseMessageContent(content);

      const katexBlocks = blocks.filter((b) => b.type === 'katex-inline');
      expect(katexBlocks).toHaveLength(3);
      expect(katexBlocks[0].content).toBe('x');
      expect(katexBlocks[1].content).toBe('y');
      expect(katexBlocks[2].content).toBe('z = x + y');
    });

    it('should not detect LaTeX inside code blocks', () => {
      const content = '```\n$not latex$\n```';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('code');
      // No katex blocks should be detected
      expect(blocks.some((b) => b.type === 'katex-inline')).toBe(false);
    });

    it('should handle complex LaTeX expressions', () => {
      const content = '$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('katex-block');
      expect(blocks[0].content).toContain('\\int');
      expect(blocks[0].content).toContain('\\sqrt{\\pi}');
    });
  });

  describe('message metadata', () => {
    it('should parse content for different message roles', () => {
      const testCases = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'system', content: 'System message' },
      ];

      for (const testCase of testCases) {
        const blocks = parseMessageContent(testCase.content);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].content).toBe(testCase.content);
      }
    });
  });

  describe('mixed content', () => {
    it('should handle text with code and LaTeX', () => {
      const content = `Here's an example:
\`\`\`python
def f(x):
    return x**2
\`\`\`
The formula is $f(x) = x^2$.`;

      const blocks = parseMessageContent(content);

      expect(blocks.length).toBeGreaterThanOrEqual(3);

      const textBlocks = blocks.filter((b) => b.type === 'text');
      const codeBlocks = blocks.filter((b) => b.type === 'code');
      const katexBlocks = blocks.filter((b) => b.type === 'katex-inline');

      expect(textBlocks.length).toBeGreaterThanOrEqual(1);
      expect(codeBlocks).toHaveLength(1);
      expect(codeBlocks[0].language).toBe('python');
      expect(katexBlocks).toHaveLength(1);
      expect(katexBlocks[0].content).toBe('f(x) = x^2');
    });

    it('should handle mermaid, code, and text together', () => {
      const content = `Here's a diagram:
\`\`\`mermaid
graph TD
A --> B
\`\`\`
And some code:
\`\`\`javascript
console.log("test");
\`\`\``;

      const blocks = parseMessageContent(content);

      const mermaidBlocks = blocks.filter((b) => b.type === 'mermaid');
      const codeBlocks = blocks.filter((b) => b.type === 'code');

      expect(mermaidBlocks).toHaveLength(1);
      expect(codeBlocks).toHaveLength(1);
      expect(mermaidBlocks[0].content).toContain('graph TD');
      expect(codeBlocks[0].content).toContain('console.log');
    });

    it('should preserve order of blocks', () => {
      const content = 'Text $x$ more text\n```js\ncode\n```\nfinal text';
      const blocks = parseMessageContent(content);

      expect(blocks[0].type).toBe('text');
      expect(blocks[1].type).toBe('katex-inline');
      expect(blocks[2].type).toBe('text');
      expect(blocks[3].type).toBe('code');
      expect(blocks[4].type).toBe('text');

      // Verify order by indices
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].startIndex).toBeGreaterThanOrEqual(
          blocks[i - 1].endIndex
        );
      }
    });
  });

  describe('edge cases', () => {
    it('should handle unclosed code blocks', () => {
      const content = '```javascript\ncode without closing';
      const blocks = parseMessageContent(content);

      // Should treat as plain text if not properly closed
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('text');
    });

    it('should handle unclosed LaTeX', () => {
      const content = 'This has $unclosed latex';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('text');
    });

    it('should handle escaped dollar signs', () => {
      const content = 'Price is \\$50';
      const blocks = parseMessageContent(content);

      // This is a limitation - we don't handle escapes currently
      // Just verify it doesn't crash
      expect(blocks).toBeDefined();
      expect(blocks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long code blocks', () => {
      const longCode = 'x\n'.repeat(1000);
      const content = `\`\`\`python\n${longCode}\`\`\``;
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('code');
      expect(blocks[0].content.length).toBeGreaterThan(1000);
    });

    it('should handle nested backticks in code', () => {
      const content = '```markdown\n`inline code`\n```';
      const blocks = parseMessageContent(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('code');
      expect(blocks[0].content).toContain('`inline code`');
    });

    it('should handle consecutive code blocks', () => {
      const content = '```a\n1\n```\n```b\n2\n```\n```c\n3\n```';
      const blocks = parseMessageContent(content);

      const codeBlocks = blocks.filter((b) => b.type === 'code');
      expect(codeBlocks).toHaveLength(3);
      expect(codeBlocks[0].language).toBe('a');
      expect(codeBlocks[1].language).toBe('b');
      expect(codeBlocks[2].language).toBe('c');
    });
  });
});
