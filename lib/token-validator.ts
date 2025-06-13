import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

// Token validation and authorization utilities
export class TokenValidator {
  private static validTokens = new Map<string, { 
    created: number; 
    lastAccess: number; 
    accessCount: number;
    ipHash: string;
  }>();

  // Validate token format and security
  static validateTokenFormat(token: string): { valid: boolean; error?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is required and must be a string' };
    }

    // Check token length
    if (token.length < 12 || token.length > 64) {
      return { valid: false, error: 'Token length invalid' };
    }

    // Check for only valid characters (alphanumeric, -, _)
    if (!/^[a-zA-Z0-9\-_]+$/.test(token)) {
      return { valid: false, error: 'Token contains invalid characters' };
    }

    return { valid: true };
  }

  // Validate token access and update tracking
  static validateTokenAccess(token: string, request: NextRequest): { 
    authorized: boolean; 
    error?: string; 
    isFirstAccess?: boolean;
  } {
    const formatValidation = this.validateTokenFormat(token);
    if (!formatValidation.valid) {
      return { authorized: false, error: formatValidation.error };
    }

    // Get client IP for tracking
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    const ipHash = createHash('sha256').update(clientIP).digest('hex').substring(0, 16);

    const now = Date.now();
    const tokenData = this.validTokens.get(token);

    if (!tokenData) {
      // First access to this token
      this.validTokens.set(token, {
        created: now,
        lastAccess: now,
        accessCount: 1,
        ipHash
      });

      return { authorized: true, isFirstAccess: true };
    }

    // Check if token is too old (24 hours for development, 30 days for production)
    const maxAge = process.env.NODE_ENV === 'production' ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    if (now - tokenData.created > maxAge) {
      this.validTokens.delete(token);
      return { authorized: false, error: 'Token expired' };
    }

    // Rate limiting per token (100 requests per hour)
    const hourlyWindow = 60 * 60 * 1000; // 1 hour
    if (tokenData.accessCount > 100 && (now - tokenData.lastAccess) < hourlyWindow) {
      return { authorized: false, error: 'Token rate limit exceeded' };
    }

    // Reset access count if more than an hour has passed
    if (now - tokenData.lastAccess > hourlyWindow) {
      tokenData.accessCount = 1;
    } else {
      tokenData.accessCount++;
    }

    // Update access tracking
    tokenData.lastAccess = now;
    tokenData.ipHash = ipHash; // Update IP in case of legitimate IP change

    this.validTokens.set(token, tokenData);

    return { authorized: true };
  }

  // Clean up expired tokens
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    const maxAge = process.env.NODE_ENV === 'production' ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    for (const [token, data] of this.validTokens.entries()) {
      if (now - data.created > maxAge) {
        this.validTokens.delete(token);
      }
    }
  }

  // Get token statistics (for monitoring)
  static getTokenStats(token: string): {
    exists: boolean;
    created?: number;
    lastAccess?: number;
    accessCount?: number;
  } {
    const tokenData = this.validTokens.get(token);
    if (!tokenData) {
      return { exists: false };
    }

    return {
      exists: true,
      created: tokenData.created,
      lastAccess: tokenData.lastAccess,
      accessCount: tokenData.accessCount
    };
  }
}

// Clean up expired tokens every hour
setInterval(() => {
  TokenValidator.cleanupExpiredTokens();
}, 60 * 60 * 1000);
