// Layer Management Hook for Phase 1
import { useState, useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';
// import { supabaseClient } from './supabase'; // Not directly used, supabase comes from useAuth
// import { generateUUID } from './uuid'; // Removed unused import
// Ensure all necessary functions from database.ts are imported
import { 
  getLayers as dbGetLayers, // Renamed to avoid conflict if a local getLayers is defined
  createLayer as dbCreateLayer, 
  updateLayer as dbUpdateLayer, 
  deleteLayer as dbDeleteLayer,
  // updateDrawing as dbUpdateDrawing, // This seems to be missing or incorrectly named in database.ts or not used here
  // getDrawingsForLayer, // This seems to be missing or incorrectly named in database.ts or not used here
  initializeDefaultLayers as dbInitializeDefaultLayers, // Renamed for clarity
  Layer, 
  // Drawing // Drawing type might be needed if saveDrawing/loadDrawingsForLayer are reinstated
} from '../lib/database';
// import { LayerState } from '../lib/layer-management'; // Removed self-import

// Placeholder for useAuth hook - replace with your actual implementation
// This is a simplified version. Your actual hook might be more complex.
const useAuth = () => {
  // In a real app, this would come from your auth context/provider
  // For now, let's assume the user is always authenticated and supabase client is available.
  // You'll need to integrate your actual Supabase client and auth state.
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default to true for now
  const supabase = null; // Replace with your actual Supabase client instance
  
  useEffect(() => {
    // Simulate auth check or listen to auth changes
    // e.g., supabase.auth.onAuthStateChange((_event, session) => setIsAuthenticated(!!session));
    setIsAuthenticated(true); // Keep it simple for now
  }, []);

  return { isAuthenticated, supabase }; 
};


// Layer state interface
export interface LayerState extends Layer {
  shapes: string[]; // Array of shape IDs
  drawings: string[]; // Array of drawing IDs
}

// Layer management validation
const layerUpdateSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/).optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  z_index: z.number().min(0).max(100).optional()
});

