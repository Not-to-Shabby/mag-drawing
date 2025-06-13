import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

// Rate limiting store
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Enhanced rate limiting function with IP validation
function rateLimit(request: NextRequest, limit: number = 10, windowMs: number = 60000) {  // Get IP with multiple fallbacks
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cloudflareIP = request.headers.get('cf-connecting-ip');
  const ip = cloudflareIP || realIP || forwarded?.split(',')[0]?.trim() || 'unknown';
  
  // Hash IP for privacy
  const hashedIP = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
  
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < windowStart) {
      delete store[key];
    }
  });
  
  // Check current IP
  if (!store[hashedIP]) {
    store[hashedIP] = { count: 1, resetTime: now + windowMs };
    return { success: true, remaining: limit - 1 };
  }
  
  if (store[hashedIP].count >= limit) {
    return { 
      success: false, 
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((store[hashedIP].resetTime - now) / 1000),
      remaining: 0
    };
  }
  
  store[hashedIP].count++;
  return { success: true, remaining: limit - store[hashedIP].count };
}

// Enhanced input validation schema
const createPlanSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title too long')
    .regex(/^[a-zA-Z0-9\s\-_.,!?]+$/, 'Title contains invalid characters')
    .optional(),
  description: z.string()
    .max(500, 'Description too long')
    .regex(/^[a-zA-Z0-9\s\-_.,!?\n\r]+$/, 'Description contains invalid characters')
    .optional(),
});

// Cryptographically secure token generation
function generateSecureToken(): string {
  // Use crypto.randomBytes for cryptographically secure randomness
  const randomBytes = crypto.randomBytes(18); // 18 bytes = 24 base64 characters
  return randomBytes.toString('base64url'); // URL-safe base64
}

// Validate request origin and headers
function validateRequest(request: NextRequest): { valid: boolean; error?: string } {
  // Check Content-Type for POST requests
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return { valid: false, error: 'Invalid content type' };
    }
  }
  
  // Validate origin in production
  if (process.env.NODE_ENV === 'production') {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://drawing-plan.vercel.app',
      'https://mag-drawing.vercel.app'
    ];
    
    if (origin && !allowedOrigins.includes(origin)) {
      return { valid: false, error: 'Invalid origin' };
    }
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Validate request headers and origin
    const requestValidation = validateRequest(request);
    if (!requestValidation.valid) {
      return NextResponse.json(
        { error: requestValidation.error },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
              ? 'https://drawing-plan.vercel.app' 
              : '*'
          }
        }
      );
    }

    // Apply enhanced rate limiting
    const rateLimitResult = rateLimit(request, 20, 300000); // 20 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error, retryAfter: rateLimitResult.retryAfter },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '300',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
              ? 'https://drawing-plan.vercel.app' 
              : '*'
          }
        }
      );
    }    // Validate and sanitize request body
    let body: { action?: string; title?: string; description?: string } = {};
    try {
      const rawBody = await request.text();
      if (rawBody.trim()) {
        body = JSON.parse(rawBody);
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
              ? 'https://drawing-plan.vercel.app' 
              : '*'
          }
        }
      );
    }

    // Handle secure token generation request
    if (body.action === 'generate_token') {
      const secureToken = generateSecureToken();
      
      return NextResponse.json(
        { 
          token: secureToken,
          message: 'Secure token generated successfully',
          timestamp: new Date().toISOString()
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
              ? 'https://drawing-plan.vercel.app' 
              : '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      );
    }
    
    // Validate plan creation data
    const validatedData = createPlanSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data', 
          details: validatedData.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
              ? 'https://drawing-plan.vercel.app' 
              : '*'
          }
        }
      );
    }

    // Generate cryptographically secure token for plan creation
    const token = generateSecureToken();
    
    if (!token || token.length < 10) {
      return NextResponse.json(
        { error: 'Token generation failed' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
              ? 'https://drawing-plan.vercel.app' 
              : '*'
          }
        }
      );
    }

    const response = NextResponse.json({ 
      token,
      message: 'Plan created successfully',
      expiresIn: process.env.NODE_ENV === 'production' ? 2592000 : null // 30 days in production
    });
    
    // Add comprehensive security headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
      ? 'https://drawing-plan.vercel.app' 
      : '*'
    );
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');    return response;
  } catch (error) {
    // Log error securely (don't expose internal details)
    if (process.env.NODE_ENV === 'development') {
      console.error('Plan API error:', error);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      {        
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
            ? 'https://drawing-plan.vercel.app' 
            : '*'
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
        ? 'https://drawing-plan.vercel.app'
        : '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=86400', // Cache preflight for 24 hours
    },
  });
}
