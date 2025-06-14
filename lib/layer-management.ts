// Layer Management Hook for Phase 1
import { useState, useCallback, useEffect } from 'react';
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
  const [layers, setLayers] = useState<LayerState[]>([]); // Changed to LayerState[]
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true); 
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth(); // Removed unused supabase variable

  const initializeLayers = useCallback(async () => {
    setLoading(true);
    setError(null);
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

    // Now we use planUuidFromProps directly as it's confirmed available.
    const currentPlanUuid = planUuidFromProps;

    try {
      // Ensure planUuidFromProps is available before proceeding
      if (!planUuidFromProps) {
        const msg = "Plan UUID is missing. Cannot initialize layers.";
        console.warn(`[WARN] useLayerManagement.initializeLayers: ${msg}`);
        // setLayers([]); // Keep existing layers or set to empty based on desired behavior
        setLoading(false);
        return; // Exit if no planUuid
      }

      console.log(`[DEBUG] useLayerManagement.initializeLayers: Fetching layers for plan UUID: ${planUuidFromProps}`);
      let fetchedLayers = await dbGetLayers(planUuidFromProps);

      if (!fetchedLayers || fetchedLayers.length === 0) {
        console.log(`[DEBUG] useLayerManagement.initializeLayers: No layers found for plan UUID ${planUuidFromProps}, initializing default layers.`);
        await dbInitializeDefaultLayers(planUuidFromProps); // Pass UUID
        fetchedLayers = await dbGetLayers(planUuidFromProps); // Re-fetch after initialization
        console.log(`[DEBUG] useLayerManagement.initializeLayers: Default layers initialized and fetched:`, fetchedLayers);
      }

      // Transform Layer[] to LayerState[]
      const initialLayersState: LayerState[] = fetchedLayers.map(layer => ({
        ...layer,
        shapes: [], // Initialize with empty shapes
        drawings: [] // Initialize with empty drawings
      }));

      setLayers(initialLayersState);

      if (initialLayersState.length > 0 && !initialLayersState.find(l => l.id === activeLayerId)) {
        setActiveLayerId(initialLayersState[0].id); // Fallback to the first layer if no active layer matches
      }

      setError(null);
    } catch (err: unknown) { // Changed to unknown for better type safety
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`[ERROR] useLayerManagement.initializeLayers: Failed for planUuid ${currentPlanUuid}. Error:`, err);
      setError(`Failed to initialize or load layers: ${errorMessage}`);
      setLayers([]);
      setActiveLayerId(null);
    } finally {
      setLoading(false);
      console.log(`[DEBUG] useLayerManagement.initializeLayers: Finalized. Loading: ${false}`);
    }
  }, [
    planToken, 
    planUuidFromProps, 
    activeLayerId, // Added missing dependency
    // supabase, // supabase client from useAuth might not be stable if useAuth itself isn't memoized correctly
    // setLayers, setActiveLayerId are stable setters from useState
  ]);

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
          setError("User not authenticated. Cannot load layers.");
      } else {
        setError("Cannot initialize layers due to missing prerequisites.");
      }
    }
    
    return () => {
      // console.log('[DEBUG] useLayerManagement: Cleanup effect');
    };
  // Add initializeLayers to dependency array as it's a useCallback function
  // supabase is removed as it's part of useAuth and might cause re-runs if not stable
  }, [planToken, planUuidFromProps, isAuthenticated, initializeLayers]);

  // Create new layer
  const addLayer = useCallback(async (name: string, z_index?: number) => {
    if (!planUuidFromProps) { // Use planUuidFromProps for creating layers
      setError('Plan not fully loaded - cannot create layers');
      return false;
    }

    const nameSchema = z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/);
    let validatedName;
    try {
        validatedName = nameSchema.parse(name);
    } catch { // Removed unused _e variable
        setError('Invalid layer name. Use letters, numbers, spaces, hyphens, or underscores.');
        return false;
    }

    if (layers.some(layer => layer.name.toLowerCase() === validatedName.toLowerCase())) {
      setError('Layer name already exists');
      return false;
    }

    if (layers.length >= 20) {
      setError('Maximum 20 layers allowed per plan');
      return false;
    }

    const calculatedZIndex = z_index ?? (layers.length > 0 ? Math.max(...layers.map(l => l.z_index), 0) + 1 : 0);

    // Pass planUuidFromProps to dbCreateLayer
    console.log(`[DEBUG] useLayerManagement.addLayer: Creating new layer '${name}' for plan UUID: ${planUuidFromProps}`);
    // Pass an object as the second argument to dbCreateLayer
    const newDbLayer = await dbCreateLayer(planUuidFromProps, {
      name: validatedName,
      z_index: calculatedZIndex,
      opacity: 1,
      visible: true,
      locked: false
    });
    
    // Handle case where newDbLayer might be null
    if (!newDbLayer) {
      setError('Failed to create layer in the database.');
      return false;
    }

    // Transform to LayerState before adding to local state
    const newLayerState: LayerState = {
      ...newDbLayer,
      shapes: [],
      drawings: []
    };

    setLayers(prevLayers => [...prevLayers, newLayerState].sort((a, b) => a.z_index - b.z_index));
    setActiveLayerId(newLayerState.id);
    setError(null); // Clear previous errors
    return true;
  }, [planUuidFromProps, layers, setLayers, setActiveLayerId, setError]); // Added missing dependencies

  // Update layer properties
  const updateLayer = useCallback(async (layerId: string, updates: Partial<Omit<Layer, 'id' | 'created_at' | 'updated_at' | 'plan_id'>>) => {
    // No need for planUuidFromProps here as dbUpdateLayer uses layerId directly

    let validatedUpdates;
    try {
      validatedUpdates = layerUpdateSchema.parse(updates);
    } catch { // Removed unused _e variable
      setError('Invalid layer properties provided for update.');
      return false;
    }

    if (Object.keys(validatedUpdates).length === 0) {
        setError('No valid updates provided for the layer.');
        return false; // No actual updates to perform
    }

    if (validatedUpdates.name) {
      const existingLayer = layers.find(layer => 
        layer.id !== layerId && 
        layer.name.toLowerCase() === validatedUpdates.name!.toLowerCase()
      );
      if (existingLayer) {
        setError('Layer name already exists');
        return false;
      }
    }

    if (validatedUpdates.z_index !== undefined) {
      const existingLayerWithSameZIndex = layers.find(layer => 
        layer.id !== layerId && 
        layer.z_index === validatedUpdates.z_index
      );
      if (existingLayerWithSameZIndex) {
        // Optional: Implement z-index shifting logic here if desired
        // For now, treating as an error or requiring manual adjustment
        setError('Z-index already in use. Please choose a different z-index or adjust other layers.');
        return false;
      }
    }

    console.log(`[DEBUG] useLayerManagement.updateLayer: Updating layer ${layerId} for plan UUID ${planUuidFromProps} with:`, updates);
    const updateSuccessful = await dbUpdateLayer(layerId, validatedUpdates); // Use validatedUpdates
    
    if (!updateSuccessful) {
      setError('Failed to update layer in the database.');
      return false;
    }
    
    // Transform to LayerState before updating local state
    setLayers(prevLayers => 
      prevLayers.map(l => 
        l.id === layerId ? { ...l, ...validatedUpdates } : l // Use validatedUpdates for local state
      )
    );
    setError(null); // Clear previous errors
    return true;
  }, [layers, setLayers, setError, planUuidFromProps]); // Added missing dependency planUuidFromProps

  // Delete layer
  const deleteLayer = useCallback(async (id: string) => {
    // No need for planUuidFromProps here as dbDeleteLayer uses layerId directly

    const layerToDelete = layers.find(l => l.id === id);
    if (!layerToDelete) {
        setError("Layer not found for deletion.");
        return false;
    }

    // Example: Prevent deletion of a layer named 'Background' (case-insensitive)
    if (layerToDelete.name.toLowerCase() === 'background') {
      setError('Cannot delete the default Background layer');
      return false;
    }

    if (layers.length <= 1) {
      setError('At least one layer must remain');
      return false;
    }

    const success = await dbDeleteLayer(id);
    
    if (success) {
      const updatedLayers = layers.filter(layer => layer.id !== id);
      setLayers(updatedLayers);
      
      if (activeLayerId === id) {
        const nextActive = updatedLayers.find(layer => layer.visible && layer.id) || (updatedLayers.length > 0 ? updatedLayers[0] : null);
        setActiveLayerId(nextActive?.id || null);
      }
      setError(null); // Clear previous errors
      return true;
    }
    
    setError('Failed to delete layer from the database');
    return false;
  }, [layers, activeLayerId, setLayers, setActiveLayerId, setError]); // Added missing dependencies

  // saveDrawing and loadDrawingsForLayer are removed as per previous discussion
  // to simplify and focus on core layer management first.
  // They can be added back if drawing persistence per layer is a confirmed requirement.

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]); // Added missing dependency

  return {
    layers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    isLoading,
    error,
    clearError, // Expose clearError
    // saveDrawing, // Removed
    // loadDrawingsForLayer, // Removed
    setLayers 
  };
}

// Removed unused helper functions like useAuth placeholder, generateUUID (imported from ./uuid)
// Removed unused imports: supabaseClient, updateDrawing, getDrawingsForLayer, Drawing type (for now)