// Custom hook for layer management
export function useLayerManagement(planToken: string | null, planUuidFromProps: string | null) {
  const [layers, setLayers] = useState<LayerState[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true); 
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const lastPlanUuidRef = useRef<string | null>(null); // Track last initialized plan

  const initializeLayers = useCallback(async () => {
    console.log(`[DEBUG] useLayerManagement.initializeLayers called. planToken: ${planToken}, planUuidFromProps: ${planUuidFromProps}`);

    if (!planToken) {
      const msg = "Plan token is missing. Cannot initialize layers.";
      console.error(`[ERROR] useLayerManagement.initializeLayers: ${msg}`);
      setError(msg);
      setLoading(false);
      return;
    }

    if (!planUuidFromProps) {
      console.log(`[DEBUG] useLayerManagement.initializeLayers: planUuidFromProps is not yet available for token '${planToken}'. Waiting.`);
      setLoading(false); 
      return;
    }

    // Prevent re-initialization of the same plan
    if (lastPlanUuidRef.current === planUuidFromProps) {
      console.log(`[DEBUG] useLayerManagement.initializeLayers: Plan ${planUuidFromProps} already initialized, skipping.`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[DEBUG] useLayerManagement.initializeLayers: Fetching layers for plan UUID: ${planUuidFromProps}`);
      let fetchedLayers = await dbGetLayers(planUuidFromProps);

      if (!fetchedLayers || fetchedLayers.length === 0) {
        console.log(`[DEBUG] useLayerManagement.initializeLayers: No layers found for plan UUID ${planUuidFromProps}, initializing default layers.`);
        await dbInitializeDefaultLayers(planUuidFromProps);
        fetchedLayers = await dbGetLayers(planUuidFromProps);
        console.log(`[DEBUG] useLayerManagement.initializeLayers: Default layers initialized and fetched:`, fetchedLayers);
      }

      // Transform Layer[] to LayerState[]
      const initialLayersState: LayerState[] = fetchedLayers.map(layer => ({
        ...layer,
        shapes: [], // Initialize with empty shapes
        drawings: [] // Initialize with empty drawings
      }));

      setLayers(initialLayersState);

      // Only set active layer if no active layer is currently set
      if (initialLayersState.length > 0 && !activeLayerId) {
        setActiveLayerId(initialLayersState[0].id);
      }

      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`[ERROR] useLayerManagement.initializeLayers: Failed for planUuid ${planUuidFromProps}. Error:`, err);
      setError(`Failed to initialize or load layers: ${errorMessage}`);
      setLayers([]);
      setActiveLayerId(null);
    } finally {
      setLoading(false);
      // Mark this plan as initialized
      lastPlanUuidRef.current = planUuidFromProps;
      console.log(`[DEBUG] useLayerManagement.initializeLayers: Finalized. Loading: ${false}`);
    }
  }, [planToken, planUuidFromProps, activeLayerId]);

  useEffect(() => {
    console.log(`[DEBUG] useLayerManagement.useEffect triggered. Deps: planToken=${planToken}, planUuidFromProps=${planUuidFromProps}, isAuthenticated=${isAuthenticated}`);
    // We need planUuidFromProps to be available before initializing.
    if (isAuthenticated && planToken && planUuidFromProps) { 
      initializeLayers();
    } else {
      console.log("[DEBUG] useLayerManagement.useEffect: Conditions not met for initialization.");
      setLayers([]); 
      setActiveLayerId(null);
      setLoading(false); 
      if (!planToken && isAuthenticated) {
          setError("Plan token not available to load layers.");
      } else if (!planUuidFromProps && planToken && isAuthenticated) {
          setError("Waiting for plan details to load layers..."); // More specific message
      } else if (!isAuthenticated) {
        setError("Cannot initialize layers due to missing prerequisites.");
      }
    }
    
    return () => {
      // console.log('[DEBUG] useLayerManagement: Cleanup effect');
    };
  }, [planToken, planUuidFromProps, isAuthenticated, initializeLayers]);

  // Create new layer
  const addLayer = useCallback(async (name: string, z_index?: number) => {
    if (!planUuidFromProps) {
      setError('Plan not fully loaded - cannot create layers');
      return false;
    }

    const nameSchema = z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/);
    let validatedName;    try {
      validatedName = nameSchema.parse(name);
    } catch {
      setError('Layer name must be 1-50 characters and contain only letters, numbers, spaces, hyphens, and underscores');
      return false;
    }

    console.log(`[DEBUG] useLayerManagement.addLayer: Creating new layer '${name}' for plan UUID: ${planUuidFromProps}`);
    
    try {
      const nextZIndex = z_index !== undefined ? z_index : Math.max(...layers.map(l => l.z_index)) + 1;
      
      const newLayer = await dbCreateLayer(planUuidFromProps, {
        name: validatedName,
        z_index: nextZIndex,
        opacity: 1,
        visible: true,
        locked: false
      });

      if (newLayer) {
        const newLayerState: LayerState = {
          ...newLayer,
          shapes: [],
          drawings: []
        };
        
        setLayers(prev => [...prev, newLayerState].sort((a, b) => a.z_index - b.z_index));
        setActiveLayerId(newLayer.id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating layer:', error);
      setError('Failed to create layer');
      return false;
    }
  }, [planUuidFromProps, layers]);

  // Get layer by ID
  const getLayer = useCallback((layerId: string): LayerState | undefined => {
    return layers.find(layer => layer.id === layerId);
  }, [layers]);

  // Update layer
  const updateLayer = useCallback(async (layerId: string, updates: Partial<LayerState>): Promise<boolean> => {
    if (!planUuidFromProps) {
      setError('Plan not fully loaded - cannot update layers');
      return false;
    }    // Validate updates
    try {
      layerUpdateSchema.parse(updates);
    } catch {
      setError('Invalid layer update data');
      return false;
    }

    console.log(`[DEBUG] useLayerManagement.updateLayer: Updating layer ${layerId} for plan UUID ${planUuidFromProps} with:`, updates);
    
    try {
      const success = await dbUpdateLayer(layerId, updates);
      
      if (success) {
        setLayers(prev => prev.map(layer => 
          layer.id === layerId ? { ...layer, ...updates } : layer
        ));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating layer:', error);
      setError('Failed to update layer');
      return false;
    }
  }, [planUuidFromProps]);

  // Delete layer
  const deleteLayer = useCallback(async (layerId: string): Promise<boolean> => {
    if (!planUuidFromProps) {
      setError('Plan not fully loaded - cannot delete layers');
      return false;
    }

    if (layers.length <= 1) {
      setError('Cannot delete the last remaining layer');
      return false;
    }

    console.log(`[DEBUG] useLayerManagement.deleteLayer: Deleting layer ${layerId} for plan UUID ${planUuidFromProps}`);
    
    try {
      const success = await dbDeleteLayer(layerId);
      
      if (success) {
        setLayers(prev => prev.filter(layer => layer.id !== layerId));
        
        // If deleting active layer, set new active layer
        if (activeLayerId === layerId) {
          const remainingLayers = layers.filter(layer => layer.id !== layerId);
          setActiveLayerId(remainingLayers.length > 0 ? remainingLayers[0].id : null);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting layer:', error);
      setError('Failed to delete layer');
      return false;
    }
  }, [planUuidFromProps, layers, activeLayerId]);

  // Set active layer
  const setActive = useCallback((layerId: string) => {
    if (layers.find(layer => layer.id === layerId)) {
      setActiveLayerId(layerId);
      console.log(`[DEBUG] useLayerManagement.setActive: Set active layer to ${layerId}`);
    } else {
      console.warn(`[WARN] useLayerManagement.setActive: Layer ${layerId} not found`);
    }
  }, [layers]);

  return {
    layers,
    activeLayerId,
    isLoading,
    error,
    initializeLayers,
    addLayer,
    getLayer,
    updateLayer,
    deleteLayer,
    setActiveLayer: setActive,
    clearError: () => setError(null)
  };
}
