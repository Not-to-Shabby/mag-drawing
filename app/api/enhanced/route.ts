import { NextRequest, NextResponse } from 'next/server';
import { InputValidator } from '../../../lib/input-validator';
import { 
  createShape, 
  getShapes, 
  updateShape, 
  deleteShape,
  createLayer,
  getLayers,
  updateLayer,
  deleteLayer,
  initializeDefaultLayers
} from '../../../lib/database';

// Rate limiting store for enhanced features
const enhancedRateLimit = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return realIP || forwarded?.split(',')[0]?.trim() || 'unknown';
}

function checkEnhancedRateLimit(clientIP: string, operation: string): boolean {
  const key = `${clientIP}:${operation}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const limits = {
    'shape': 30,    // 30 shape operations per minute
    'layer': 20,    // 20 layer operations per minute
    'drawing': 40   // 40 drawing operations per minute
  };
  
  const limit = limits[operation as keyof typeof limits] || 10;
  
  const existing = enhancedRateLimit.get(key);
  if (!existing || existing.resetTime < now) {
    enhancedRateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (existing.count >= limit) {
    return false;
  }
  
  existing.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planToken = searchParams.get('plan');
    const type = searchParams.get('type');
    
    if (!planToken) {
      return NextResponse.json({ error: 'Plan token required' }, { status: 400 });
    }
    
    // Validate token
    const tokenValidation = InputValidator.validateUrlParam(planToken, 'token');
    if (!tokenValidation.valid) {
      return NextResponse.json({ error: 'Invalid plan token' }, { status: 400 });
    }
    
    const clientIP = getClientIP(request);
    if (!checkEnhancedRateLimit(clientIP, 'shape')) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // Get plan ID from token (you'll need to implement this lookup)
    const planId = await getPlanIdFromToken(planToken);
    if (!planId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    switch (type) {
      case 'shapes':
        const shapes = await getShapes(planId);
        return NextResponse.json({ shapes });
        
      case 'layers':
        const layers = await getLayers(planId);
        return NextResponse.json({ layers });
        
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Enhanced API GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const body = await request.json();
    const { action, planToken, data } = body;
    
    if (!planToken || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate token
    const tokenValidation = InputValidator.validateUrlParam(planToken, 'token');
    if (!tokenValidation.valid) {
      return NextResponse.json({ error: 'Invalid plan token' }, { status: 400 });
    }
    
    // Check rate limits based on action
    const operationType = action.startsWith('shape_') ? 'shape' : 
                         action.startsWith('layer_') ? 'layer' : 'drawing';
    
    if (!checkEnhancedRateLimit(clientIP, operationType)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    const planId = await getPlanIdFromToken(planToken);
    if (!planId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    switch (action) {      case 'shape_create':
        try {
          const validatedData = InputValidator.shapeSchema.parse(data);
            // Map validated data to database schema
          const shapeData = {
            layer_id: data.layerId,
            shape_type: validatedData.type,
            x_position: validatedData.x,
            y_position: validatedData.y,
            width: validatedData.width,
            height: validatedData.height,
            rotation: validatedData.rotation,
            stroke_color: validatedData.strokeColor,
            fill_color: validatedData.fillColor,
            stroke_width: validatedData.strokeWidth,
            opacity: validatedData.opacity,
            text_content: validatedData.text,
            font_size: validatedData.fontSize,
            font_family: validatedData.fontFamily,
            z_index: validatedData.zIndex
          };
          
          const shape = await createShape(planId, shapeData);
          return NextResponse.json({ success: true, shape });
        } catch (error) {
          console.error('Shape creation error:', error);
          return NextResponse.json({ error: 'Invalid shape data' }, { status: 400 });
        }
        
      case 'shape_update':
        try {
          const { shapeId, updates } = data;
          if (!shapeId) {
            return NextResponse.json({ error: 'Shape ID required' }, { status: 400 });
          }
          
          const success = await updateShape(shapeId, updates);
          return NextResponse.json({ success });        } catch (error) {
          console.error('Shape update error:', error);
          return NextResponse.json({ error: 'Failed to update shape' }, { status: 500 });
        }
        
      case 'shape_delete':
        try {
          const { shapeId } = data;
          if (!shapeId) {
            return NextResponse.json({ error: 'Shape ID required' }, { status: 400 });
          }
          
          const success = await deleteShape(shapeId);
          return NextResponse.json({ success });        } catch (error) {
          console.error('Shape delete error:', error);
          return NextResponse.json({ error: 'Failed to delete shape' }, { status: 500 });
        }
          case 'layer_create':
        try {
          const validatedData = InputValidator.layerSchema.parse(data);
          
          // Map validated data to database schema
          const layerData = {
            name: validatedData.name,
            z_index: validatedData.zIndex,
            opacity: validatedData.opacity,
            visible: validatedData.visible,
            locked: validatedData.locked
          };
          
          const layer = await createLayer(planId, layerData);
          return NextResponse.json({ success: true, layer });
        } catch (error) {
          console.error('Layer creation error:', error);
          return NextResponse.json({ error: 'Invalid layer data' }, { status: 400 });
        }
        
      case 'layer_update':
        try {
          const { layerId, updates } = data;
          if (!layerId) {
            return NextResponse.json({ error: 'Layer ID required' }, { status: 400 });
          }
          
          const success = await updateLayer(layerId, updates);
          return NextResponse.json({ success });        } catch (error) {
          console.error('Layer update error:', error);
          return NextResponse.json({ error: 'Failed to update layer' }, { status: 500 });
        }
        
      case 'layer_delete':
        try {
          const { layerId } = data;
          if (!layerId) {
            return NextResponse.json({ error: 'Layer ID required' }, { status: 400 });
          }
          
          const success = await deleteLayer(layerId);
          return NextResponse.json({ success });        } catch (error) {
          console.error('Layer delete error:', error);
          return NextResponse.json({ error: 'Failed to delete layer' }, { status: 500 });
        }
        
      case 'initialize_layers':
        try {
          await initializeDefaultLayers(planId);
          const layers = await getLayers(planId);
          return NextResponse.json({ success: true, layers });        } catch (error) {
          console.error('Initialize layers error:', error);
          return NextResponse.json({ error: 'Failed to initialize layers' }, { status: 500 });
        }
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Enhanced API POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get plan ID from token
async function getPlanIdFromToken(token: string): Promise<string | null> {
  try {
    // This should use your existing database function
    const { supabase } = await import('../../../lib/supabase');
    const { data, error } = await supabase
      .from('plans')
      .select('id')
      .eq('token', token)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error getting plan ID from token:', error);
    return null;
  }
}
