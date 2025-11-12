/**
 * Import Test - Verify all modules can be imported correctly
 */

console.log('🔍 Testing imports...\n');

try {
  // Test serializer import
  console.log('1. Testing serializer import...');
  const { toMarkdown } = require('../src/export/markdownSerializer');
  console.log('   ✅ Serializer imported successfully');

  // Verify toMarkdown function exists
  console.log('2. Verifying toMarkdown function...');
  if (typeof toMarkdown !== 'function') {
    throw new Error('toMarkdown is not a function');
  }
  console.log('   ✅ toMarkdown function exists');

  // Test basic functionality
  console.log('3. Testing basic serialization...');
  const testConversation = {
    sessionId: 'test',
    title: 'Test',
    startedAt: '2025-11-11T00:00:00Z',
    endedAt: null,
    messages: [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        createdAt: '2025-11-11T00:00:00Z',
      },
    ],
  };

  const result = toMarkdown(testConversation);

  if (!result.markdown) {
    throw new Error('Markdown output is empty');
  }

  if (!Array.isArray(result.assetRequests)) {
    throw new Error('assetRequests is not an array');
  }

  console.log('   ✅ Serialization works');
  console.log(`   ✅ Output: ${result.markdown.length} chars, ${result.assetRequests.length} assets`);

  console.log('\n✅ ALL IMPORT TESTS PASSED\n');
} catch (error) {
  console.error('\n❌ IMPORT TEST FAILED:', error);
  process.exit(1);
}
