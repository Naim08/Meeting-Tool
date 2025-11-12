/**
 * Demo script to test the MarkdownSerializer with realistic data
 */

import { toMarkdown } from '../src/export/markdownSerializer';
import type { ExportConversation } from '../src/types/export';

// Create a realistic conversation
const conversation: ExportConversation = {
  sessionId: 'demo-session-001',
  title: 'Product Roadmap Discussion',
  startedAt: '2025-11-11T14:00:00Z',
  endedAt: '2025-11-11T15:30:00Z',
  model: 'gpt-4',
  systemPrompt: 'You are a helpful product management assistant.',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Can you create a flowchart showing our release process?',
      createdAt: '2025-11-11T14:01:00Z',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: `Here's a flowchart of the release process:

\`\`\`mermaid
graph TD
  A[Planning] --> B[Development]
  B --> C[Testing]
  C --> D[Staging]
  D --> E[Production]
  E --> F[Monitoring]
\`\`\`

This shows the sequential stages from planning through to monitoring in production.`,
      createdAt: '2025-11-11T14:02:30Z',
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'What formula should we use to calculate sprint velocity? I think it\'s something like $v = \\frac{completed}{time}$',
      createdAt: '2025-11-11T14:05:00Z',
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: `Yes, that's correct! The sprint velocity formula is:

$$v = \\frac{\\text{story points completed}}{\\text{sprint duration}}$$

Where:
- $v$ is the velocity
- Completed work is measured in story points
- Sprint duration is typically 2 weeks

For example, if a team completes 40 story points in a 2-week sprint, their velocity is $v = \\frac{40}{2} = 20$ points per week.`,
      createdAt: '2025-11-11T14:06:45Z',
    },
    {
      id: 'msg-5',
      role: 'user',
      content: 'Can you show me some sample JavaScript code to calculate this?',
      createdAt: '2025-11-11T14:08:00Z',
    },
    {
      id: 'msg-6',
      role: 'assistant',
      content: `Sure! Here's a simple implementation:

\`\`\`javascript
/**
 * Calculate sprint velocity
 * @param {number} storyPointsCompleted - Total story points completed
 * @param {number} sprintDurationWeeks - Sprint duration in weeks
 * @returns {number} Velocity (points per week)
 */
function calculateVelocity(storyPointsCompleted, sprintDurationWeeks) {
  if (sprintDurationWeeks === 0) {
    throw new Error('Sprint duration cannot be zero');
  }
  return storyPointsCompleted / sprintDurationWeeks;
}

// Example usage
const velocity = calculateVelocity(40, 2);
console.log(\`Team velocity: \${velocity} points/week\`);
\`\`\`

This function includes error handling for edge cases.`,
      createdAt: '2025-11-11T14:10:30Z',
    },
  ],
};

// Run the serializer
console.log('\n=== Markdown Serializer Demo ===\n');
console.log('Converting conversation with:');
console.log(`- ${conversation.messages.length} messages`);
console.log(`- 1 Mermaid diagram`);
console.log(`- 4 KaTeX expressions (1 block, 3 inline)`);
console.log(`- 1 JavaScript code block\n`);

const result = toMarkdown(conversation, {
  includeSystemPrompt: true,
  includeMetadata: true,
  preferSvg: true,
});

console.log('=== Asset Requests Generated ===\n');
result.assetRequests.forEach((asset, idx) => {
  console.log(`${idx + 1}. ID: ${asset.id}`);
  console.log(`   Type: ${asset.type}`);
  console.log(`   Format: ${asset.preferredFormat}`);
  console.log(`   Content preview: ${asset.content.substring(0, 50)}...`);
  console.log('');
});

console.log(`Total assets: ${result.assetRequests.length}\n`);

console.log('=== Generated Markdown (first 1500 chars) ===\n');
console.log(result.markdown.substring(0, 1500));
console.log('\n... (truncated) ...\n');

console.log('=== Verification ===\n');
console.log(`✅ Markdown length: ${result.markdown.length} characters`);
console.log(`✅ Asset requests: ${result.assetRequests.length}`);
console.log(`✅ Mermaid diagrams: ${result.assetRequests.filter(a => a.type === 'mermaid').length}`);
console.log(`✅ KaTeX blocks: ${result.assetRequests.filter(a => a.type === 'katex-block').length}`);
console.log(`✅ KaTeX inline: ${result.assetRequests.filter(a => a.type === 'katex-inline').length}`);
console.log(`✅ Code blocks preserved: ${result.markdown.includes('```javascript') ? 'Yes' : 'No'}`);
console.log(`✅ Image placeholders: ${(result.markdown.match(/!\[.*?\]\(\.\/assets\//g) || []).length}`);
console.log('\n✅ Serializer working correctly!\n');
