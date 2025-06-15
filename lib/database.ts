import { supabase } from './supabase';
import { generateUUID } from './uuid';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schemas
const planSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000),
  token: z.string().min(10).max(50),
});

const destinationSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().max(500),
  x_position: z.number().min(0).max(5000),
  y_position: z.number().min(0).max(5000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const drawingSchema = z.object({
  path_data: z.array(z.object({
    x: z.number(),
    y: z.number()
  })).min(1).max(1000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  stroke_width: z.number().min(1).max(50),
});

// Sanitize input data
function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}

export interface Plan {
  id: string;
  token: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Destination {
  id: string;
  plan_id: string;
  name: string;
  notes?: string;
  x_position: number;
  y_position: number;
  color: string;
  order_index: number;
  created_at: string;
}

export interface Drawing {
  id: string;
  plan_id: string;
  path_data: { x: number; y: number }[];
  color: string;
  stroke_width: number;
  created_at: string;
}

// Phase 1: Enhanced interfaces for shapes and layers
export interface Shape {
  id: string;
  plan_id: string;
  layer_id?: string;
  shape_type: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text' | 'sticky-note';
  x_position: number;
  y_position: number;
  width?: number;
  height?: number;
  rotation: number;
  stroke_color: string;
  fill_color?: string;
  stroke_width: number;
  opacity: number;
  text_content?: string;
  font_size?: number;
  font_family?: string;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface Layer {
  id: string;
  plan_id: string;
  name: string;
  z_index: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnhancedDrawing extends Drawing {
  layer_id?: string;
  opacity: number;
  brush_type: 'pen' | 'marker' | 'highlighter' | 'eraser';
  smoothing: number;
}

// Generate a cryptographically secure random token for URL sharing
const generateToken = () => {
  // Use crypto.randomBytes for server-side secure token generation
  if (typeof window === 'undefined') {
    // Server-side: use Node.js crypto
    return crypto.randomBytes(18).toString('base64url'); // URL-safe base64
  } else {
    // Client-side fallback: use Web Crypto API
    const array = new Uint8Array(18);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
};

// Generate a meaningful random plan name
export const generatePlanName = () => {
  const adjectives = [
    'Amazing', 'Epic', 'Wonderful', 'Fantastic', 'Incredible', 'Spectacular', 
    'Magical', 'Unforgettable', 'Adventurous', 'Dreamy', 'Perfect', 'Ultimate',
    'Scenic', 'Hidden', 'Secret', 'Wild', 'Peaceful', 'Exciting', 'Legendary',
    'Mysterious', 'Charming', 'Breathtaking', 'Stunning', 'Majestic', 'Exotic'
  ];
  
  const places = [
    'Island', 'Mountain', 'Beach', 'City', 'Forest', 'Desert', 'Valley', 'Coast',
    'Village', 'Castle', 'Garden', 'Lake', 'River', 'Canyon', 'Peninsula', 'Bay',
    'Harbor', 'Countryside', 'Meadow', 'Cliff', 'Waterfall', 'Temple', 'Palace',
    'Market', 'Plaza', 'Bridge', 'Lighthouse', 'Vineyard', 'Glacier', 'Oasis'
  ];
  
  const experiences = [
    'Adventure', 'Journey', 'Escape', 'Discovery', 'Expedition', 'Quest', 'Voyage',
    'Exploration', 'Getaway', 'Trip', 'Tour', 'Safari', 'Retreat', 'Experience',
    'Wandering', 'Odyssey', 'Pilgrimage', 'Excursion', 'Holiday', 'Vacation'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const place = places[Math.floor(Math.random() * places.length)];
  const experience = experiences[Math.floor(Math.random() * experiences.length)];
  
  // Generate different name patterns
  const patterns = [
    `${adjective} ${place} ${experience}`,
    `${place} ${experience}`,
    `${adjective} ${experience}`,
    `My ${adjective} ${place} Trip`,
    `${experience} to ${adjective} ${place}`,
    `${adjective} ${place} Discovery`
  ];
  
  return patterns[Math.floor(Math.random() * patterns.length)];
};

// Plan operations
export const createPlan = async (title: string, description: string, providedToken?: string): Promise<Plan> => {
  try {
    const generatedOrProvidedToken = providedToken || generateToken();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] createPlan: Token before sanitization: '${generatedOrProvidedToken}' (Existing token provided: ${!!providedToken})`);
    }
    
    const validatedData = planSchema.parse({
      title: sanitizeInput(title),
      description: description ? sanitizeInput(description) : '',
      token: sanitizeInput(generatedOrProvidedToken),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] createPlan: Token after sanitization, being saved: '${validatedData.token}'`);
      console.log(`[DEBUG] createPlan: Attempting to save plan with title: '${validatedData.title}'`);
    }
    
    const { data, error } = await supabase
      .from('plans')
      .insert([
        { title: validatedData.title, description: validatedData.description, token: validatedData.token }
      ])
      .select('id, token, title, description, created_at, updated_at')
      .single();    if (error) {
      // Check for duplicate key error first (this is expected in development due to React StrictMode)
      if (error.code === '23505' && error.message.includes('plans_token_key')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] createPlan: Detected duplicate token error (23505) - this is expected in React StrictMode. Attempting to fetch existing plan with token:', validatedData.token);
        }
        try {
          const existingPlan = await getPlanByToken(validatedData.token);
          if (existingPlan) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DEBUG] createPlan: Successfully fetched existing plan after duplicate error:', existingPlan);
            }
            return existingPlan;
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.error('[DEBUG] createPlan: getPlanByToken returned null for existing plan, token:', validatedData.token);
            }
            throw new Error('Failed to retrieve existing plan after duplicate key error.');
          }
        } catch (fetchError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[DEBUG] createPlan: Error while fetching existing plan after duplicate error:', fetchError);
            console.error('[DEBUG] createPlan: Token used for fetch:', validatedData.token);
          }          throw new Error('Failed to retrieve existing plan after duplicate key error.');
        }
      }
      
      // For non-duplicate errors, log detailed error information
      if (process.env.NODE_ENV === 'development') {
        console.error('[DEBUG] createPlan: Unexpected Supabase error:', JSON.stringify(error, null, 2));
        console.error('[DEBUG] createPlan: Error message:', error.message);
        console.error('[DEBUG] createPlan: Error code:', error.code);
        console.error('[DEBUG] createPlan: Token used:', validatedData.token);
      }
      throw error;
    }

    if (!data) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[DEBUG] createPlan: No data returned from Supabase after insert, but no error reported.');
      }
      throw new Error('Plan creation did not return data.');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] createPlan: Successfully inserted plan. Returned data:', data);
    }
    return {
      id: data.id,
      token: data.token,
      title: data.title,
      description: data.description,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[DEBUG] createPlan: Error in createPlan:', error);
    }

    interface SupabaseError {
      message: string;
      code: string;
      details?: string;
      hint?: string;
    }

    const isSupabaseError = (err: unknown): err is SupabaseError => {
        return typeof err === 'object' && err !== null && 'code' in err && typeof (err as SupabaseError).code === 'string' && 'message' in err && typeof (err as SupabaseError).message === 'string';
    };

    const getErrorMessage = (err: unknown): string => {
        if (isSupabaseError(err)) {
            return err.message;
        }
        if (err instanceof Error) {
            return err.message;
        }
        return 'Unknown error';
    };

    const errorMessage = getErrorMessage(error);

    if (errorMessage.includes('Plan not found')) {
        throw error;
    }
    if (isSupabaseError(error) && error.code === '23505' && error.message.includes('plans_token_key')) {
        throw new Error('Plan creation failed due to duplicate token, and subsequent fetch also failed.');
    }
    throw new Error(`Plan creation failed: ${errorMessage}`);
  }
};

