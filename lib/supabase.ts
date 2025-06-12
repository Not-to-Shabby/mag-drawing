import { createClient } from '@supabase/supabase-js';
import { validateEnv } from './env';

// Validate environment variables
const envResult = validateEnv();

if (!envResult.success) {
  throw new Error('Failed to initialize Supabase: Invalid environment configuration');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Additional validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error('Invalid Supabase URL format');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence for security
  },
  global: {
    headers: {
      'X-Client-Info': 'mag-drawing@1.0.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});
