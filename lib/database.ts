import { supabase } from './supabase';

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
  const token = existingToken || generateToken();
  const { data, error } = await supabase
    .from('plans')
    .insert([{ token, title, description }])
    .select()
    .single();

  if (error) throw error;
  return data as Plan;
};

export const getPlanByToken = async (token: string) => {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('token', token)
    .single();

  if (error) throw error;
  return data as Plan;
};

export const updatePlan = async (id: string, updates: Partial<Omit<Plan, 'id' | 'token' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Plan;
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
  const { data, error } = await supabase
    .from('destinations')
    .insert([{ plan_id, name, x_position, y_position, notes, color }])
    .select()
    .single();

  if (error) throw error;
  return data as Destination;
};

export const getDestinations = async (plan_id: string) => {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('plan_id', plan_id)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data as Destination[];
};

export const updateDestination = async (id: string, updates: Partial<Destination>) => {
  const { data, error } = await supabase
    .from('destinations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Destination;
};

export const deleteDestination = async (id: string) => {
  const { error } = await supabase
    .from('destinations')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Drawing operations
export const createDrawing = async (
  plan_id: string,
  path_data: { x: number; y: number }[],
  color = '#3b82f6',
  stroke_width = 2
) => {
  const { data, error } = await supabase
    .from('drawings')
    .insert([{ plan_id, path_data, color, stroke_width }])
    .select()
    .single();

  if (error) throw error;
  return data as Drawing;
};

export const getDrawings = async (plan_id: string) => {
  const { data, error } = await supabase
    .from('drawings')
    .select('*')
    .eq('plan_id', plan_id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Drawing[];
};

export const deleteDrawing = async (id: string) => {
  const { error } = await supabase
    .from('drawings')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const deleteAllDrawings = async (plan_id: string) => {
  const { error } = await supabase
    .from('drawings')
    .delete()
    .eq('plan_id', plan_id);

  if (error) throw error;
};
