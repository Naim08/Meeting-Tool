/**
 * File Output Integration Test for MarkdownSerializer
 *
 * This test verifies:
 * 1. Serializer can process realistic conversation data
 * 2. Output can be written to disk as markdown
 * 3. Asset references are correct
 * 4. Files can be read back and verified
 * 5. Relative paths work correctly
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { toMarkdown } from '../../src/export/markdownSerializer';
import type { ExportConversation } from '../../src/types/export';

// ============================================================================
// Test Data
// ============================================================================

function createRealisticConversation(): ExportConversation {
  return {
    sessionId: 'test-session-001',
    title: 'Product Roadmap Discussion - Q4 2025',
    startedAt: '2025-11-11T14:00:00Z',
    endedAt: '2025-11-11T15:30:00Z',
    model: 'gpt-4',
    systemPrompt: 'You are a helpful product management assistant specializing in roadmap planning and technical documentation.',
    messages: [
      {
        id: 'msg-001',
        role: 'user',
        content: 'Can you create a flowchart showing our release process from development to production?',
        createdAt: '2025-11-11T14:01:00Z',
        tokens: 15,
      },
      {
        id: 'msg-002',
        role: 'assistant',
        content: `I'll create a comprehensive release process flowchart for you:

\`\`\`mermaid
graph TD
    A[Planning] --> B[Development]
    B --> C[Code Review]
    C --> D{Tests Pass?}
    D -->|Yes| E[Staging Deploy]
    D -->|No| B
    E --> F[QA Testing]
    F --> G{QA Approved?}
    G -->|Yes| H[Production Deploy]
    G -->|No| B
    H --> I[Monitoring]
    I --> J[Done]
\`\`\`

This flowchart shows the complete cycle from planning through monitoring in production. Notice the feedback loops when tests fail or QA doesn't approve.`,
        createdAt: '2025-11-11T14:02:30Z',
        tokens: 142,
      },
      {
        id: 'msg-003',
        role: 'user',
        content: 'What formula should we use to calculate sprint velocity? I remember it\'s something like $v = \\frac{\\text{completed}}{\\text{time}}$',
        createdAt: '2025-11-11T14:05:00Z',
        tokens: 25,
      },
      {
        id: 'msg-004',
        role: 'assistant',
        content: `Exactly! The sprint velocity formula is:

$$v = \\frac{\\sum \\text{story points completed}}{\\text{sprint duration (weeks)}}$$

Where:
- $v$ is the velocity (points per week)
- Story points are the sum of all completed work items
- Sprint duration is typically 2 weeks

For example, if your team completes 40 story points in a 2-week sprint:

$$v = \\frac{40}{2} = 20 \\text{ points/week}$$

This metric helps with:
1. Capacity planning ($\\text{capacity} = v \\times \\text{sprint count}$)
2. Release forecasting
3. Team performance tracking

Let me show you a practical implementation:

\`\`\`javascript
/**
 * Calculate team sprint velocity
 * @param {number[]} completedStoryPoints - Array of completed story points per sprint
 * @param {number} sprintDurationWeeks - Duration of each sprint in weeks
 * @returns {Object} Velocity statistics
 */
function calculateVelocity(completedStoryPoints, sprintDurationWeeks = 2) {
  const totalPoints = completedStoryPoints.reduce((sum, points) => sum + points, 0);
  const totalSprints = completedStoryPoints.length;
  const averagePerSprint = totalPoints / totalSprints;
  const velocity = averagePerSprint / sprintDurationWeeks;

  return {
    velocity: velocity.toFixed(2),
    averagePerSprint: averagePerSprint.toFixed(2),
    totalSprints,
    totalPoints,
  };
}

