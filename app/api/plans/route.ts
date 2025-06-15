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
      'Access-Control-Allow-Methods': 'POST, GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=86400', // Cache preflight for 24 hours
    },
  });
}

// PUT method for updating drawings
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 20); // Allow 20 drawing saves per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
          }
        }
      );
    }

    const body = await request.json();
      // Debug logging to see what's being sent
    if (process.env.NODE_ENV === 'development') {
      console.log('PUT /api/plans - Raw request body:', {
        token: body.token,
        drawingsCount: body.drawings?.length,
        shapesCount: body.shapes?.length,
        firstDrawing: body.drawings?.[0] ? {
          keys: Object.keys(body.drawings[0]),
          sample: body.drawings[0]
        } : 'No drawings',
        firstShape: body.shapes?.[0] ? {
          keys: Object.keys(body.shapes[0]),
          sample: body.shapes[0]
        } : 'No shapes'
      });
    }    // Import database functions here to avoid issues
    const { getPlanByToken, deleteAllDrawings, createEnhancedDrawingByUuid, createShapeByUuid } = await import('../../../lib/database');
    
    // Validate request - updated to include enhanced fields with more flexible validation
    const requestSchema = z.object({
      token: z.string().min(1),
      drawings: z.array(z.object({
        path_data: z.array(z.object({
          x: z.number(),
          y: z.number()
        })),
        color: z.string(),
        stroke_width: z.number(),
        layer_id: z.string().optional().nullable(),
        opacity: z.number().optional().nullable(),
        brush_type: z.string().optional().nullable(),
        smoothing: z.number().optional().nullable()
      })).optional(),      shapes: z.array(z.object({
        id: z.string(),
        type: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number().optional().nullable(),
        height: z.number().optional().nullable(),
        rotation: z.number(),
        strokeColor: z.string(),
        fillColor: z.string().optional().nullable(),
        strokeWidth: z.number(),
        opacity: z.number(),
        text: z.string().optional().nullable(),
        fontSize: z.number().optional().nullable(),
        fontFamily: z.string().optional().nullable(),
        zIndex: z.number(),
        layer_id: z.string().optional().nullable()
      })).optional()
    });
    
    let validatedData;
    try {
      validatedData = requestSchema.parse(body);
    } catch (validationError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('PUT /api/plans - Validation error:', validationError);
      }
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError instanceof Error ? validationError.message : 'Unknown validation error' },
        { status: 400 }
      );
    }
      // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Received enhanced drawing/shape save request:', {
        token: validatedData.token,
        drawingCount: validatedData.drawings?.length || 0,
        shapeCount: validatedData.shapes?.length || 0,
        firstDrawing: validatedData.drawings?.[0] ? {
          pointCount: validatedData.drawings[0].path_data.length,
          color: validatedData.drawings[0].color,
          strokeWidth: validatedData.drawings[0].stroke_width,
          layerId: validatedData.drawings[0].layer_id,
          opacity: validatedData.drawings[0].opacity,
          brushType: validatedData.drawings[0].brush_type,
          smoothing: validatedData.drawings[0].smoothing,
          firstPoint: validatedData.drawings[0].path_data[0]
        } : null,
        firstShape: validatedData.shapes?.[0] ? {
          id: validatedData.shapes[0].id,
          type: validatedData.shapes[0].type,
          x: validatedData.shapes[0].x,
          y: validatedData.shapes[0].y
        } : null
      });
    }
    
    // Get plan by token
    const plan = await getPlanByToken(validatedData.token);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }
      // Handle drawings if provided
    if (validatedData.drawings) {
      // Clear existing drawings and save new ones with enhanced properties
      await deleteAllDrawings(plan.id);
      
      for (const drawing of validatedData.drawings) {        await createEnhancedDrawingByUuid(plan.id, {
          path_data: drawing.path_data,
          color: drawing.color,
          stroke_width: drawing.stroke_width,
          layer_id: drawing.layer_id || undefined,
          opacity: drawing.opacity || 1,
          brush_type: (drawing.brush_type as 'pen' | 'marker' | 'highlighter' | 'eraser') || 'pen',  
          smoothing: drawing.smoothing || 0.5
        });
      }
    }

    // Handle shapes if provided
    if (validatedData.shapes) {
      // Import shape management functions  
      const { deleteAllShapesByUuid } = await import('../../../lib/database');
      
      // Clear existing shapes and save new ones
      await deleteAllShapesByUuid(plan.id);

      for (const shape of validatedData.shapes) {
        const shapeDataForDB = {
          layer_id: shape.layer_id || undefined,
          shape_type: shape.type as 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text' | 'sticky-note',
          x_position: shape.x,
          y_position: shape.y,
          width: shape.width || undefined,
          height: shape.height || undefined,
          rotation: shape.rotation,
          stroke_color: shape.strokeColor,
          fill_color: shape.fillColor || undefined,
          stroke_width: shape.strokeWidth,
          opacity: shape.opacity,
          text_content: shape.text || undefined,
          font_size: shape.fontSize || undefined,
          font_family: shape.fontFamily || undefined,
          z_index: shape.zIndex
        };
        
        await createShapeByUuid(plan.id, shapeDataForDB);
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Enhanced drawing save error:', error);
    return NextResponse.json(
      { error: 'Failed to save drawings' },
      { status: 500 }
    );
  }
}

// GET method for loading drawings
export async function GET(request: NextRequest) {
  try {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] GET /api/plans called with URL:', request.url);
    }
    
    // Rate limiting
    const rateLimitResult = rateLimit(request, 100); // Increased from 50 to 100 reads per minute for debugging
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
          }
        }
      );
    }    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const loadDrawings = searchParams.get('drawings') === 'true';
    const loadShapes = searchParams.get('shapes') === 'true';
    const loadBoth = searchParams.get('all') === 'true'; // New parameter for optimized loading
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Import database functions here to avoid issues
    const { getPlanByToken, getEnhancedDrawings, getShapes } = await import('../../../lib/database');
    
    // Get plan by token
    const plan = await getPlanByToken(token);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Optimized: Load both drawings and shapes in parallel with a single API call
    if (loadBoth) {
      const [drawings, shapes] = await Promise.all([
        getEnhancedDrawings(plan.id),
        getShapes(token)
      ]);
      return NextResponse.json({
        drawings: drawings || [],
        shapes: shapes || []
      });
    } else if (loadDrawings) {
      // Return enhanced drawings for this plan
      const drawings = await getEnhancedDrawings(plan.id);
      return NextResponse.json(drawings || []);
    } else if (loadShapes) {
      // Return shapes for this plan
      const shapes = await getShapes(token);
      return NextResponse.json(shapes || []);
    } else {
      // Return plan details
      return NextResponse.json(plan);
    }
    
  } catch (error) {
    console.error('GET plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
