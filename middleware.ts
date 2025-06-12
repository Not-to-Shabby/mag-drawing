import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired rate limit entries
function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cloudflareIP = request.headers.get('cf-connecting-ip');
  
  return cloudflareIP || realIP || forwarded?.split(',')[0]?.trim() || 'unknown';
}

// Rate limiting function
function applyRateLimit(clientIP: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupRateLimit();
  
  const now = Date.now();
  const resetTime = now + windowMs;
  const key = `rate_limit:${clientIP}`;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing) {
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }
  
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }
  
  existing.count++;
  return { allowed: true, remaining: limit - existing.count, resetTime: existing.resetTime };
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Enhanced Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://vercel.live wss://*.supabase.co",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  // Essential security headers
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // HTTPS enforcement (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const clientIP = getClientIP(request);
    const { allowed, remaining, resetTime } = applyRateLimit(clientIP, 100, 15 * 60 * 1000);
    
    // Set rate limit headers
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    response.headers.set('X-RateLimit-Window', '900'); // 15 minutes in seconds
    
    if (!allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        },
      });
    }
  }

  // Additional security for sensitive API endpoints
  if (request.nextUrl.pathname.startsWith('/api/plans')) {
    const clientIP = getClientIP(request);
    const { allowed } = applyRateLimit(`plans:${clientIP}`, 20, 5 * 60 * 1000); // 20 requests per 5 minutes
    
    if (!allowed) {
      return new NextResponse('Rate limit exceeded for plan operations', {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '300',
        },
      });
    }
  }

  // Validate request methods for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(request.method)) {
      return new NextResponse('Method Not Allowed', {
        status: 405,
        headers: {
          'Allow': allowedMethods.join(', '),
        },
      });
    }
  }

  // Block suspicious patterns
  const suspiciousPatterns = [
    /\.(php|asp|aspx|jsp|cgi)$/i,
    /\/(wp-admin|wordpress|phpmyadmin)/i,
    /\/(\.env|\.git|config)/i,
    /<script|javascript:|vbscript:/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(request.nextUrl.pathname + request.nextUrl.search)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Additional headers for enhanced security
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