// Example usage:
const sprintData = [38, 42, 35, 41, 39, 40];
const stats = calculateVelocity(sprintData);
console.log(\`Team velocity: \${stats.velocity} points/week\`);
// Output: Team velocity: 19.58 points/week
\`\`\`

This function calculates the average velocity across multiple sprints, giving you a more stable metric for planning.`,
        createdAt: '2025-11-11T14:08:45Z',
        tokens: 298,
      },
      {
        id: 'msg-005',
        role: 'user',
        content: 'Can you also show the capacity planning formula? And maybe add another diagram for the sprint cycle?',
        createdAt: '2025-11-11T14:12:00Z',
        tokens: 22,
      },
      {
        id: 'msg-006',
        role: 'assistant',
        content: `Sure! Here's the capacity planning formula:

$$C = v \\times n \\times (1 - r)$$

Where:
- $C$ = Total capacity (story points)
- $v$ = Velocity (points per sprint)
- $n$ = Number of sprints
- $r$ = Risk buffer (typically 0.2 or 20%)

And here's the sprint cycle diagram:

\`\`\`mermaid
graph LR
    A[Sprint Planning] --> B[Daily Standups]
    B --> C[Development Work]
    C --> D[Sprint Review]
    D --> E[Sprint Retrospective]
    E --> F[Sprint Close]
    F --> A
    style A fill:#e1f5fe
    style D fill:#fff3e0
    style E fill:#f3e5f5
\`\`\`

This shows the continuous cycle of agile sprints. Each sprint follows this pattern, with the retrospective feeding improvements into the next planning session.

For risk buffering, if your velocity is $v = 20$ points/week and you have 6 two-week sprints planned:

$$C = 40 \\times 6 \\times (1 - 0.2) = 240 \\times 0.8 = 192 \\text{ points}$$

So you should plan for 192 story points across the 6 sprints, leaving a 20% buffer for unexpected issues.`,
        createdAt: '2025-11-11T14:15:20Z',
        tokens: 186,
      },
    ],
  };
}

// ============================================================================
// Test Execution
// ============================================================================

