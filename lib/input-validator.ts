import { z } from 'zod';

// Comprehensive input validation schemas
export const InputValidator = {
  // Plan validation schema
  planSchema: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(100, 'Title too long')
      .regex(/^[a-zA-Z0-9\s\-_.,!?()[\]]+$/, 'Title contains invalid characters')
      .transform(val => val.trim()),
    description: z.string()
      .max(500, 'Description too long')
      .regex(/^[a-zA-Z0-9\s\-_.,!?\n\r()[\]]*$/, 'Description contains invalid characters')
      .transform(val => val?.trim() || '')
      .optional(),
    token: z.string()
      .min(12, 'Token too short')
      .max(64, 'Token too long')
      .regex(/^[a-zA-Z0-9\-_]+$/, 'Token contains invalid characters')
  }),

  // Destination validation schema
  destinationSchema: z.object({
    name: z.string()
      .min(1, 'Destination name is required')
      .max(50, 'Destination name too long')
      .regex(/^[a-zA-Z0-9\s\-_.,!?()[\]]+$/, 'Destination name contains invalid characters')
      .transform(val => val.trim()),
    notes: z.string()
      .max(200, 'Notes too long')
      .regex(/^[a-zA-Z0-9\s\-_.,!?\n\r()[\]]*$/, 'Notes contain invalid characters')
      .transform(val => val?.trim() || '')
      .optional(),
    x_position: z.number()
      .min(0, 'X position must be positive')
      .max(10000, 'X position too large'),
    y_position: z.number()
      .min(0, 'Y position must be positive')
      .max(10000, 'Y position too large'),
    color: z.string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
      .optional()
      .default('#3B82F6')
  }),

  // Drawing validation schema
  drawingSchema: z.object({
    path_data: z.array(z.object({
      x: z.number().min(0).max(10000),
      y: z.number().min(0).max(10000)
    })).min(1).max(1000),
    color: z.string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
      .optional()
      .default('#000000'),
    stroke_width: z.number()
      .min(1, 'Stroke width too small')
      .max(50, 'Stroke width too large')
      .optional()
      .default(2)
  }),

  // Token validation schema
  tokenSchema: z.string()
    .min(12, 'Token too short')
    .max(64, 'Token too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Token contains invalid characters'),

  // Generic ID validation
  idSchema: z.string()
    .uuid('Invalid ID format'),

  // Sanitize HTML content
  sanitizeHtml: (input: string): string => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Validate and sanitize URL parameters
  validateUrlParam: (param: string, type: 'token' | 'id' = 'token'): { valid: boolean; value?: string; error?: string } => {
    try {
      if (type === 'token') {
        const validated = InputValidator.tokenSchema.parse(param);
        return { valid: true, value: validated };
      } else if (type === 'id') {
        const validated = InputValidator.idSchema.parse(param);
        return { valid: true, value: validated };
      }
      return { valid: false, error: 'Invalid parameter type' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          valid: false, 
          error: error.errors.map(e => e.message).join(', ')
        };
      }
      return { valid: false, error: 'Validation failed' };
    }
  },

  // Validate request body with specific schema
  validateRequestBody: <T>(
    body: unknown, 
    schema: z.ZodSchema<T>
  ): { valid: boolean; data?: T; errors?: string[] } => {
    try {
      const validated = schema.parse(body);
      return { valid: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }
};

// Rate limiting for validation endpoints
export class ValidationRateLimit {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  static checkValidationRate(identifier: string, maxAttempts: number = 10, windowMs: number = 60000): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, data] of this.attempts.entries()) {
      if (data.resetTime < windowStart) {
        this.attempts.delete(key);
      }
    }

    const current = this.attempts.get(identifier);
    
    if (!current) {
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
    }

    if (current.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetTime: current.resetTime };
    }

    current.count++;
    return { allowed: true, remaining: maxAttempts - current.count, resetTime: current.resetTime };
  }
}
