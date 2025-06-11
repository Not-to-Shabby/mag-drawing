// Simple test for debugging any runtime errors
console.log('Testing environment variables...');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...');

import { supabase } from './lib/supabase.js';

// Test basic connection
supabase.from('plans').select('*').limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('Database connection error:', error.message);
      if (error.message.includes('relation "plans" does not exist')) {
        console.log('❌ Database tables not created yet. Please run the SQL schema.');
      }
    } else {
      console.log('✅ Database connection successful!');
      console.log('Found plans:', data?.length || 0);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  });
