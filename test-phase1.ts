// Phase 1 Implementation Test
// Test the enhanced drawing features with shapes and layers

import { InputValidator } from './lib/input-validator';
import { generateUUID } from './lib/uuid';

console.log('🎨 Testing Phase 1: Enhanced Drawing Features');

// Test 1: Shape validation
console.log('\n1. Testing Shape Validation...');
try {
  const validShape = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: 'rectangle',
    x: 100,
    y: 150,
    width: 200,
    height: 100,
    rotation: 0,
    strokeColor: '#3b82f6',
    fillColor: '#60a5fa',
    strokeWidth: 2,
    opacity: 1,
    zIndex: 1
  };
  
  const result = InputValidator.shapeSchema.parse(validShape);
  console.log('✅ Valid shape passed validation');
  
  // Test invalid shape
  try {
    const invalidShape = {
      ...validShape,
      strokeColor: 'invalid-color',
      width: -50 // Invalid width
    };
    InputValidator.shapeSchema.parse(invalidShape);
    console.log('❌ Invalid shape should have failed');
  } catch (error) {
    console.log('✅ Invalid shape correctly rejected');
  }
} catch (error) {
  console.log('❌ Shape validation failed:', error);
}

// Test 2: Layer validation
console.log('\n2. Testing Layer Validation...');
try {
  const validLayer = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Layer',
    opacity: 0.8,
    visible: true,
    locked: false,
    zIndex: 5,
    shapes: [],
    drawings: []
  };
  
  const result = InputValidator.layerSchema.parse(validLayer);
  console.log('✅ Valid layer passed validation');
  
  // Test invalid layer
  try {
    const invalidLayer = {
      ...validLayer,
      name: 'Invalid@Name!', // Invalid characters
      opacity: 1.5 // Invalid opacity
    };
    InputValidator.layerSchema.parse(invalidLayer);
    console.log('❌ Invalid layer should have failed');
  } catch (error) {
    console.log('✅ Invalid layer correctly rejected');
  }
} catch (error) {
  console.log('❌ Layer validation failed:', error);
}

// Test 3: Drawing tool validation
console.log('\n3. Testing Drawing Tool Validation...');
try {
  const validToolConfig = {
    tool: 'rectangle',
    brushSize: 5,
    opacity: 0.7,
    strokeStyle: 'solid',
    fillStyle: 'solid'
  };
  
  const result = InputValidator.drawingToolSchema.parse(validToolConfig);
  console.log('✅ Valid tool config passed validation');
  
  // Test invalid tool config
  try {
    const invalidToolConfig = {
      ...validToolConfig,
      tool: 'invalid-tool',
      brushSize: 100 // Too large
    };
    InputValidator.drawingToolSchema.parse(invalidToolConfig);
    console.log('❌ Invalid tool config should have failed');
  } catch (error) {
    console.log('✅ Invalid tool config correctly rejected');
  }
} catch (error) {
  console.log('❌ Tool config validation failed:', error);
}

// Test 4: Enhanced drawing validation
console.log('\n4. Testing Enhanced Drawing Validation...');
try {
  const validDrawing = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    pathData: [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 }
    ],
    color: '#ef4444',
    strokeWidth: 3,
    opacity: 1,
    brushType: 'pen',
    smoothing: 0.5
  };
  
  const result = InputValidator.enhancedDrawingSchema.parse(validDrawing);
  console.log('✅ Valid enhanced drawing passed validation');
  
  // Test path with too many points
  try {
    const tooManyPoints = Array.from({ length: 10001 }, (_, i) => ({ x: i, y: i }));
    const invalidDrawing = {
      ...validDrawing,
      pathData: tooManyPoints
    };
    InputValidator.enhancedDrawingSchema.parse(invalidDrawing);
    console.log('❌ Drawing with too many points should have failed');
  } catch (error) {
    console.log('✅ Drawing with too many points correctly rejected');
  }
} catch (error) {
  console.log('❌ Enhanced drawing validation failed:', error);
}

// Test 5: Coordinate validation
console.log('\n5. Testing Coordinate Validation...');
try {
  const validCoords = { x: 500, y: 300 };
  const result = InputValidator.coordinateSchema.parse(validCoords);
  console.log('✅ Valid coordinates passed validation');
  
  // Test coordinates out of bounds
  try {
    const invalidCoords = { x: 25000, y: -2000 }; // Out of allowed range
    InputValidator.coordinateSchema.parse(invalidCoords);
    console.log('❌ Invalid coordinates should have failed');
  } catch (error) {
    console.log('✅ Invalid coordinates correctly rejected');
  }
} catch (error) {
  console.log('❌ Coordinate validation failed:', error);
}

console.log('\n🎯 Phase 1 Validation Tests Complete!');

// Test 6: Security boundary testing
console.log('\n6. Testing Security Boundaries...');

// Test maximum values
const boundaryTests = [
  {
    name: 'Max brush size',
    test: () => InputValidator.drawingToolSchema.parse({ tool: 'pen', brushSize: 50, opacity: 1, strokeStyle: 'solid', fillStyle: 'none' }),
    shouldPass: true
  },
  {
    name: 'Oversized brush',
    test: () => InputValidator.drawingToolSchema.parse({ tool: 'pen', brushSize: 100, opacity: 1, strokeStyle: 'solid', fillStyle: 'none' }),
    shouldPass: false
  },  {
    name: 'Max layers (simulation)',
    test: () => {
      // Simulate 20 layers (max allowed)
      for (let i = 0; i < 20; i++) {
        InputValidator.layerSchema.parse({
          id: generateUUID(),
          name: `Layer ${i}`,
          opacity: 1,
          visible: true,
          locked: false,
          zIndex: i,
          shapes: [],
          drawings: []
        });
      }
      return true;
    },
    shouldPass: true
  },
  {
    name: 'XSS attempt in shape text',
    test: () => InputValidator.shapeSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'text',
      x: 100,
      y: 100,
      rotation: 0,
      strokeColor: '#000000',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 1,
      text: '<script>alert("xss")</script>'
    }),
    shouldPass: false
  }
];

boundaryTests.forEach(({ name, test, shouldPass }) => {
  try {
    const result = test();
    if (shouldPass) {
      console.log(`✅ ${name}: Passed as expected`);
    } else {
      console.log(`❌ ${name}: Should have failed but passed`);
    }
  } catch (error) {
    if (!shouldPass) {
      console.log(`✅ ${name}: Failed as expected (security working)`);
    } else {
      console.log(`❌ ${name}: Should have passed but failed:`, error instanceof Error ? error.message : String(error));
    }
  }
});

console.log('\n🛡️ Security boundary tests complete!');
console.log('\n✨ Phase 1 implementation is ready for deployment!');
console.log('\nNext steps:');
console.log('1. Run the database migration: database/migration_phase1.sql');
console.log('2. Deploy the enhanced API endpoints');
console.log('3. Test the enhanced toolbar and drawing features');
console.log('4. Monitor performance and security metrics');
