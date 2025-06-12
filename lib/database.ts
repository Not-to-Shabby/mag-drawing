import { supabase } from './supabase';
import { z } from 'zod';

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

// Generate a random token for URL sharing
const generateToken = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Plan operations
export const createPlan = async (title: string, description?: string, existingToken?: string) => {
  try {
    const token = existingToken || generateToken();
    
    // Validate and sanitize inputs
    const validatedData = planSchema.parse({
      title: sanitizeInput(title),
      description: description ? sanitizeInput(description) : '',
      token: sanitizeInput(token),
    });
    
    const { data, error } = await supabase
      .from('plans')
      .insert([{ 
        token: validatedData.token, 
        title: validatedData.title, 
        description: validatedData.description 
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Plan;
  } catch (error) {
    console.error('Database validation error:', error);
    throw new Error('Invalid plan data');
  }
};

export const getPlanByToken = async (token: string) => {
  try {
    // Validate token format
    if (!token || token.length < 10 || token.length > 50) {
      throw new Error('Invalid token format');
    }
    
    const sanitizedToken = sanitizeInput(token);
    
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('token', sanitizedToken)
      .single();

    if (error) throw error;
    return data as Plan;
  } catch (error) {
    console.error('Database error:', error);
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
  
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', plan.id);

  if (error) throw error;
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

    if (error) throw error;
    return data as Destination[];
  } catch (error) {
    console.error('Database error:', error);
    throw error;
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

    if (error) throw error;
    return data as Drawing[];
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

export const deleteDrawing = async (id: string) => {
  try {
    // Validate and sanitize id
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid drawing ID');
    }

    const sanitizedId = sanitizeInput(id);

    const { error } = await supabase
      .from('drawings')
      .delete()
      .eq('id', sanitizedId);

    if (error) throw error;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

export const deleteAllDrawings = async (plan_id: string) => {
  try {
    // Validate and sanitize plan_id
    if (!plan_id || typeof plan_id !== 'string') {
      throw new Error('Invalid plan ID');
    }

    const sanitizedPlanId = sanitizeInput(plan_id);

    const { error } = await supabase
      .from('drawings')
      .delete()
      .eq('plan_id', sanitizedPlanId);

    if (error) throw error;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};