export const getPlanByToken = async (token: string): Promise<Plan | null> => {
  const sanitizedToken = sanitizeInput(token);
  if (!sanitizedToken) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[DEBUG] getPlanByToken: Invalid token provided (empty after sanitization). Original:', token);
    }
    throw new Error('Invalid token provided.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] getPlanByToken: Attempting to fetch plan with sanitized token: '${sanitizedToken}'`);
  }

  try {
    const { data, error, status } = await supabase
      .from('plans')
      .select('id, token, title, description, created_at, updated_at')
      .eq('token', sanitizedToken)
      .maybeSingle();

    if (error && status !== 406) { // 406 is "Not Acceptable", often means no rows found with maybeSingle()
      if (process.env.NODE_ENV === 'development') {
        console.error('[DEBUG] getPlanByToken: Supabase error fetching plan.', {
          message: error.message,
          details: error.details,
          code: error.code,
          status: status,
          tokenUsed: sanitizedToken
        });
      }
      // Do not throw "Plan not found" for generic errors, let the specific check below handle it.
      // Throw for other errors.
      if (status !== 404) { // 404 might also indicate not found, but maybeSingle handles this by returning null data
         // Rethrow if it's not a "not found" scenario that maybeSingle handles by returning null
        if (!error.message.includes('Results contain 0 rows')) { // PostgREST might not use 404 for 0 rows with maybeSingle
            throw new Error(`Database error fetching plan: ${error.message}`);
        }
      }
    }
    
    if (!data) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DEBUG] getPlanByToken: Plan not found in database. Original token: '${token}', Sanitized: '${sanitizedToken}'`);
      }
      throw new Error('Plan not found'); // Specific error for "not found"
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] getPlanByToken: Successfully fetched plan:', data);
    }
    return data as Plan;

  } catch (error: unknown) {
    const getErrorMessage = (err: unknown): string => {
        if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: string }).message === 'string') {
            return (err as { message: string }).message;
        }
        if (err instanceof Error) {
            return err.message;
        }
        return 'Unknown error';
    };
    const errorMessageString = getErrorMessage(error);

    if (process.env.NODE_ENV === 'development') {
      if (!errorMessageString.includes('Plan not found')) {
        console.error('[DEBUG] getPlanByToken: Catch block error. Original token:', token, 'Sanitized:', sanitizedToken, 'Error:', error);
      }
    }
    
    if (errorMessageString.includes('Plan not found') || errorMessageString.includes('Results contain 0 rows')) {
        throw new Error('Plan not found');
    }
    throw error;
  }
};

export const updatePlan = async (id: string, updates: Partial<Omit<Plan, 'id' | 'token' | 'created_at'>>) => {
  try {    // Validate and sanitize updates
    const sanitizedUpdates: Partial<Pick<Plan, 'title' | 'description'>> = {};
    if (updates.title) {
      sanitizedUpdates.title = sanitizeInput(updates.title);
    }
    if (updates.description) {
      sanitizedUpdates.description = sanitizeInput(updates.description);
    }
    
    const { data, error } = await supabase
      .from('plans')
      .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Plan;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

export const deletePlan = async (token: string) => {
  // First get the plan to verify token
  const plan = await getPlanByToken(token);
  
  if (!plan) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEBUG] deletePlan: Plan with token '${token}' not found. Nothing to delete.`);
    }
    // Optionally, throw an error or return a status
    // For now, let's just return if plan not found, as delete operation implies idempotency
    return; 
  }

  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', plan.id);

  if (error) {
    console.error(`[DEBUG] deletePlan: Supabase error deleting plan with id '${plan.id}' and token '${token}':`, error);
    throw error;
  }
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] deletePlan: Successfully deleted plan with id '${plan.id}' and token '${token}'.`);
  }
};

// Destination operations
export const createDestination = async (
  plan_id: string,
  name: string,
  x_position: number,
  y_position: number,
  notes?: string,
  color = '#ef4444'
) => {
  try {
    // Validate and sanitize inputs
    const validatedData = destinationSchema.parse({
      name: sanitizeInput(name),
      notes: notes ? sanitizeInput(notes) : '',
      x_position: Math.max(0, Math.min(5000, x_position)), // Clamp to safe range
      y_position: Math.max(0, Math.min(5000, y_position)), // Clamp to safe range
      color: color.match(/^#[0-9A-Fa-f]{6}$/) ? color : '#ef4444', // Validate color format
    });

    const { data, error } = await supabase
      .from('destinations')
      .insert([{ 
        plan_id: sanitizeInput(plan_id), 
        name: validatedData.name, 
        x_position: validatedData.x_position, 
        y_position: validatedData.y_position, 
        notes: validatedData.notes, 
        color: validatedData.color 
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Destination;
  } catch (error) {
    console.error('Database validation error:', error);
    throw new Error('Invalid destination data');
  }
};

export const getDestinations = async (plan_id: string) => {
  try {
    // Validate plan_id
    if (!plan_id || typeof plan_id !== 'string') {
      throw new Error('Invalid plan ID');
    }

    const sanitizedPlanId = sanitizeInput(plan_id);

    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('plan_id', sanitizedPlanId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Supabase error in getDestinations:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw new Error(`Failed to fetch destinations: ${error.message || 'Unknown error'}`);
    }

    return data as Destination[];
  } catch (error) {
    if (error instanceof Error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Database error in getDestinations:', error.message);
      }
      throw error;
    } else {
      const errorMessage = 'Unknown error fetching destinations';
      if (process.env.NODE_ENV === 'development') {
        console.error('Unknown error in getDestinations:', error);
      }
      throw new Error(errorMessage);
    }
  }
};

export const updateDestination = async (id: string, updates: Partial<Destination>) => {
  try {
    // Validate and sanitize updates
    const sanitizedUpdates: Partial<Destination> = {};
    
    if (updates.name) {
      sanitizedUpdates.name = sanitizeInput(updates.name);
    }
    if (updates.notes) {
      sanitizedUpdates.notes = sanitizeInput(updates.notes);
    }
    if (updates.x_position !== undefined) {
      sanitizedUpdates.x_position = Math.max(0, Math.min(5000, updates.x_position));
    }
    if (updates.y_position !== undefined) {
      sanitizedUpdates.y_position = Math.max(0, Math.min(5000, updates.y_position));
    }
    if (updates.color) {
      sanitizedUpdates.color = updates.color.match(/^#[0-9A-Fa-f]{6}$/) ? updates.color : '#ef4444';
    }

    const { data, error } = await supabase
      .from('destinations')
      .update(sanitizedUpdates)
      .eq('id', sanitizeInput(id))
      .select()
      .single();

    if (error) throw error;
    return data as Destination;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

export const deleteDestination = async (id: string) => {
  try {
    // Validate and sanitize id
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid destination ID');
    }

    const sanitizedId = sanitizeInput(id);

    const { error } = await supabase
      .from('destinations')
      .delete()
      .eq('id', sanitizedId);

    if (error) throw error;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

// Drawing operations
export const createDrawing = async (
  plan_id: string,
  path_data: { x: number; y: number }[],
  color = '#3b82f6',
  stroke_width = 2
) => {
  try {
    // Validate and sanitize inputs
    const validatedData = drawingSchema.parse({
      path_data: path_data.map(point => ({
        x: Math.max(0, Math.min(5000, point.x)),
        y: Math.max(0, Math.min(5000, point.y))
      })),
      color: color.match(/^#[0-9A-Fa-f]{6}$/) ? color : '#3b82f6',
      stroke_width: Math.max(1, Math.min(50, stroke_width))
    });

    const { data, error } = await supabase
      .from('drawings')
      .insert([{ 
        plan_id: sanitizeInput(plan_id), 
        path_data: validatedData.path_data, 
        color: validatedData.color, 
        stroke_width: validatedData.stroke_width 
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Drawing;
  } catch (error) {
    console.error('Database validation error:', error);
    throw new Error('Invalid drawing data');
  }
};

export const getDrawings = async (plan_id: string) => {
  try {
    // Validate plan_id
    if (!plan_id || typeof plan_id !== 'string') {
      throw new Error('Invalid plan ID');
    }

    const sanitizedPlanId = sanitizeInput(plan_id);

    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('plan_id', sanitizedPlanId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error in getDrawings:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw new Error(`Failed to fetch drawings: ${error.message || 'Unknown error'}`);
    }

    return data as EnhancedDrawing[]; // Return as EnhancedDrawing array
  } catch (error) {
    if (error instanceof Error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Database error in getDrawings:', error.message);
      }
      throw error;
    } else {
      const errorMessage = 'Unknown error fetching drawings';
      if (process.env.NODE_ENV === 'development') {
        console.error('Unknown error in getDrawings:', error);
      }
      throw new Error(errorMessage);
    }
  }
};

// Add a specific function for getting enhanced drawings
export const getEnhancedDrawings = async (plan_id: string): Promise<EnhancedDrawing[]> => {
  try {
    // Validate plan_id
    if (!plan_id || typeof plan_id !== 'string') {
      throw new Error('Invalid plan ID');
    }

    const sanitizedPlanId = sanitizeInput(plan_id);

    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('plan_id', sanitizedPlanId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error in getEnhancedDrawings:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw new Error(`Failed to fetch enhanced drawings: ${error.message || 'Unknown error'}`);
    }

    // Ensure all drawings have default values for enhanced properties
    const enhancedData = (data || []).map(drawing => ({
      ...drawing,
      layer_id: drawing.layer_id || null,
      opacity: drawing.opacity || 1,
      brush_type: drawing.brush_type || 'pen',
      smoothing: drawing.smoothing || 0.5
    })) as EnhancedDrawing[];

    return enhancedData;
  } catch (error) {
    if (error instanceof Error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Database error in getEnhancedDrawings:', error.message);
      }
      throw error;
    } else {
      const errorMessage = 'Unknown error fetching enhanced drawings';
      if (process.env.NODE_ENV === 'development') {
        console.error('Unknown error in getEnhancedDrawings:', error);
      }
      throw new Error(errorMessage);
    }
  }
};

// Helper function to get plan UUID from token
async function getPlanUuidFromToken(token: string): Promise<string | null> {
  const plan = await getPlanByToken(token);
  return plan?.id || null;
}

// Phase 1: Shape management functions
export async function createShape(planToken: string, shapeData: Omit<Shape, 'id' | 'plan_id' | 'created_at' | 'updated_at'>): Promise<Shape | null> {
  try {
    // Get the actual plan UUID from the token
    const planUuid = await getPlanUuidFromToken(planToken);
    if (!planUuid) {
      console.error('Error creating shape: Plan not found for token:', planToken);
      return null;
    }

    // Import validation from input-validator
    const { InputValidator } = await import('./input-validator');
    
    // Map database field names to validation schema field names
    const frontendShapeData = {
      id: generateUUID(),
      type: shapeData.shape_type,
      x: shapeData.x_position,
      y: shapeData.y_position,
      width: shapeData.width,
      height: shapeData.height,
      rotation: shapeData.rotation || 0,
      strokeColor: shapeData.stroke_color,
      fillColor: shapeData.fill_color,
      strokeWidth: shapeData.stroke_width || 2,
      opacity: shapeData.opacity || 1,
      text: shapeData.text_content,
      fontSize: shapeData.font_size,
      fontFamily: shapeData.font_family,
      zIndex: shapeData.z_index || 0    };
    
    // Validate shape data using frontend schema
    const validatedData = InputValidator.shapeSchema.parse(frontendShapeData);

    const { data, error } = await supabase
      .from('shapes')
      .insert([{
        plan_id: planUuid, // Use the actual plan UUID
        layer_id: shapeData.layer_id,
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
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating shape:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating shape:', error);
    return null;
  }
}

export async function getShapes(planToken: string): Promise<Shape[]> {
  try {
    // Get the actual plan UUID from the token
    const planUuid = await getPlanUuidFromToken(planToken);
    if (!planUuid) {
      console.error('Error fetching shapes: Plan not found for token:', planToken);
      return [];
    }

    const { data, error } = await supabase
      .from('shapes')
      .select('*')
      .eq('plan_id', planUuid) // Use the actual plan UUID
      .order('z_index', { ascending: true });

    if (error) {
      console.error('Error fetching shapes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching shapes:', error);
    return [];
  }
}

export async function updateShape(shapeId: string, updates: Partial<Shape>): Promise<boolean> {
  try {
    // Validate updates
    const allowedUpdates = ['x_position', 'y_position', 'width', 'height', 'rotation', 
                           'stroke_color', 'fill_color', 'stroke_width', 'opacity', 
                           'text_content', 'font_size', 'z_index'];    const filteredUpdates: Partial<Record<string, unknown>> = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key as keyof Shape];
        return obj;
      }, {} as Record<string, unknown>);

    filteredUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('shapes')
      .update(filteredUpdates)
      .eq('id', shapeId);

    if (error) {
      console.error('Error updating shape:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating shape:', error);
    return false;
  }
}

export async function deleteShape(shapeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shapes')
      .delete()
      .eq('id', shapeId);

    if (error) {
      console.error('Error deleting shape:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting shape:', error);
    return false;
  }
}

// Phase 1: Layer management functions
export async function createLayer(planUuid: string, layerData: Omit<Layer, 'id' | 'plan_id' | 'created_at' | 'updated_at'>): Promise<Layer | null> {
  try {
    // Plan UUID is now directly provided
    if (!planUuid) {
      console.error('Error creating layer: Plan UUID is missing.');
      return null;
    }

    const { InputValidator } = await import('./input-validator');
    
    // Validate layer data
    const validatedData = InputValidator.layerSchema.parse({
      id: generateUUID(),
      ...layerData
    });

    const { data, error } = await supabase
      .from('plan_layers')
      .insert([{
        plan_id: planUuid, // Use the provided plan UUID
        name: validatedData.name,
        z_index: validatedData.zIndex,
        opacity: validatedData.opacity,
        visible: validatedData.visible,
        locked: validatedData.locked
      }])
      .select()
      .single();

    if (error) {
      console.error(
        'Error creating layer (Supabase):',
        'Message:', error.message,
        'Details:', error.details,
        'Code:', error.code,
        'Full Error:', error
      );
      return null;
    }

    return data;
  } catch (error: unknown) { // Changed from any to unknown
    console.error(
      'Error creating layer (Catch):',
      'Message:', (error instanceof Error ? error.message : 'Unknown error'), // Safely access message
      'Full Error:', error
    );
    return null;
  }
}

export async function getLayers(planUuid: string): Promise<Layer[]> {
  try {
    // Plan UUID is now directly provided
    if (!planUuid) {
      console.error('Error fetching layers: Plan UUID is missing.');
      return [];
    }

    const { data, error } = await supabase
      .from('plan_layers')
      .select('*')
      .eq('plan_id', planUuid) // Use the provided plan UUID directly
      .order('z_index', { ascending: true });

    if (error) {
      console.error('Error fetching layers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching layers:', error);
    return [];
  }
}

export async function updateLayer(layerId: string, updates: Partial<Layer>): Promise<boolean> {
  try {
    const allowedUpdates = ['name', 'z_index', 'opacity', 'visible', 'locked'];
      const filteredUpdates: Partial<Record<string, unknown>> = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key as keyof Layer];
        return obj;
      }, {} as Record<string, unknown>);

    filteredUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('plan_layers')
      .update(filteredUpdates)
      .eq('id', layerId);

    if (error) {
      console.error('Error updating layer:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating layer:', error);
    return false;
  }
}

export async function deleteLayer(layerId: string): Promise<boolean> {
  try {
    // First, move all shapes and drawings from this layer to default layer
    const { data: planData } = await supabase
      .from('plan_layers')
      .select('plan_id')
      .eq('id', layerId)
      .single();

    if (planData) {
      // Get default layer (z_index = 0)
      const { data: defaultLayer } = await supabase
        .from('plan_layers')
        .select('id')
        .eq('plan_id', planData.plan_id)
        .eq('z_index', 0)
        .single();

      if (defaultLayer) {
        // Move shapes to default layer
        await supabase
          .from('shapes')
          .update({ layer_id: defaultLayer.id })
          .eq('layer_id', layerId);

        // Move drawings to default layer
        await supabase
          .from('drawings')
          .update({ layer_id: defaultLayer.id })
          .eq('layer_id', layerId);
      }
    }

    // Delete the layer
    const { error } = await supabase
      .from('plan_layers')
      .delete()
      .eq('id', layerId);

    if (error) {
      console.error('Error deleting layer:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting layer:', error);
    return false;
  }
}

export async function initializeDefaultLayers(planUuid: string): Promise<void> {
  try {
    // Plan UUID is now directly provided
    if (!planUuid) {
      console.error('Error initializing layers: Plan UUID is missing.');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] initializeDefaultLayers: Starting initialization for plan UUID: ${planUuid}`);
    }

    // Create default layers using upsert to handle concurrent calls
    const defaultLayers = [
      { name: 'Background', z_index: 0, opacity: 1, visible: true, locked: false },
      { name: 'Routes', z_index: 1, opacity: 1, visible: true, locked: false },
      { name: 'Destinations', z_index: 2, opacity: 1, visible: true, locked: false }
    ];

    // Use upsert to insert layers only if they don't exist (handles race conditions)
    const layersToInsert = defaultLayers.map(layer => ({
      plan_id: planUuid,
      name: layer.name,
      z_index: layer.z_index,
      opacity: layer.opacity,
      visible: layer.visible,
      locked: layer.locked
    }));

    const { data, error } = await supabase
      .from('plan_layers')
      .upsert(layersToInsert, { 
        onConflict: 'plan_id,z_index',
        ignoreDuplicates: true // Ignore if layers already exist
      })
      .select();

    if (error) {
      console.error('Error initializing default layers (upsert):', error);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] initializeDefaultLayers: Successfully initialized ${data?.length || 0} layers for plan UUID: ${planUuid}`);
    }
  } catch (error) {
    console.error('Error initializing default layers:', error);
  }
}

// Enhanced drawing functions with layer support
export async function createEnhancedDrawing(
  planToken: string, 
  drawingData: {
    path_data: Array<{ x: number; y: number }>;
    color: string;
    stroke_width: number;
    layer_id?: string;
    opacity?: number;
    brush_type?: string;
    smoothing?: number;
  }
): Promise<EnhancedDrawing | null> {
  try {
    // Get the actual plan UUID from the token
    const planUuid = await getPlanUuidFromToken(planToken);
    if (!planUuid) {
      console.error('Error creating enhanced drawing: Plan not found for token:', planToken);
      return null;
    }    const { InputValidator } = await import('./input-validator');
    
    // Validate drawing data - adapt the format for the validator
    const validatedData = InputValidator.enhancedDrawingSchema.parse({
      id: generateUUID(),
      pathData: drawingData.path_data.map(point => ({ x: point.x, y: point.y })), // Convert format
      color: drawingData.color,
      strokeWidth: drawingData.stroke_width,
      layerId: drawingData.layer_id,
      opacity: drawingData.opacity || 1,
      brushType: drawingData.brush_type || 'pen',
      smoothing: drawingData.smoothing || 0.5
    });const { data, error } = await supabase
      .from('drawings')
      .insert([{
        plan_id: planUuid, // Use the actual plan UUID
        layer_id: validatedData.layerId,
        path_data: validatedData.pathData,
        color: validatedData.color,
        stroke_width: validatedData.strokeWidth,
        opacity: validatedData.opacity,
        brush_type: validatedData.brushType,
        smoothing: validatedData.smoothing
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating enhanced drawing:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating enhanced drawing:', error);
    return null;
  }
}

// Optimized functions that accept plan UUID directly to avoid repeated getPlanByToken calls
export async function createShapeByUuid(planUuid: string, shapeData: Omit<Shape, 'id' | 'plan_id' | 'created_at' | 'updated_at'>): Promise<Shape | null> {
  try {
    // Import validation from input-validator
    const { InputValidator } = await import('./input-validator');
    
    // Map database field names to validation schema field names
    const frontendShapeData = {
      id: generateUUID(),
      type: shapeData.shape_type,
      x: shapeData.x_position,
      y: shapeData.y_position,
      width: shapeData.width,
      height: shapeData.height,
      rotation: shapeData.rotation || 0,
      strokeColor: shapeData.stroke_color,
      fillColor: shapeData.fill_color,
      strokeWidth: shapeData.stroke_width || 2,
      opacity: shapeData.opacity || 1,
      text: shapeData.text_content,
      fontSize: shapeData.font_size,
      fontFamily: shapeData.font_family,
      zIndex: shapeData.z_index || 0
    };
    
    // Validate shape data using frontend schema
    const validatedData = InputValidator.shapeSchema.parse(frontendShapeData);

    const { data, error } = await supabase
      .from('shapes')
      .insert([{
        plan_id: planUuid, // Use the provided plan UUID directly
        layer_id: shapeData.layer_id,
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
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating shape by UUID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating shape by UUID:', error);
    return null;
  }
}

export async function deleteAllShapesByUuid(planUuid: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shapes')
      .delete()
      .eq('plan_id', planUuid);

    if (error) {
      console.error('Error deleting shapes by UUID:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting shapes by UUID:', error);
    return false;
  }
}

export async function createEnhancedDrawingByUuid(planUuid: string, drawingData: Omit<EnhancedDrawing, 'id' | 'plan_id' | 'created_at' | 'updated_at'>): Promise<EnhancedDrawing | null> {
  try {
    const { data, error } = await supabase
      .from('drawings')
      .insert([{
        plan_id: planUuid, // Use the provided plan UUID directly
        path_data: drawingData.path_data,
        color: drawingData.color,
        stroke_width: drawingData.stroke_width,
        layer_id: drawingData.layer_id,
        opacity: drawingData.opacity,
        brush_type: drawingData.brush_type,
        smoothing: drawingData.smoothing
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating enhanced drawing by UUID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating enhanced drawing by UUID:', error);
    return null;
  }
}

export async function deleteAllDrawings(planUuid: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('drawings')
      .delete()
      .eq('plan_id', planUuid);

    if (error) {
      console.error('Error deleting all drawings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting all drawings:', error);
    return false;
  }
}
