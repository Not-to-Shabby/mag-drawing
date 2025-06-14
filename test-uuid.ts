// Quick test to verify UUID generation works in different environments
import { generateUUID } from './lib/uuid';

console.log('🔍 Testing UUID Generation...');

// Test multiple UUID generations
for (let i = 0; i < 5; i++) {
  const uuid = generateUUID();
  console.log(`UUID ${i + 1}:`, uuid);
  
  // Verify UUID format (basic regex check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(uuid);
  console.log(`  Valid format: ${isValid ? '✅' : '❌'}`);
}

console.log('✨ UUID generation test complete!');
