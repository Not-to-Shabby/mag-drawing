import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().min(1).max(1000)).optional(),
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().min(1000)).optional(),
});

// Validate environment variables
export function validateEnv() {
  try {
    const env = envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    });
    
    return { success: true, env };
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    return { success: false, error };
  }
}

// Export validated environment variables
export const env = validateEnv();

// Runtime environment check
if (!env.success && process.env.NODE_ENV === 'production') {
  throw new Error('Invalid environment configuration');
}
