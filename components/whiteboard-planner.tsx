"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { PlusCircle, MapPin, Calendar, Trash2, Palette, Share2, Copy, Save } from 'lucide-react';
import { 
  getPlanByToken, 
  updatePlan, 
  getDestinations, 
  createDestination, 
  deleteDestination,
  createPlan,
  generatePlanName
} from '../lib/database';
import { useDrawingTools, ShapeDrawer } from '../lib/drawing-tools';
import { useLayerManagement } from '../lib/layer-management';
import { EnhancedToolbar } from './enhanced-toolbar';

interface Destination {
  id: string;
  name: string;
  x: number;
  y: number;
  notes: string;
  color: string;
}

interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  layer_id?: string;
  opacity?: number;
  brush_type?: string;
  smoothing?: number;
}

interface EnhancedShape {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  zIndex: number;
  layer_id?: string;
}

interface ApiDrawingData {
  id: string;
  path_data: { x: number; y: number }[];
  color: string;
  stroke_width: number;
  layer_id?: string;
  opacity?: number;
  brush_type?: string;
  smoothing?: number;
}

interface WhiteboardPlannerProps {
  token: string;
}

const WhiteboardPlanner = ({ token }: WhiteboardPlannerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Plan state
  // const [planId, setPlanId] = useState<string | null>(null); // Removed
  const [planUuid, setPlanUuid] = useState<string | null>(null); // Added

  // Drawing tools and layer management
  const { toolConfig, updateToolConfig } = useDrawingTools();
  const {
    layers,
    activeLayerId,
    addLayer,
    deleteLayer, // Renamed from removeLayer
    // toggleLayerVisibility, // Removed
    // toggleLayerLock, // Removed
    updateLayer, // Contains functionality for opacity, visibility, lock, name, z_index
    // moveLayer, // This functionality can be part of updateLayer (z_index)
    setActiveLayerId,
    // updateLayer // Added - This was a duplicate, removed
  } = useLayerManagement(token, planUuid); 
  // Existing state
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [shapes] = useState<EnhancedShape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [selectedTool, setSelectedTool] = useState<'draw' | 'destination'>('draw');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [drawColor, setDrawColor] = useState('#3b82f6');
  const [showAddDestination, setShowAddDestination] = useState(false);
  const [newDestinationPos, setNewDestinationPos] = useState({ x: 0, y: 0 });
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [planExists, setPlanExists] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [planTitle, setPlanTitle] = useState('Untitled Travel Plan');
  const [shapeDrawer, setShapeDrawer] = useState<ShapeDrawer | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false); // Autosave disabled by default
  const [autoSaving, setAutoSaving] = useState(false); // Track autosave status

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/plan/${token}` : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy URL:', err);    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const redrawCanvasLocal = () => {
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Initialize ShapeDrawer if not already done
      if (!shapeDrawer) {
        setShapeDrawer(new ShapeDrawer(ctx));
      }

      // Get visible layers sorted by z-index
      const visibleLayers = layers.filter(layer => layer.visible).sort((a, b) => a.z_index - b.z_index);

      // Draw content layer by layer
      visibleLayers.forEach(layer => {
        ctx.globalAlpha = layer.opacity;

        // Draw drawings for this layer
        drawings
          .filter(drawing => drawing.layer_id === layer.id || (!drawing.layer_id && layer.name === 'Routes'))
          .forEach((path) => {
            if (path.points.length > 1) {
              ctx.beginPath();
              ctx.strokeStyle = path.color;
              ctx.lineWidth = path.width;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.globalAlpha = (path.opacity || 1) * layer.opacity;
              
              ctx.moveTo(path.points[0].x, path.points[0].y);
              path.points.slice(1).forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();
            }
          });

        // Draw shapes for this layer
        shapes
          .filter(shape => shape.layer_id === layer.id || (!shape.layer_id && layer.name === 'Background'))
          .sort((a, b) => a.zIndex - b.zIndex)
          .forEach((shape) => {
            ctx.globalAlpha = shape.opacity * layer.opacity;
            
            // Apply shape transformation
            ctx.save();
            ctx.translate(shape.x + (shape.width || 0) / 2, shape.y + (shape.height || 0) / 2);
            ctx.rotate((shape.rotation * Math.PI) / 180);
            ctx.translate(-(shape.width || 0) / 2, -(shape.height || 0) / 2);

            // Draw shape based on type
            const tempDrawer = new ShapeDrawer(ctx);            const tempConfig = {
              tool: shape.type as 'rectangle',
              strokeColor: shape.strokeColor,
              fillColor: shape.fillColor,
              brushSize: shape.strokeWidth,
              opacity: shape.opacity,
              brushType: 'pen' as const,
              strokeStyle: 'solid' as const
            };

            switch (shape.type) {
              case 'rectangle':
                tempDrawer.drawRectangle(0, 0, shape.width || 100, shape.height || 100, tempConfig);
                break;
              case 'circle':
                const radius = Math.min(shape.width || 100, shape.height || 100) / 2;
                tempDrawer.drawCircle(radius, radius, radius, tempConfig);
                break;
              case 'ellipse':
                tempDrawer.drawEllipse((shape.width || 100) / 2, (shape.height || 100) / 2, (shape.width || 100) / 2, (shape.height || 100) / 2, tempConfig);
                break;
              case 'text':
                if (shape.text) {
                  tempDrawer.drawText(shape.text, 0, shape.fontSize || 16, { ...tempConfig, fontSize: shape.fontSize, fontFamily: shape.fontFamily });
                }
                break;
            }

            ctx.restore();
          });
      });

      // Reset global alpha
      ctx.globalAlpha = 1;
    };

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redrawCanvasLocal();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawings, shapes, layers, shapeDrawer]);
  // Helper function to redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get visible layers sorted by z-index
    const visibleLayers = layers.filter(layer => layer.visible).sort((a, b) => a.z_index - b.z_index);

    // Draw content layer by layer
    visibleLayers.forEach(layer => {
      ctx.globalAlpha = layer.opacity;

      // Draw drawings for this layer
      drawings
        .filter(drawing => drawing.layer_id === layer.id || (!drawing.layer_id && layer.name === 'Routes'))
        .forEach((path) => {
          if (path.points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = (path.opacity || 1) * layer.opacity;
            
            ctx.moveTo(path.points[0].x, path.points[0].y);
            path.points.slice(1).forEach((point) => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
        });

      // Draw shapes and destinations here...
      
      // Draw destinations
      destinations.forEach((destination) => {
        ctx.globalAlpha = 1;
        ctx.fillStyle = destination.color;
        ctx.beginPath();
        ctx.arc(destination.x, destination.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw destination label
        ctx.fillStyle = '#000';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText(destination.name, destination.x + 12, destination.y + 4);
      });
    });

    // Reset global alpha
    ctx.globalAlpha = 1;
  }, [layers, drawings, destinations]);
  const handleLayerToggleVisibility = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer && updateLayer) {
      updateLayer(layerId, { visible: !layer.visible });
    }
  };

  const handleLayerToggleLock = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer && updateLayer) {
      updateLayer(layerId, { locked: !layer.locked });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle enhanced drawing tools
    if (toolConfig.tool === 'pen' || toolConfig.tool === 'line') {
      setIsDrawing(true);
      const newPath: DrawingPath = {
        id: Date.now().toString(),
        points: [{ x, y }],
        color: toolConfig.strokeColor,
        width: toolConfig.brushSize,
        layer_id: activeLayerId || undefined,
        opacity: toolConfig.opacity,
        brush_type: toolConfig.brushType,
        smoothing: 0.5, // Added default smoothing
      };
      setCurrentPath(newPath);
    } else if (toolConfig.tool === 'rectangle' || toolConfig.tool === 'circle' || toolConfig.tool === 'ellipse') {
      // Handle shape tools - start shape creation
      setIsDrawing(true);
      // We'll implement shape creation logic here
      console.log(`Starting ${toolConfig.tool} creation at:`, { x, y });
    } else if (selectedTool === 'destination') {
      setNewDestinationPos({ x, y });
      setShowAddDestination(true);
    }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only update path for pen and line tools
    if (toolConfig.tool === 'pen') {
      const updatedPath = {
        ...currentPath,
        points: [...currentPath.points, { x, y }],
      };
      setCurrentPath(updatedPath);

      // Draw the current path in real-time
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = toolConfig.strokeColor;
        ctx.lineWidth = toolConfig.brushSize;
        ctx.globalAlpha = toolConfig.opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (currentPath.points.length > 1) {
          const lastPoint = currentPath.points[currentPath.points.length - 2];
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    } else if (toolConfig.tool === 'line' && currentPath.points.length === 1) {
      // For line tool, update the end point
      const updatedPath = {
        ...currentPath,
        points: [currentPath.points[0], { x, y }],
      };
      setCurrentPath(updatedPath);
      
      // Redraw canvas with preview line
      redrawCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = toolConfig.strokeColor;
        ctx.lineWidth = toolConfig.brushSize;
        ctx.globalAlpha = toolConfig.opacity;
        ctx.setLineDash(toolConfig.strokeStyle === 'dashed' ? [5, 5] : []);
        ctx.beginPath();
        ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };  const handleCanvasMouseUp = async () => {
    if (isDrawing && currentPath) {
      const newDrawings = [...drawings, currentPath];
      setDrawings(newDrawings);
      setCurrentPath(null);
      
      // Auto-save drawings after completing a stroke (only if autosave is enabled)
      if (planExists && autoSaveEnabled) {
        try {
          setAutoSaving(true);
          await saveDrawings();
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setAutoSaving(false);
        }
      }
    }
    setIsDrawing(false);
  };
  const addDestination = async (name: string, notes: string) => {
    try {
      // Always add destination to local state for immediate UI update
      const tempId = `temp-${Date.now()}`;
      const newDestination: Destination = {
        id: tempId,
        name,
        x: newDestinationPos.x,
        y: newDestinationPos.y,
        notes,
        color: '#ef4444'
      };
      
      setDestinations([...destinations, newDestination]);
      setShowAddDestination(false);
      
      // Try to save to database if available
      if (planExists) {
        try {
          const plan = await getPlanByToken(token);
          if (plan) {
            const savedDest = await createDestination(
              plan.id,
              name,
              newDestinationPos.x,
              newDestinationPos.y,
              notes
            );
            
            // Update the destination with the real ID from database
            setDestinations(prev => prev.map(d => 
              d.id === tempId ? { ...d, id: savedDest.id } : d
            ));
            setLastSaved(new Date());
            if (process.env.NODE_ENV === 'development') {
              console.log('Destination saved to database');
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Could not save destination to database - keeping local copy:', error);
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Working in offline mode - destination saved locally only');
        }
      }
    } catch (error) {
      console.error('Error adding destination:', error);
    }
  };

  const removeDestination = async (id: string) => {
    try {
      await deleteDestination(id);
      setDestinations(destinations.filter(dest => dest.id !== id));
      if (selectedDestination?.id === id) {
        setSelectedDestination(null);
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error removing destination:', error);
    }
  };
  const clearCanvas = async () => {
    try {
      setDrawings([]);
      redrawCanvas();
      
      if (planExists) {
        await saveDrawings();
      }
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  };  const saveDrawings = async () => {
    try {
      if (!planExists) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Working in offline mode - drawings not saved to database');
        }
        return;
      }      // Use API route instead of direct database calls
      // Filter out invalid drawings (must have at least 1 point and valid color/width)
      const validDrawings = drawings.filter(drawing => 
        drawing.points && 
        drawing.points.length > 0 && 
        drawing.color && 
        drawing.width > 0 &&
        drawing.points.every(point => 
          typeof point.x === 'number' && 
          typeof point.y === 'number' && 
          !isNaN(point.x) && 
          !isNaN(point.y)
        )
      );

      if (validDrawings.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('No valid drawings to save');
        }
        return;
      }

      const drawingsData = validDrawings.map(drawing => ({
        path_data: drawing.points,
        color: drawing.color,
        stroke_width: drawing.width,
        layer_id: drawing.layer_id,
        opacity: drawing.opacity,
        brush_type: drawing.brush_type,
        smoothing: drawing.smoothing
      }));

      if (process.env.NODE_ENV === 'development') {
        console.log('Saving drawings:', {
          token,
          totalDrawings: drawings.length,
          validDrawings: validDrawings.length,
          drawingCount: drawingsData.length,
          firstDrawing: drawingsData[0] ? {
            pointCount: drawingsData[0].path_data.length,
            color: drawingsData[0].color,
            strokeWidth: drawingsData[0].stroke_width,
            layerId: drawingsData[0].layer_id,
            opacity: drawingsData[0].opacity,
            brushType: drawingsData[0].brush_type,
            smoothing: drawingsData[0].smoothing,
            firstPoint: drawingsData[0].path_data[0]
          } : null
        });
      }

      const response = await fetch('/api/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          drawings: drawingsData
        }),
      });      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Failed to save drawings: ${response.status} ${response.statusText}${errorData ? ` - ${errorData.error}` : ''}`);
      }
      
      setLastSaved(new Date());
      if (process.env.NODE_ENV === 'development') {
        console.log('Drawings saved successfully');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Could not save drawings to database - working in offline mode:', error);
      }
    }
  };

  const updatePlanTitle = async (newTitle: string) => {
    try {
      if (!planExists) return;
      
      const plan = await getPlanByToken(token);
      if (!plan) return;
      
      await updatePlan(plan.id, { title: newTitle });
      setPlanTitle(newTitle);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating plan title:', error);
    }
  };
  // Load plan data from database
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        
        // Try to get existing plan
        try {
          const plan = await getPlanByToken(token);
          if (plan) {
            setPlanTitle(plan.title || 'Untitled Travel Plan');
            setPlanExists(true);
            setPlanUuid(plan.id); // Set planUuid
            
            // Load destinations
            const dests = await getDestinations(plan.id);
            if (dests && Array.isArray(dests)) {
              setDestinations(dests.map(d => ({
                id: d.id,
                name: d.name,
                x: d.x_position,
                y: d.y_position,
                notes: d.notes || '',
                color: d.color
              })));
            }
              // Load drawings via API
            try {
              const drawingResponse = await fetch(`/api/plans?token=${token}&drawings=true`);
              if (drawingResponse.ok) {
                const drawingsData = await drawingResponse.json();
                if (process.env.NODE_ENV === 'development') {
                  console.log('[DEBUG] loadPlan: Raw drawings data from API:', drawingsData);
                }
                if (drawingsData && Array.isArray(drawingsData)) {
                  const mappedDrawings = drawingsData.map((d: ApiDrawingData) => ({ // Use ApiDrawingData type
                    id: d.id,
                    points: d.path_data,
                    color: d.color,
                    width: d.stroke_width,
                    layer_id: d.layer_id,
                    opacity: d.opacity,
                    brush_type: d.brush_type,
                    smoothing: d.smoothing
                  }));
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[DEBUG] loadPlan: Mapped drawings for state:', mappedDrawings);
                  }
                  setDrawings(mappedDrawings);
                }
              } else {
                if (process.env.NODE_ENV === 'development') {
                  console.log('Could not load drawings via API, might be empty or error:', drawingResponse.status);
                }
              }
            } catch (drawingError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error loading drawings via API:', drawingError);
              }
            }
          } else {
            // This case should ideally not be reached if getPlanByToken throws an error for not found
            if (process.env.NODE_ENV === 'development') {
              console.log('[DEBUG] loadPlan: getPlanByToken returned null/undefined, attempting to create plan.');
            }            try {
              const randomPlanName = generatePlanName();
              const newPlan = await createPlan(randomPlanName, 'Automatically created plan', token);
              setPlanTitle(newPlan.title || 'Untitled Travel Plan');
              setPlanExists(true);
              // setPlanId(newPlan.id); // Removed
              setPlanUuid(newPlan.id); // Set planUuid
              setLastSaved(new Date());
              if (process.env.NODE_ENV === 'development') {
                console.log('[DEBUG] loadPlan: Successfully created new plan with token:', token);
              }
            } catch (creationError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('[DEBUG] loadPlan: Failed to create new plan, entering offline mode. Error:', creationError);
              }
              setPlanTitle('Untitled Travel Plan (Offline Mode)');
              setPlanExists(false);
              // setPlanUuid(null); // Explicitly set to null if creation fails
            }
          }
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.message.includes('Plan not found')) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DEBUG] loadPlan: Plan not found, attempting to create a new plan with token:', token);
            }
            try {
              const randomPlanName = generatePlanName();
              const newPlan = await createPlan(randomPlanName, 'Automatically created plan', token);
              setPlanTitle(newPlan.title || 'Untitled Travel Plan');
              setPlanExists(true);
              // setPlanId(newPlan.id); // Removed
              setPlanUuid(newPlan.id); // Set planUuid
              setLastSaved(new Date());
              if (process.env.NODE_ENV === 'development') {
                console.log('[DEBUG] loadPlan: Successfully created new plan after initial fetch failed. Token:', token);
              }
            } catch (creationError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('[DEBUG] loadPlan: Failed to create new plan after fetch error, entering offline mode. Error:', creationError);
              }
              setPlanTitle('Untitled Travel Plan (Offline Mode)');
              setPlanExists(false);
              // setPlanUuid(null); // Explicitly set to null if creation fails
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('Plan not found or database not ready, creating offline plan. Original error:', fetchError);
            }
            // Plan doesn't exist or database not ready, work in offline mode
            setPlanTitle('Untitled Travel Plan (Offline Mode)');
            setPlanExists(false);
            // setPlanUuid(null); // Explicitly set to null
          }
        }
      } catch (error) { // Outer catch for any other unexpected errors during loading
        if (process.env.NODE_ENV === 'development') {
          console.log('Database connection issue or other error in loadPlan, working in offline mode:', error);
        }
        setPlanTitle('Untitled Travel Plan (Offline Mode)');
        setPlanExists(false);
        // setPlanUuid(null); // Explicitly set to null
      } finally {
        setIsLoading(false);
      }
    };

    loadPlan();
  }, [token]); // Removed createPlan from dependencies as it's stable

  // Load autosave preference from localStorage
  useEffect(() => {
    const savedAutoSavePreference = localStorage.getItem('autosave-enabled');
    if (savedAutoSavePreference !== null) {
      setAutoSaveEnabled(JSON.parse(savedAutoSavePreference));
    }
  }, []);

  // Save autosave preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('autosave-enabled', JSON.stringify(autoSaveEnabled));
  }, [autoSaveEnabled]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Travel Plan...</h2>
          <p className="text-gray-600">Token: {token}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mag-Drawing</h1>
            <input
              type="text"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              onBlur={(e) => updatePlanTitle(e.target.value)}
              className="text-lg font-medium text-gray-700 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-gray-300 focus:rounded px-2 py-1"
              placeholder="Enter plan title..."
            />
          </div>
          <div className="text-sm text-gray-500">
            Plan Token: <code className="bg-gray-100 px-2 py-1 rounded">{token}</code>
          </div>
        </div>        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-xs text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          {autoSaving && (
            <span className="text-xs text-blue-600 animate-pulse">
              Auto-saving...
            </span>
          )}
            <Button
            variant="outline"
            size="sm"
            onClick={saveDrawings}
            disabled={isLoading || autoSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {autoSaving ? 'Saving...' : 'Save'}
          </Button>          {/* Autosave Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autosave-toggle"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label 
              htmlFor="autosave-toggle" 
              className="text-xs text-gray-600 cursor-pointer"
              title="Automatically save drawings after each stroke"
            >
              Auto-save
            </label>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // Generate secure token server-side
                const response = await fetch('/api/plans', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'generate_token'
                  })
                });
                
                if (response.ok) {
                  const data = await response.json();
                  window.location.href = `/plan/${data.token}`;
                } else {
                  // Fallback with warning
                  console.warn('Server token generation failed');
                  const fallbackToken = `client_${Date.now()}_${crypto.getRandomValues(new Uint32Array(2)).join('')}`;
                  window.location.href = `/plan/${fallbackToken}`;
                }
              } catch (error) {
                console.error('Error generating new plan token:', error);
                // Secure fallback using Web Crypto API
                const array = new Uint8Array(12);
                crypto.getRandomValues(array);
                const fallbackToken = `offline_${Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')}`;
                window.location.href = `/plan/${fallbackToken}`;
              }
            }}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Plan
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Plan
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant={selectedTool === 'draw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('draw')}
            >
              <Palette className="h-4 w-4 mr-2" />
              Draw
            </Button>
            <Button
              variant={selectedTool === 'destination' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('destination')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Add Place
            </Button>
          </div>
          
          {selectedTool === 'draw' && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="w-8 h-8 rounded border-2 border-gray-300"
              />
              <Button variant="outline" size="sm" onClick={clearCanvas}>
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>      <div className="flex-1 flex">
        {/* Enhanced Toolbar */}
        <EnhancedToolbar
          toolConfig={toolConfig}
          onToolConfigChange={updateToolConfig}
          layers={layers}
          activeLayerId={activeLayerId}
          onLayerSelect={setActiveLayerId}
          onLayerToggleVisibility={handleLayerToggleVisibility}
          onLayerToggleLock={handleLayerToggleLock}
          onLayerAdd={addLayer}
          onLayerRemove={deleteLayer} // Changed to deleteLayer
          onLayerMove={(layerId: string, direction: 'up' | 'down') => {
            const layer = layers.find(l => l.id === layerId);
            if (layer && updateLayer) {
              const newZIndex = direction === 'up' ? layer.z_index + 1 : layer.z_index - 1;
              // Add validation or clamping for z_index if necessary
              updateLayer(layerId, { z_index: newZIndex });
            }
          }}
          onLayerOpacityChange={(layerId: string, opacity: number) => {
            if (updateLayer) {
              updateLayer(layerId, { opacity });
            }
          }}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full bg-white cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          
          {/* Destination Markers */}
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: dest.x, top: dest.y }}
              onClick={() => setSelectedDestination(dest)}
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                style={{ backgroundColor: dest.color }}
              >
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {dest.name}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Travel Plan
          </h2>
          
          <div className="space-y-4">
            {destinations.map((dest) => (
              <Card key={dest.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{dest.name}</h3>
                    {dest.notes && (
                      <p className="text-xs text-gray-600 mt-1">{dest.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDestination(dest.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
            
            {destinations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />                <p className="text-sm">No destinations added yet</p>
                <p className="text-xs">Click &quot;Add Place&quot; and then click on the canvas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Destination Modal */}
      {showAddDestination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Destination</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const notes = formData.get('notes') as string;
              if (name.trim()) {
                addDestination(name, notes);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Destination Name</label>
                  <Input name="name" placeholder="Enter destination name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <Textarea name="notes" placeholder="Add notes about this destination" rows={3} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Destination
                  </Button>                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddDestination(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Share Travel Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Share URL</label>
                <div className="flex gap-2">
                  <Input 
                    value={shareUrl} 
                    readOnly 
                    className="flex-1 bg-gray-50"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Anyone with this URL can view and edit your travel plan
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowShareDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>      )}
    </div>
  );
};

export default WhiteboardPlanner;