async function runFileOutputTest() {
  console.log('\n=== Serializer File Output Integration Test ===\n');

  let testDir: string | null = null;

  try {
    // Step 1: Create test conversation
    console.log('📝 Creating realistic test conversation...');
    const conversation = createRealisticConversation();
    console.log(`✅ Created conversation with ${conversation.messages.length} messages`);

    // Step 2: Run serializer
    console.log('\n⚙️  Running MarkdownSerializer...');
    const result = toMarkdown(conversation, {
      includeSystemPrompt: true,
      includeMetadata: true,
      preferSvg: true,
      maxImageWidth: 1200,
    });

    console.log(`✅ Serialization complete:`);
    console.log(`   - Markdown: ${result.markdown.length} characters`);
    console.log(`   - Assets: ${result.assetRequests.length} requests`);

    // Print asset details
    console.log('\n📦 Asset Requests:');
    result.assetRequests.forEach((asset, idx) => {
      console.log(`   ${idx + 1}. ${asset.id} (${asset.type})`);
    });

    // Step 3: Create export directory
    console.log('\n📁 Creating export directory...');
    testDir = path.join(os.tmpdir(), `export-test-${Date.now()}`);
    const assetsDir = path.join(testDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
    console.log(`✅ Created: ${testDir}`);

    // Step 4: Write markdown file
    console.log('\n💾 Writing markdown file...');
    const markdownPath = path.join(testDir, 'conversation.md');
    await fs.writeFile(markdownPath, result.markdown, 'utf-8');
    console.log(`✅ Wrote: ${markdownPath}`);

    // Step 5: Create placeholder asset files
    console.log('\n🎨 Creating placeholder assets...');
    for (const asset of result.assetRequests) {
      const assetFilename = `${asset.id}.${asset.preferredFormat}`;
      const assetPath = path.join(assetsDir, assetFilename);

      // Create realistic-looking SVG placeholder
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <rect width="400" height="200" fill="#f0f0f0"/>
  <text x="200" y="100" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
    ${asset.type.toUpperCase()} - ${asset.id}
  </text>
  <text x="200" y="130" text-anchor="middle" font-family="monospace" font-size="12" fill="#666">
    ${asset.content.substring(0, 40)}...
  </text>
</svg>`;

      await fs.writeFile(assetPath, svgContent, 'utf-8');
    }
    console.log(`✅ Created ${result.assetRequests.length} asset files`);

    // Step 6: Verify files exist and are readable
    console.log('\n✅ Verifying files...');

    // Read back the markdown
    const writtenMarkdown = await fs.readFile(markdownPath, 'utf-8');

    // Verify all asset files exist
    for (const asset of result.assetRequests) {
      const assetFilename = `${asset.id}.${asset.preferredFormat}`;
      const assetPath = path.join(assetsDir, assetFilename);
      await fs.access(assetPath); // Throws if file doesn't exist
    }

    console.log('✅ All files verified');

    // Step 7: Content verification checks
    console.log('\n🔍 Content Verification:\n');

    const checks = [
      {
        name: 'Markdown file is readable',
        test: () => writtenMarkdown.length === result.markdown.length,
      },
      {
        name: 'Contains conversation title',
        test: () => writtenMarkdown.includes('Product Roadmap Discussion - Q4 2025'),
      },
      {
        name: 'Contains system prompt',
        test: () => writtenMarkdown.includes('product management assistant'),
      },
      {
        name: 'Contains all 6 messages',
        test: () => (writtenMarkdown.match(/## Message \d+ -/g) || []).length === 6,
      },
      {
        name: 'Mermaid diagram 1 (release process)',
        test: () => writtenMarkdown.includes('![Mermaid Diagram](./assets/msg-1-mermaid-0.svg)'),
      },
      {
        name: 'Mermaid diagram 2 (sprint cycle)',
        test: () => writtenMarkdown.includes('![Mermaid Diagram](./assets/msg-5-mermaid-0.svg)'),
      },
      {
        name: 'KaTeX inline (velocity variable)',
        test: () => writtenMarkdown.includes('![LaTeX](./assets/msg-2-katex-inline-0.svg)') ||
                     writtenMarkdown.includes('![LaTeX](./assets/msg-3-katex-inline-'),
      },
      {
        name: 'KaTeX block (velocity formula)',
        test: () => writtenMarkdown.includes('![LaTeX Block](./assets/msg-3-katex-block-0.svg)'),
      },
      {
        name: 'JavaScript code block preserved',
        test: () => writtenMarkdown.includes('```javascript') &&
                     writtenMarkdown.includes('function calculateVelocity'),
      },
      {
        name: 'Asset references use relative paths',
        test: () => {
          const assetRefs = writtenMarkdown.match(/!\[.*?\]\((.*?)\)/g) || [];
          return assetRefs.every(ref => ref.includes('./assets/'));
        },
      },
      {
        name: 'Metadata section included',
        test: () => writtenMarkdown.includes('Export Metadata') &&
                     writtenMarkdown.includes(`**Assets:** ${result.assetRequests.length} items`),
      },
      {
        name: 'Message timestamps formatted correctly',
        test: () => writtenMarkdown.includes('2025-11-11 14:'),
      },
    ];

    let passedChecks = 0;
    let failedChecks = 0;

    for (const { name, test } of checks) {
      const passed = test();
      console.log(`${passed ? '✅' : '❌'} ${name}`);
      if (passed) {
        passedChecks++;
      } else {
        failedChecks++;
      }
    }

    // Step 8: File structure verification
    console.log('\n📂 File Structure:\n');
    const files = await fs.readdir(testDir);
    const assetFiles = await fs.readdir(assetsDir);

    console.log(`   ${testDir}/`);
    console.log(`   ├── conversation.md (${writtenMarkdown.length} bytes)`);
    console.log(`   └── assets/`);
    assetFiles.forEach(file => {
      console.log(`       └── ${file}`);
    });

    // Step 9: Statistics
    console.log('\n📊 Export Statistics:\n');
    console.log(`   Messages: ${conversation.messages.length}`);
    console.log(`   Total tokens: ${conversation.messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0)}`);
    console.log(`   Markdown size: ${result.markdown.length} bytes (${(result.markdown.length / 1024).toFixed(2)} KB)`);
    console.log(`   Asset requests: ${result.assetRequests.length}`);
    console.log(`   - Mermaid: ${result.assetRequests.filter(a => a.type === 'mermaid').length}`);
    console.log(`   - KaTeX block: ${result.assetRequests.filter(a => a.type === 'katex-block').length}`);
    console.log(`   - KaTeX inline: ${result.assetRequests.filter(a => a.type === 'katex-inline').length}`);
    console.log(`   Files created: ${1 + assetFiles.length}`);

    // Final summary
    console.log('\n=== Test Summary ===\n');
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    console.log(`📁 Test files: ${testDir}\n`);

    if (failedChecks > 0) {
      console.log('❌ TEST FAILED\n');
      process.exit(1);
    }

    console.log('✅ ALL TESTS PASSED\n');
    console.log('💡 You can inspect the exported files at:');
    console.log(`   ${markdownPath}\n`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

// Run the test
runFileOutputTest();
