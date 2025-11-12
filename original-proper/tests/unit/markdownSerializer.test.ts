/**
 * Unit Tests for MarkdownSerializer
 *
 * Tests verify:
 * - Code block preservation with language fences
 * - Mermaid/KaTeX placeholder generation
 * - Deterministic asset IDs
 * - Proper headings and timestamps
 * - Function purity (same input → same output)
 */

import { toMarkdown } from '../../src/export/markdownSerializer';
import type { ExportConversation, ExportMessage } from '../../src/types/export';

// ============================================================================
// Test Helpers
// ============================================================================

function createMessage(role: 'user' | 'assistant' | 'system', content: string, id = 'test-id'): ExportMessage {
  return {
    id,
    role,
    content,
    createdAt: '2025-11-11T14:30:00Z',
  };
}

function createConversation(messages: ExportMessage[]): ExportConversation {
  return {
    sessionId: 'test-session',
    title: 'Test Conversation',
    startedAt: '2025-11-11T14:00:00Z',
    endedAt: '2025-11-11T15:00:00Z',
    messages,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(`   ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  }

  function assertIncludes(text: string, substring: string, message?: string) {
    if (!text.includes(substring)) {
      throw new Error(
        message || `Expected text to include "${substring}"`
      );
    }
  }

  function assertNotIncludes(text: string, substring: string, message?: string) {
    if (text.includes(substring)) {
      throw new Error(
        message || `Expected text not to include "${substring}"`
      );
    }
  }

  console.log('\n=== MarkdownSerializer Unit Tests ===\n');

  // Test 1: Basic Message Serialization
  test('Basic message with plaintext', () => {
    const messages = [createMessage('user', 'Hello world!')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    assertIncludes(result.markdown, '# Conversation Export');
    assertIncludes(result.markdown, '## Message 1 - User');
    assertIncludes(result.markdown, 'Hello world!');
    assertIncludes(result.markdown, '2025-11-11 14:30:00');
    assertEqual(result.assetRequests.length, 0);
  });

  // Test 2: Code Block with Language Fence
  test('Code block with language fence preserved', () => {
    const code = 'function hello() {\n  return "world";\n}';
    const messages = [createMessage('assistant', '```javascript\n' + code + '\n```')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    assertIncludes(result.markdown, '```javascript');
    assertIncludes(result.markdown, code);
    assertIncludes(result.markdown, '```');
    assertEqual(result.assetRequests.length, 0, 'Code blocks should not generate asset requests');
  });

  // Test 3: Mermaid Block Detection
  test('Mermaid block generates asset request and placeholder', () => {
    const mermaidCode = 'graph TD\n  A-->B\n  B-->C';
    const messages = [createMessage('assistant', '```mermaid\n' + mermaidCode + '\n```')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    // Check placeholder
    assertIncludes(result.markdown, '![Mermaid Diagram](./assets/msg-0-mermaid-0.svg)');

    // Check asset request
    assertEqual(result.assetRequests.length, 1);
    assertEqual(result.assetRequests[0].id, 'msg-0-mermaid-0');
    assertEqual(result.assetRequests[0].type, 'mermaid');
    assertEqual(result.assetRequests[0].content, mermaidCode);
    assertEqual(result.assetRequests[0].messageIndex, 0);
    assertEqual(result.assetRequests[0].blockIndex, 0);
    assertEqual(result.assetRequests[0].preferredFormat, 'svg');
  });

  // Test 4: KaTeX Inline Detection
  test('KaTeX inline generates asset request and placeholder', () => {
    const messages = [createMessage('user', 'The formula is $E = mc^2$ for energy.')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    // Check placeholder
    assertIncludes(result.markdown, '![LaTeX](./assets/msg-0-katex-inline-0.svg)');

    // Check asset request
    assertEqual(result.assetRequests.length, 1);
    assertEqual(result.assetRequests[0].id, 'msg-0-katex-inline-0');
    assertEqual(result.assetRequests[0].type, 'katex-inline');
    assertEqual(result.assetRequests[0].content, 'E = mc^2');
  });

  // Test 5: KaTeX Block Detection
  test('KaTeX block generates asset request and placeholder', () => {
    const katexFormula = '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';
    const messages = [createMessage('assistant', 'The integral:\n\n$$' + katexFormula + '$$\n\nIs the Gaussian.')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    // Check placeholder
    assertIncludes(result.markdown, '![LaTeX Block](./assets/msg-0-katex-block-0.svg)');

    // Check asset request
    assertEqual(result.assetRequests.length, 1);
    assertEqual(result.assetRequests[0].id, 'msg-0-katex-block-0');
    assertEqual(result.assetRequests[0].type, 'katex-block');
    assertEqual(result.assetRequests[0].content, katexFormula);
  });

  // Test 6: Multiple Assets in One Message
  test('Multiple assets in one message have unique IDs', () => {
    const content = `
Here's a diagram:

\`\`\`mermaid
graph LR
  A-->B
\`\`\`

And the formula $x = y$ and another $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$

And another diagram:

\`\`\`mermaid
graph TD
  C-->D
\`\`\`
    `;
    const messages = [createMessage('assistant', content)];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    // Should have 2 mermaid + 1 inline + 1 block = 4 assets
    assertEqual(result.assetRequests.length, 4);

    // Check IDs are unique and correct
    assertEqual(result.assetRequests[0].id, 'msg-0-mermaid-0');
    assertEqual(result.assetRequests[1].id, 'msg-0-katex-inline-0');
    assertEqual(result.assetRequests[2].id, 'msg-0-katex-block-0');
    assertEqual(result.assetRequests[3].id, 'msg-0-mermaid-1');

    // Check all placeholders are in markdown
    assertIncludes(result.markdown, './assets/msg-0-mermaid-0.svg');
    assertIncludes(result.markdown, './assets/msg-0-mermaid-1.svg');
    assertIncludes(result.markdown, './assets/msg-0-katex-inline-0.svg');
    assertIncludes(result.markdown, './assets/msg-0-katex-block-0.svg');
  });

  // Test 7: Conversation Metadata
  test('Conversation metadata is included', () => {
    const messages = [
      createMessage('user', 'Hello'),
      createMessage('assistant', 'Hi there!'),
      createMessage('user', 'How are you?'),
    ];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    assertIncludes(result.markdown, '**Title:** Test Conversation');
    assertIncludes(result.markdown, '**Started:** 2025-11-11 14:00:00');
    assertIncludes(result.markdown, '**Ended:** 2025-11-11 15:00:00');
    assertIncludes(result.markdown, '**Messages:** 3');
  });

  // Test 8: System Prompt Inclusion
  test('System prompt is included when present', () => {
    const messages = [createMessage('user', 'Hello')];
    const conversation: ExportConversation = {
      ...createConversation(messages),
      systemPrompt: 'You are a helpful assistant.',
    };
    const result = toMarkdown(conversation, { includeSystemPrompt: true });

    assertIncludes(result.markdown, 'You are a helpful assistant');
    assertIncludes(result.markdown, '**System Prompt:**');
  });

  // Test 9: System Prompt Exclusion
  test('System prompt is excluded when option is false', () => {
    const messages = [createMessage('user', 'Hello')];
    const conversation: ExportConversation = {
      ...createConversation(messages),
      systemPrompt: 'You are a helpful assistant.',
    };
    const result = toMarkdown(conversation, { includeSystemPrompt: false });

    assertNotIncludes(result.markdown, 'You are a helpful assistant');
  });

  // Test 10: Deterministic IDs Across Messages
  test('Asset IDs are deterministic across multiple messages', () => {
    const messages = [
      createMessage('user', 'Show me $x = 1$'),
      createMessage('assistant', 'Here: ```mermaid\ngraph TD\nA-->B\n```'),
      createMessage('user', 'And $y = 2$'),
    ];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    assertEqual(result.assetRequests.length, 3);
    assertEqual(result.assetRequests[0].id, 'msg-0-katex-inline-0');
    assertEqual(result.assetRequests[1].id, 'msg-1-mermaid-0');
    assertEqual(result.assetRequests[2].id, 'msg-2-katex-inline-0');
  });

  // Test 11: Function Purity - Same Input Produces Same Output
  test('Function is pure - same input produces same output', () => {
    const messages = [
      createMessage('user', 'Test $x = y$'),
      createMessage('assistant', '```mermaid\ngraph LR\nA-->B\n```'),
    ];
    const conversation = createConversation(messages);

    const result1 = toMarkdown(conversation);
    const result2 = toMarkdown(conversation);

    assertEqual(result1.markdown, result2.markdown, 'Markdown should be identical');
    assertEqual(result1.assetRequests.length, result2.assetRequests.length);
    assertEqual(result1.assetRequests[0].id, result2.assetRequests[0].id);
    assertEqual(result1.assetRequests[1].id, result2.assetRequests[1].id);
  });

  // Test 12: Dollar Sign in Code Block Should Not Be Treated as KaTeX
  test('Dollar signs in code blocks are not treated as KaTeX', () => {
    const code = 'const price = $100;\nconst total = price * 2;';
    const messages = [createMessage('assistant', '```javascript\n' + code + '\n```')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    assertEqual(result.assetRequests.length, 0, 'No assets should be generated');
    assertIncludes(result.markdown, code);
  });

  // Test 13: Empty Content
  test('Empty message content is handled gracefully', () => {
    const messages = [createMessage('user', '')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    assertIncludes(result.markdown, '## Message 1 - User');
    assertEqual(result.assetRequests.length, 0);
  });

  // Test 14: Special Characters Escaping
  test('Special markdown characters are escaped', () => {
    const conversation: ExportConversation = {
      sessionId: 'test',
      title: 'Test [Title] with (Parens)',
      startedAt: '2025-11-11T14:00:00Z',
      endedAt: null,
      messages: [],
    };
    const result = toMarkdown(conversation);

    assertIncludes(result.markdown, 'Test \\[Title\\] with \\(Parens\\)');
  });

  // Test 15: PNG Format Preference
  test('PNG format is used when preferSvg is false', () => {
    const messages = [createMessage('assistant', '```mermaid\ngraph TD\nA-->B\n```')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation, { preferSvg: false });

    assertIncludes(result.markdown, './assets/msg-0-mermaid-0.png');
    assertEqual(result.assetRequests[0].preferredFormat, 'png');
  });

  // Test 16: Metadata Exclusion
  test('Metadata can be excluded', () => {
    const messages = [createMessage('user', 'Hello')];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation, { includeMetadata: false });

    assertNotIncludes(result.markdown, '**Title:**');
    assertNotIncludes(result.markdown, '**Started:**');
    assertNotIncludes(result.markdown, 'Export Metadata');
  });

  // Test 17: Mixed Content with Code and KaTeX
  test('Mixed content with both code and KaTeX', () => {
    const content = `
Here's some Python code:

\`\`\`python
def calculate(x):
    return x * 2
\`\`\`

And the formula: $f(x) = x^2$
    `;
    const messages = [createMessage('assistant', content)];
    const conversation = createConversation(messages);
    const result = toMarkdown(conversation);

    // Should preserve code block
    assertIncludes(result.markdown, '```python');
    assertIncludes(result.markdown, 'def calculate(x)');

    // Should generate asset for KaTeX
    assertEqual(result.assetRequests.length, 1);
    assertEqual(result.assetRequests[0].type, 'katex-inline');
  });

  // Print summary
  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
