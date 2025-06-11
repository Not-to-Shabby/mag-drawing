// Test Supabase connection
// Run this file to test your Supabase setup

import { supabase } from './lib/supabase';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('plans')
      .select('count', { count: 'exact' });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log(`📊 Found ${data.length} plans in database`);
    
    // Test creating a plan
    console.log('Testing plan creation...');
    
    const testToken = 'test-' + Date.now();
    const { data: newPlan, error: createError } = await supabase
      .from('plans')
      .insert([{
        token: testToken,
        title: 'Test Plan',
        description: 'Test description'
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Plan creation failed:', createError.message);
      return;
    }
    
    console.log('✅ Plan creation successful!');
    console.log('📝 Created plan:', newPlan);
    
    // Clean up test plan
    await supabase
      .from('plans')
      .delete()
      .eq('id', newPlan.id);
    
    console.log('🧹 Test plan cleaned up');
    console.log('🎉 All tests passed! Your Supabase setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  testConnection();
}

export { testConnection };
