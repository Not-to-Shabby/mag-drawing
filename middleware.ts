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

// Enhanced rate limiting with burst protection
function applyRateLimit(clientIP: string, limit: number = 100, windowMs: number = 15 * 60 * 1000, burstLimit: number = 20): { allowed: boolean; remaining: number; resetTime: number; burst?: boolean } {
  cleanupRateLimit();
  
  const now = Date.now();
  const resetTime = now + windowMs;
  const key = `rate_limit:${clientIP}`;
  const burstKey = `burst:${clientIP}`;
  
  // Check burst protection (short-term high frequency)
  const burstWindow = 60 * 1000; // 1 minute
  const burstEntry = rateLimitStore.get(burstKey);
  
  if (burstEntry && burstEntry.resetTime > now) {
    if (burstEntry.count >= burstLimit) {
      return { allowed: false, remaining: 0, resetTime: burstEntry.resetTime, burst: true };
    }
    burstEntry.count++;
  } else {
    rateLimitStore.set(burstKey, { count: 1, resetTime: now + burstWindow });
  }
  
  // Regular rate limiting
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
  
  // Enhanced Content Security Policy with environment-specific settings
  // Note: Next.js generates inline scripts for various functionalities including:
  // - Hydration scripts
  // - Router prefetching
  // - Dynamic imports
  // - Error boundaries
  // These scripts have dynamic hashes that change with each build/deployment
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  
  // Different CSP for development vs production
  const isDevelopment = process.env.NODE_ENV === 'development';
    // CSP Strategy:
  // 1. Development: Very permissive to allow hot reloading and debugging
  // 2. Production: Allow Next.js inline scripts - NOTE: Cannot use nonce with unsafe-inline
  // 3. Future: Migrate to strict hash-based approach once all Next.js hashes are identified
  let scriptSrc: string;
  
  if (isDevelopment) {
    // Development needs eval for hot reloading and inline for various Next.js features
    // Include nonce for development tools but unsafe-inline will take precedence
    scriptSrc = `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live`;
  } else {
    // Production: Allow Next.js inline scripts
    // IMPORTANT: Cannot include nonce with unsafe-inline as nonce presence disables unsafe-inline
    scriptSrc = `script-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel.app`;
  }
  
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://vercel.live https://*.vercel.app wss://*.supabase.co",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    // Only add CSP reporting in production to avoid dev noise
    ...(isDevelopment ? [] : ["report-uri /api/csp-report"])
  ].join('; ');  // Essential security headers
  response.headers.set('Content-Security-Policy', csp);
  // Only set nonce header in development when we're actually using nonces
  if (isDevelopment) {
    response.headers.set('X-Nonce', nonce);
  }
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
  // Rate limiting for API routes with enhanced protection
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const clientIP = getClientIP(request);
    const { allowed, remaining, resetTime, burst } = applyRateLimit(clientIP, 100, 15 * 60 * 1000, 20);
    
    // Set comprehensive rate limit headers
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    response.headers.set('X-RateLimit-Window', '900'); // 15 minutes in seconds
    response.headers.set('X-RateLimit-Burst-Limit', '20');
    
    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      const errorMessage = burst ? 'Burst rate limit exceeded' : 'Rate limit exceeded';
      
      return new NextResponse(JSON.stringify({ 
        error: errorMessage,
        retryAfter,
        message: 'Too many requests. Please slow down and try again later.'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        },
      });
    }
  }
  // Enhanced security for sensitive API endpoints
  if (request.nextUrl.pathname.startsWith('/api/plans')) {
    const clientIP = getClientIP(request);
    const { allowed } = applyRateLimit(`plans:${clientIP}`, 20, 5 * 60 * 1000, 10); // 20 requests per 5 minutes, 10 burst
    
    if (!allowed) {
      return new NextResponse(JSON.stringify({
        error: 'Rate limit exceeded for plan operations',
        message: 'Too many plan requests. Please wait before creating or accessing more plans.',
        retryAfter: 300
      }), {
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
  // Enhanced suspicious pattern blocking
  const suspiciousPatterns = [
    /\.(php|asp|aspx|jsp|cgi)$/i,
    /\/(wp-admin|wordpress|phpmyadmin)/i,
    /\/(\.env|\.git|config|admin|backup)/i,
    /<script|javascript:|vbscript:|data:text\/html/i,
    /union\s+select|drop\s+table|insert\s+into/i, // SQL injection patterns
    /\.\./i, // Path traversal
    /eval\(|exec\(|system\(/i, // Code execution
  ];

  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousUserAgents = [
    /curl|wget|python|ruby|perl|powershell/i,
    /bot|crawler|spider|scraper/i,
    /scanner|vuln|exploit/i,
  ];

  // Block suspicious user agents for sensitive endpoints
  if (request.nextUrl.pathname.startsWith('/api/')) {
    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        return new NextResponse(JSON.stringify({
          error: 'Access denied',
          message: 'Automated access detected'
        }), { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(request.nextUrl.pathname + request.nextUrl.search)) {
      return new NextResponse(JSON.stringify({
        error: 'Forbidden',
        message: 'Suspicious request pattern detected'
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
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
