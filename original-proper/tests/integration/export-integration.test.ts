/**
 * Integration Test for Export Functionality
 *
 * This test verifies the complete export flow:
 * 1. Creates a test conversation in the database
 * 2. Retrieves it using ChatHistoryService
 * 3. Converts to ExportConversation format
 * 4. Runs the MarkdownSerializer
 * 5. Writes output to disk
 * 6. Verifies the markdown file content
 * 7. Cleans up test data
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { toMarkdown } from '../../src/export/markdownSerializer';
import {
  createChatSession,
  appendChatMessage,
  getChatSession,
  deleteChatSession,
} from '../../src/main/services/ChatHistoryService';
import { initializeDatabase } from '../../src/main/services/Database';
import type { ExportConversation } from '../../src/types/export';
import type { ChatSessionWithMessages } from '../../src/types/chat-history';

// ============================================================================
// Test Setup
// ============================================================================

async function setupTestEnvironment() {
  console.log('📦 Setting up test environment...');

  // Initialize database
  const dbPath = path.join(os.tmpdir(), `test-export-${Date.now()}.db`);
  initializeDatabase(dbPath);
  console.log(`✅ Database initialized at: ${dbPath}`);

  return { dbPath };
}

async function createTestConversation(): Promise<string> {
  console.log('\n📝 Creating test conversation...');

  // Create session
  const session = createChatSession({
    title: 'Integration Test - Export Feature',
    model: 'gpt-4-test',
  });

  console.log(`✅ Created session: ${session.id}`);

  // Add messages with different content types
  appendChatMessage({
    sessionId: session.id,
    role: 'user',
    content: 'Can you show me a simple flowchart?',
  });

  appendChatMessage({
    sessionId: session.id,
    role: 'assistant',
    content: `Here's a basic flowchart:

\`\`\`mermaid
graph LR
  Start --> Process
  Process --> Decision{Check?}
  Decision -->|Yes| End
  Decision -->|No| Process
\`\`\`

This shows a basic process with a decision loop.`,
  });

  appendChatMessage({
    sessionId: session.id,
    role: 'user',
    content: 'What is the quadratic formula? I think it\'s $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$',
  });

  appendChatMessage({
    sessionId: session.id,
    role: 'assistant',
    content: `Exactly! The quadratic formula is:

$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

Where $a$, $b$, and $c$ are the coefficients from $ax^2 + bx + c = 0$.

Here's a Python implementation:

\`\`\`python
import math

def solve_quadratic(a, b, c):
    """Solve quadratic equation ax^2 + bx + c = 0"""
    discriminant = b**2 - 4*a*c

    if discriminant < 0:
        return None  # No real solutions

    sqrt_discriminant = math.sqrt(discriminant)
    x1 = (-b + sqrt_discriminant) / (2 * a)
    x2 = (-b - sqrt_discriminant) / (2 * a)

    return (x1, x2)
\`\`\`

This handles the case where there are no real solutions.`,
  });

  console.log(`✅ Added 4 messages to conversation`);

  return session.id;
}

function convertToExportFormat(data: ChatSessionWithMessages): ExportConversation {
  return {
    sessionId: data.session.id,
    title: data.session.title || 'Untitled Conversation',
    startedAt: new Date(data.session.startedAt).toISOString(),
    endedAt: data.session.endedAt ? new Date(data.session.endedAt).toISOString() : null,
    model: data.session.model || undefined,
    messages: data.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.createdAt).toISOString(),
      tokens: msg.tokens || undefined,
    })),
  };
}

// ============================================================================
// Tests
// ============================================================================

async function runIntegrationTest() {
  console.log('\n=== Export Integration Test ===\n');

  let sessionId: string | null = null;
  let testDir: string | null = null;

  try {
    // Step 1: Setup
    const { dbPath } = await setupTestEnvironment();

    // Step 2: Create test conversation
    sessionId = await createTestConversation();

    // Step 3: Retrieve conversation from database
    console.log('\n🔍 Retrieving conversation from database...');
    const chatData = getChatSession(sessionId);

    if (!chatData) {
      throw new Error('Failed to retrieve conversation from database');
    }

    console.log(`✅ Retrieved session with ${chatData.messages.length} messages`);

    // Step 4: Convert to ExportConversation format
    console.log('\n🔄 Converting to export format...');
    const exportConversation = convertToExportFormat(chatData);
    console.log(`✅ Converted to ExportConversation`);

    // Step 5: Run serializer
    console.log('\n⚙️  Running MarkdownSerializer...');
    const result = toMarkdown(exportConversation, {
      includeSystemPrompt: true,
      includeMetadata: true,
      preferSvg: true,
    });

    console.log(`✅ Serialization complete:`);
    console.log(`   - Markdown: ${result.markdown.length} characters`);
    console.log(`   - Assets: ${result.assetRequests.length} requests`);

    // Step 6: Write to disk
    console.log('\n💾 Writing to disk...');
    testDir = path.join(os.tmpdir(), `export-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'assets'), { recursive: true });

    const markdownPath = path.join(testDir, 'conversation.md');
    await fs.writeFile(markdownPath, result.markdown, 'utf-8');
    console.log(`✅ Wrote markdown to: ${markdownPath}`);

    // Write asset placeholder files (simulate rendering)
    for (const asset of result.assetRequests) {
      const assetPath = path.join(testDir, 'assets', asset.id + '.svg');
      await fs.writeFile(assetPath, `<svg><!-- ${asset.type}: ${asset.id} --></svg>`, 'utf-8');
    }
    console.log(`✅ Wrote ${result.assetRequests.length} asset placeholders`);

    // Step 7: Read back and verify
    console.log('\n✅ Reading back and verifying...');
    const writtenContent = await fs.readFile(markdownPath, 'utf-8');

    // Verify content
    const checks = [
      {
        name: 'Contains title',
        check: () => writtenContent.includes('Integration Test - Export Feature'),
      },
      {
        name: 'Contains Mermaid placeholder',
        check: () => writtenContent.includes('![Mermaid Diagram](./assets/msg-1-mermaid-0.svg)'),
      },
      {
        name: 'Contains KaTeX inline placeholder',
        check: () => writtenContent.includes('![LaTeX](./assets/msg-2-katex-inline-0.svg)'),
      },
      {
        name: 'Contains KaTeX block placeholder',
        check: () => writtenContent.includes('![LaTeX Block](./assets/msg-3-katex-block-0.svg)'),
      },
      {
        name: 'Contains Python code block',
        check: () => writtenContent.includes('```python') && writtenContent.includes('def solve_quadratic'),
      },
      {
        name: 'Has 4 message sections',
        check: () => (writtenContent.match(/## Message \d+ -/g) || []).length === 4,
      },
      {
        name: 'Asset files exist',
        check: async () => {
          for (const asset of result.assetRequests) {
            const assetPath = path.join(testDir!, 'assets', asset.id + '.svg');
            try {
              await fs.access(assetPath);
            } catch {
              return false;
            }
          }
          return true;
        },
      },
      {
        name: 'Asset IDs are deterministic',
        check: () => {
          const ids = result.assetRequests.map(a => a.id);
          const expected = ['msg-1-mermaid-0', 'msg-2-katex-inline-0', 'msg-3-katex-block-0'];
          return expected.every(id => ids.includes(id));
        },
      },
    ];

    console.log('\n🔍 Verification Checks:\n');
    let allPassed = true;

    for (const { name, check } of checks) {
      const passed = typeof check === 'function' ? await check() : check;
      console.log(`${passed ? '✅' : '❌'} ${name}`);
      if (!passed) allPassed = false;
    }

    // Step 8: Test reimport (purity check)
    console.log('\n🔄 Testing function purity...');
    const result2 = toMarkdown(exportConversation, {
      includeSystemPrompt: true,
      includeMetadata: true,
      preferSvg: true,
    });

    const isPure = result.markdown.substring(0, 1000) === result2.markdown.substring(0, 1000) &&
                   result.assetRequests.length === result2.assetRequests.length;

    console.log(`${isPure ? '✅' : '❌'} Function purity check (same input → same output)`);
    if (!isPure) allPassed = false;

    // Print summary
    console.log('\n=== Test Summary ===\n');
    console.log(`📊 Stats:`);
    console.log(`   - Conversation: ${chatData.messages.length} messages`);
    console.log(`   - Markdown size: ${result.markdown.length} bytes`);
    console.log(`   - Assets generated: ${result.assetRequests.length}`);
    console.log(`   - Test directory: ${testDir}`);
    console.log(`   - Database: ${dbPath}`);

    console.log(`\n${allPassed ? '✅' : '❌'} Integration test ${allPassed ? 'PASSED' : 'FAILED'}\n`);

    if (!allPassed) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (sessionId) {
      console.log('\n🧹 Cleaning up...');
      try {
        deleteChatSession(sessionId);
        console.log('✅ Deleted test session');
      } catch (err) {
        console.warn('⚠️  Failed to delete test session:', err);
      }
    }

    // Note: Keep test files for manual inspection
    if (testDir) {
      console.log(`\n📁 Test files preserved at: ${testDir}`);
      console.log(`   You can inspect the exported markdown at:`);
      console.log(`   ${path.join(testDir, 'conversation.md')}`);
    }
  }
}

// Run the test
runIntegrationTest();
