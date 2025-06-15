"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { PlusCircle, MapPin, Calendar, Trash2, Palette, Share2, Copy, Save, Moon, Sun } from 'lucide-react';
import { 
  getPlanByToken, 
  updatePlan, 
  getDestinations, 
  createDestination, 
  deleteDestination,
  createPlan,
  generatePlanName,
  Shape
} from '../lib/database';
import { getCachedPlan } from '../lib/plan-cache';
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
  type: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text' | 'sticky-note';
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
  const { toolConfig, updateToolConfig } = useDrawingTools();  const {
    layers,
    activeLayerId,
    addLayer,
    deleteLayer, // Renamed from removeLayer
    updateLayer, // Contains functionality for opacity, visibility, lock, name, z_index
    setActiveLayer
  } = useLayerManagement(token, planUuid);
  
  // Existing state
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);  const [shapes, setShapes] = useState<EnhancedShape[]>([]);
  
  const [selectedShapes, setSelectedShapes] = useState<EnhancedShape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [originalShapeSize, setOriginalShapeSize] = useState<{ x: number; y: number; width: number; height: number } | null>(null);  const [isRotating, setIsRotating] = useState(false);
  const [rotationStartPos, setRotationStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [editingShape, setEditingShape] = useState<EnhancedShape | null>(null);  const [editingText, setEditingText] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<'draw' | 'destination'>('draw');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [showAddDestination, setShowAddDestination] = useState(false);
  const [newDestinationPos, setNewDestinationPos] = useState({ x: 0, y: 0 });
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [planExists, setPlanExists] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [planTitle, setPlanTitle] = useState('Untitled Travel Plan');  const [shapeDrawer, setShapeDrawer] = useState<ShapeDrawer | null>(null);  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false); // Autosave disabled by default
  const [autoSaving, setAutoSaving] = useState(false); // Track autosave status
  const [isClearingCanvas, setIsClearingCanvas] = useState(false); // Prevent auto-save during clear
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle
  const [showToolbar, setShowToolbar] = useState(false); // Mobile toolbar toggle
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/plan/${token}` : '';

  // Resize handle utilities
  const getResizeHandles = (shape: EnhancedShape) => {
    const padding = 8;
    const handleSize = 8;
    const width = shape.width || 100;
    const height = shape.height || 100;
    
    return {
      'nw': { x: shape.x - padding, y: shape.y - padding, size: handleSize }, // Top-left
      'n': { x: shape.x + width / 2 - handleSize / 2, y: shape.y - padding, size: handleSize }, // Top-center
      'ne': { x: shape.x + width + padding - handleSize, y: shape.y - padding, size: handleSize }, // Top-right
      'w': { x: shape.x - padding, y: shape.y + height / 2 - handleSize / 2, size: handleSize }, // Left-center
      'e': { x: shape.x + width + padding - handleSize, y: shape.y + height / 2 - handleSize / 2, size: handleSize }, // Right-center
      'sw': { x: shape.x - padding, y: shape.y + height + padding - handleSize, size: handleSize }, // Bottom-left
      's': { x: shape.x + width / 2 - handleSize / 2, y: shape.y + height + padding - handleSize, size: handleSize }, // Bottom-center
      'se': { x: shape.x + width + padding - handleSize, y: shape.y + height + padding - handleSize, size: handleSize }, // Bottom-right
    };
  };
  const getResizeHandleAtPoint = (x: number, y: number, shape: EnhancedShape): string | null => {
    const handles = getResizeHandles(shape);
    const tolerance = 4; // Extra tolerance for easier clicking
    
    for (const [handleName, handle] of Object.entries(handles)) {
      if (x >= handle.x - tolerance && 
          x <= handle.x + handle.size + tolerance &&
          y >= handle.y - tolerance && 
          y <= handle.y + handle.size + tolerance) {
        return handleName;
      }
    }
    return null;
  };

  const getRotationHandle = (shape: EnhancedShape) => {
    const padding = 8;
    const handleSize = 8;
    const width = shape.width || 100;
    const rotationHandleDistance = 25; // Distance above the shape
    
    return {
      x: shape.x + width / 2 - handleSize / 2,
      y: shape.y - padding - rotationHandleDistance,
      size: handleSize
    };
  };

  const isPointOnRotationHandle = (x: number, y: number, shape: EnhancedShape): boolean => {
    const handle = getRotationHandle(shape);
    const tolerance = 4;
    
    return x >= handle.x - tolerance && 
           x <= handle.x + handle.size + tolerance &&
           y >= handle.y - tolerance && 
           y <= handle.y + handle.size + tolerance;
  };

  const calculateNewSize = (
    handle: string, 
    startPos: { x: number; y: number }, 
    currentPos: { x: number; y: number },
    originalShape: { x: number; y: number; width: number; height: number }
  ) => {
    const deltaX = currentPos.x - startPos.x;
    const deltaY = currentPos.y - startPos.y;
    
    let newX = originalShape.x;
    let newY = originalShape.y;
    let newWidth = originalShape.width;
    let newHeight = originalShape.height;
    
    // Minimum size constraints
    const minSize = 10;
    
    switch (handle) {
      case 'nw': // Top-left
        newX = Math.min(originalShape.x + deltaX, originalShape.x + originalShape.width - minSize);
        newY = Math.min(originalShape.y + deltaY, originalShape.y + originalShape.height - minSize);
        newWidth = Math.max(originalShape.width - deltaX, minSize);
        newHeight = Math.max(originalShape.height - deltaY, minSize);
        break;
      case 'n': // Top-center
        newY = Math.min(originalShape.y + deltaY, originalShape.y + originalShape.height - minSize);
        newHeight = Math.max(originalShape.height - deltaY, minSize);
        break;
      case 'ne': // Top-right
        newY = Math.min(originalShape.y + deltaY, originalShape.y + originalShape.height - minSize);
        newWidth = Math.max(originalShape.width + deltaX, minSize);
        newHeight = Math.max(originalShape.height - deltaY, minSize);
        break;
      case 'w': // Left-center
        newX = Math.min(originalShape.x + deltaX, originalShape.x + originalShape.width - minSize);
        newWidth = Math.max(originalShape.width - deltaX, minSize);
        break;
      case 'e': // Right-center
        newWidth = Math.max(originalShape.width + deltaX, minSize);
        break;
      case 'sw': // Bottom-left
        newX = Math.min(originalShape.x + deltaX, originalShape.x + originalShape.width - minSize);
        newWidth = Math.max(originalShape.width - deltaX, minSize);
        newHeight = Math.max(originalShape.height + deltaY, minSize);
        break;
      case 's': // Bottom-center
        newHeight = Math.max(originalShape.height + deltaY, minSize);
        break;
      case 'se': // Bottom-right
        newWidth = Math.max(originalShape.width + deltaX, minSize);
        newHeight = Math.max(originalShape.height + deltaY, minSize);
        break;
    }
      return { x: newX, y: newY, width: newWidth, height: newHeight };
  };

  const calculateRotationAngle = (
    centerX: number, 
    centerY: number, 
    currentX: number, 
    currentY: number
  ): number => {
    const deltaX = currentX - centerX;
    const deltaY = currentY - centerY;
    return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  };

  // Shape hit detection utilities
  const isPointInShape = (x: number, y: number, shape: EnhancedShape): boolean => {
    const tolerance = 5; // Hit detection tolerance in pixels
    
    switch (shape.type) {
      case 'rectangle':
        return x >= (shape.x - tolerance) && 
               x <= (shape.x + (shape.width || 100) + tolerance) &&
               y >= (shape.y - tolerance) && 
               y <= (shape.y + (shape.height || 100) + tolerance);
               
      case 'circle':
        const radius = Math.min(shape.width || 100, shape.height || 100) / 2;
        const centerX = shape.x + radius;
        const centerY = shape.y + radius;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        return distance <= radius + tolerance;
        
      case 'ellipse':
        const radiusX = (shape.width || 100) / 2;
        const radiusY = (shape.height || 100) / 2;
        const ellipseCenterX = shape.x + radiusX;
        const ellipseCenterY = shape.y + radiusY;
        const ellipseDistance = Math.pow((x - ellipseCenterX) / radiusX, 2) + Math.pow((y - ellipseCenterY) / radiusY, 2);
        return ellipseDistance <= 1.1; // Slightly larger for easier selection      case 'text':
        // Simple bounding box for text
        const textWidth = (shape.text?.length || 1) * (shape.fontSize || 16) * 0.6;
        const textHeight = shape.fontSize || 16;
        return x >= (shape.x - tolerance) && 
               x <= (shape.x + textWidth + tolerance) &&
               y >= (shape.y - textHeight - tolerance) && 
               y <= (shape.y + tolerance);
      
      case 'sticky-note':
        // Simple bounding box for sticky note
        return x >= (shape.x - tolerance) && 
               x <= (shape.x + (shape.width || 150) + tolerance) &&
               y >= (shape.y - tolerance) && 
               y <= (shape.y + (shape.height || 120) + tolerance);
      
      case 'triangle':
        // Simple bounding box for triangle (can be improved with proper triangle hit detection)
        return x >= (shape.x - tolerance) && 
               x <= (shape.x + (shape.width || 100) + tolerance) &&
               y >= (shape.y - tolerance) && 
               y <= (shape.y + (shape.height || 100) + tolerance);
        case 'arrow':
        // Simple bounding box for arrow (can be improved with proper arrow hit detection)
        return x >= (shape.x - tolerance) && 
               x <= (shape.x + (shape.width || 120) + tolerance) &&
               y >= (shape.y - tolerance) && 
               y <= (shape.y + (shape.height || 60) + tolerance);
      
      case 'line':
        // Line hit detection - slightly thicker area for easier selection
        const lineWidth = shape.width || 100;
        const lineThickness = Math.max(shape.strokeWidth || 2, 8); // Minimum 8px for easier selection
        return x >= (shape.x - tolerance) && 
               x <= (shape.x + lineWidth + tolerance) &&
               y >= (shape.y - lineThickness/2 - tolerance) && 
               y <= (shape.y + lineThickness/2 + tolerance);
               
      default:
        return false;
    }
  };

  const getShapeAtPoint = (x: number, y: number): EnhancedShape | null => {
    // Check shapes in reverse z-index order (top to bottom)
    const sortedShapes = [...shapes].sort((a, b) => b.zIndex - a.zIndex);
    
    for (const shape of sortedShapes) {
      if (isPointInShape(x, y, shape)) {
        return shape;
      }
    }
    return null;
  };
  // New function to detect pen drawings at a point
  const getDrawingAtPoint = (x: number, y: number, tolerance: number = 15): DrawingPath | null => {
    // Check drawings in reverse order (most recent first)
    for (let i = drawings.length - 1; i >= 0; i--) {
      const drawing = drawings[i];
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Checking drawing ${i} with ${drawing.points.length} points`);
      }
      
      // Check if point is near any segment of the drawing path
      for (let j = 0; j < drawing.points.length - 1; j++) {
        const p1 = drawing.points[j];
        const p2 = drawing.points[j + 1];
        
        // Calculate distance from point to line segment
        const distance = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        const strokeRadius = (drawing.width || 2) / 2;
        
        if (distance <= tolerance + strokeRadius) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Found drawing at distance ${distance}, tolerance ${tolerance + strokeRadius}`);
          }
          return drawing;
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`No drawing found at point (${x}, ${y})`);
    }
    return null;
  };

  // Helper function to calculate distance from point to line segment
  const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is a point
      return Math.sqrt(A * A + B * B);
    }
    
    const param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const selectShape = (shape: EnhancedShape | null) => {
    if (!shape) {
      setSelectedShapes([]);
      return;
    }
      setSelectedShapes([shape]);
  };

  // Keyboard event handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectedShapes.length > 0) {
        // Remove selected shapes from the shapes array
        setShapes(prevShapes => 
          prevShapes.filter(shape => !selectedShapes.some(selected => selected.id === shape.id))
        );
        
        // Clear selection
        setSelectedShapes([]);
        
        // TODO: Update database - remove shapes from backend
        // This will be implemented when we connect to the database
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSelectedShapes([]);
    }
  }, [selectedShapes]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
      if (!canvas || !ctx) return;      ctx.clearRect(0, 0, canvas.width, canvas.height);      // Fill canvas with background color using CSS custom properties
      const rootElement = document.documentElement;
      const bgColorValue = getComputedStyle(rootElement).getPropertyValue('--background').trim();
      
      // Convert oklch to hex if needed, fallback to appropriate default
      let finalBgColor = '#ffffff'; // Default light background
      if (bgColorValue.includes('oklch')) {
        // Parse oklch values - light mode has high lightness (close to 1), dark mode has low lightness (close to 0)
        const lightnessmatch = bgColorValue.match(/oklch\(([0-9.]+)/);
        if (lightnessmatch) {
          const lightness = parseFloat(lightnessmatch[1]);
          finalBgColor = lightness > 0.5 ? '#ffffff' : '#0a0a0a';
        }
      } else if (bgColorValue.startsWith('#')) {
        finalBgColor = bgColorValue;
      }
        
      ctx.fillStyle = finalBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
            };            switch (shape.type) {
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
              case 'triangle':
                // Draw triangle with three points
                const width = shape.width || 100;
                const height = shape.height || 100;
                tempDrawer.drawTriangle(
                  width / 2, 0,  // Top point
                  0, height,     // Bottom left
                  width, height, // Bottom right
                  tempConfig
                );
                break;              case 'arrow':
                // Draw arrow from left to right
                const arrowWidth = shape.width || 120;
                const arrowHeight = shape.height || 60;
                tempDrawer.drawArrow(0, arrowHeight / 2, arrowWidth, arrowHeight / 2, tempConfig);
                break;
              case 'line':
                // Draw a straight line
                const lineWidth = shape.width || 100;
                tempDrawer.drawLine(0, 0, lineWidth, 0, tempConfig);
                break;              case 'text':
                if (shape.text) {
                  tempDrawer.drawText(shape.text, 0, shape.fontSize || 16, { ...tempConfig, fontSize: shape.fontSize, fontFamily: shape.fontFamily });
                }
                break;
              case 'sticky-note':
                // Draw sticky note as a rectangle with rounded corners and text
                tempDrawer.drawRectangle(0, 0, shape.width || 150, shape.height || 120, tempConfig);
                if (shape.text) {
                  // Draw text with some padding inside the sticky note
                  const padding = 10;
                  ctx.fillStyle = shape.strokeColor;
                  ctx.font = `${shape.fontSize || 14}px ${shape.fontFamily || 'Inter'}`;
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'top';
                  
                  // Simple text wrapping for sticky notes
                  const maxWidth = (shape.width || 150) - 2 * padding;
                  const words = shape.text.split(' ');
                  let line = '';
                  let y = padding;
                  const lineHeight = (shape.fontSize || 14) * 1.2;
                  
                  for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    
                    if (testWidth > maxWidth && n > 0) {
                      ctx.fillText(line, padding, y);
                      line = words[n] + ' ';
                      y += lineHeight;
                    } else {
                      line = testLine;
                    }
                  }
                  ctx.fillText(line, padding, y);
                }
                break;
            }ctx.restore();
          });
      });      // Draw selection indicators for selected shapes
      selectedShapes.forEach((shape) => {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw selection bounding box
        const padding = 8;
        ctx.strokeRect(
          shape.x - padding, 
          shape.y - padding, 
          (shape.width || 100) + 2 * padding, 
          (shape.height || 100) + 2 * padding
        );
        
        // Draw selection handles (small squares at corners and edges)
        const handleSize = 8;
        const handles = [
          // Corners
          { x: shape.x - padding, y: shape.y - padding }, // Top-left
          { x: shape.x + (shape.width || 100) + padding - handleSize, y: shape.y - padding }, // Top-right
          { x: shape.x - padding, y: shape.y + (shape.height || 100) + padding - handleSize }, // Bottom-left
          { x: shape.x + (shape.width || 100) + padding - handleSize, y: shape.y + (shape.height || 100) + padding - handleSize }, // Bottom-right
          // Edges
          { x: shape.x + (shape.width || 100) / 2 - handleSize / 2, y: shape.y - padding }, // Top-center
          { x: shape.x + (shape.width || 100) / 2 - handleSize / 2, y: shape.y + (shape.height || 100) + padding - handleSize }, // Bottom-center
          { x: shape.x - padding, y: shape.y + (shape.height || 100) / 2 - handleSize / 2 }, // Left-center
          { x: shape.x + (shape.width || 100) + padding - handleSize, y: shape.y + (shape.height || 100) / 2 - handleSize / 2 }, // Right-center
        ];
        
        ctx.setLineDash([]);
        ctx.fillStyle = '#3b82f6';
        handles.forEach(handle => {
          ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
          ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        });
          // Draw rotation handle
        const rotationHandle = getRotationHandle(shape);
        
        // Draw connecting line from top-center to rotation handle
        ctx.beginPath();
        ctx.moveTo(shape.x + (shape.width || 100) / 2, shape.y - padding);
        ctx.lineTo(rotationHandle.x + handleSize / 2, rotationHandle.y + handleSize / 2);
        ctx.stroke();
        
        // Draw rotation handle as a circle
        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          rotationHandle.x + handleSize / 2, 
          rotationHandle.y + handleSize / 2, 
          handleSize / 2, 
          0, 
          2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
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
  }, [drawings, shapes, layers, shapeDrawer, selectedShapes, isDarkMode]);
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
    const y = e.clientY - rect.top;    // Handle shape selection when using select tool
    if (toolConfig.tool === 'select') {
      // First check if clicking on a resize handle of a selected shape
      if (selectedShapes.length > 0) {
        const selectedShape = selectedShapes[0]; // For now, handle single selection
          // Check for rotation handle click
        if (isPointOnRotationHandle(x, y, selectedShape)) {
          // Start rotation operation
          setIsRotating(true);
          setRotationStartPos({ x, y });
          return;
        }
        
        // Check for resize handle click
        const handleName = getResizeHandleAtPoint(x, y, selectedShape);
        
        if (handleName) {
          // Start resize operation
          setIsResizing(true);
          setResizeHandle(handleName);
          setResizeStartPos({ x, y });
          setOriginalShapeSize({
            x: selectedShape.x,
            y: selectedShape.y,
            width: selectedShape.width || 100,
            height: selectedShape.height || 100
          });
          return;
        }
      }
        const clickedShape = getShapeAtPoint(x, y);
      
      if (clickedShape) {
        // If clicking on a shape
        if (e.ctrlKey || e.metaKey) {
          // Multi-select with Ctrl/Cmd key
          if (selectedShapes.some(s => s.id === clickedShape.id)) {
            // Deselect if already selected
            setSelectedShapes(prevSelected => prevSelected.filter(s => s.id !== clickedShape.id));
          } else {
            // Add to selection
            setSelectedShapes(prevSelected => [...prevSelected, clickedShape]);
          }
        } else {
          // Single select (replace current selection)
          if (selectedShapes.length === 0 || !selectedShapes.some(s => s.id === clickedShape.id)) {
            selectShape(clickedShape);
          }
        }
        
        // Start dragging the selected shape(s) only if not multi-selecting
        if (!e.ctrlKey && !e.metaKey) {
          setIsDragging(true);
          setDragStartPos({ x, y });
          
          // Calculate offset from click point to shape origin
          setDragOffset({
            x: x - clickedShape.x,
            y: y - clickedShape.y
          });
        }
      } else {
        // Clicking on empty space - deselect all unless Ctrl/Cmd is held
        if (!e.ctrlKey && !e.metaKey) {
          selectShape(null);
        }
      }
      return;
    }    // Handle eraser tool
    if (toolConfig.tool === 'eraser') {
      const clickedShape = getShapeAtPoint(x, y);
      if (clickedShape) {
        // Remove the clicked shape
        setShapes(prevShapes => prevShapes.filter(shape => shape.id !== clickedShape.id));
        console.log(`Erased shape: ${clickedShape.type}`);
        redrawCanvas(); // Ensure immediate visual update
      } else {
        // Check for drawings under the cursor
        const clickedDrawing = getDrawingAtPoint(x, y);
        if (clickedDrawing) {
          // Remove the clicked drawing
          setDrawings(prevDrawings => prevDrawings.filter(drawing => drawing.id !== clickedDrawing.id));
          console.log('Erased pen drawing');
          redrawCanvas(); // Ensure immediate visual update
        }
      }
      return;
    }

    // Clear selection when using other tools
    if (selectedShapes.length > 0) {
      setSelectedShapes([]);
    }    // Handle enhanced drawing tools
    if (toolConfig.tool === 'pen') {
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
    } else if (toolConfig.tool === 'line') {
      // Handle line tool - create a straight line shape
      const newShape: EnhancedShape = {
        id: `line-${Date.now()}`,
        type: 'line',
        x: x,
        y: y,
        width: 100, // Default length
        height: 2,  // Line thickness visual
        rotation: 0,
        strokeColor: toolConfig.strokeColor,
        strokeWidth: toolConfig.brushSize,
        opacity: toolConfig.opacity,
        zIndex: shapes.length + 1,
        layer_id: activeLayerId || undefined
      };
      
      setShapes(prevShapes => [...prevShapes, newShape]);
      console.log(`Created line at:`, { x, y });    } else if (toolConfig.tool === 'rectangle' || toolConfig.tool === 'circle' || toolConfig.tool === 'ellipse' || toolConfig.tool === 'text' || toolConfig.tool === 'triangle' || toolConfig.tool === 'arrow' || toolConfig.tool === 'sticky-note') {
      // Handle shape tools - create shape immediately
      const newShape: EnhancedShape = {
        id: `${toolConfig.tool}-${Date.now()}`,
        type: toolConfig.tool,
        x: x - 50, // Center the shape on click point
        y: y - 50,
        width: toolConfig.tool === 'circle' ? 100 : (toolConfig.tool === 'arrow' ? 120 : (toolConfig.tool === 'sticky-note' ? 150 : 100)),
        height: toolConfig.tool === 'circle' ? 100 : (toolConfig.tool === 'text' ? 30 : (toolConfig.tool === 'arrow' ? 60 : (toolConfig.tool === 'sticky-note' ? 120 : 100))),
        rotation: 0,
        strokeColor: toolConfig.strokeColor,
        fillColor: toolConfig.tool === 'sticky-note' ? '#fef08a' : toolConfig.fillColor, // Yellow for sticky notes
        strokeWidth: toolConfig.brushSize,
        opacity: toolConfig.opacity,
        text: (toolConfig.tool === 'text' || toolConfig.tool === 'sticky-note') ? (toolConfig.tool === 'sticky-note' ? 'Sticky Note' : 'New Text') : undefined,
        fontSize: (toolConfig.tool === 'text' || toolConfig.tool === 'sticky-note') ? 16 : undefined,
        fontFamily: (toolConfig.tool === 'text' || toolConfig.tool === 'sticky-note') ? 'Inter' : undefined,
        zIndex: shapes.length + 1,
        layer_id: activeLayerId || undefined
      };
      
      setShapes(prevShapes => [...prevShapes, newShape]);
      console.log(`Created ${toolConfig.tool} at:`, { x, y });
    } else if (selectedTool === 'destination') {
      setNewDestinationPos({ x, y });
      setShowAddDestination(true);
    }
  };  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle shape rotation
    if (isRotating && rotationStartPos && selectedShapes.length > 0) {
      const selectedShape = selectedShapes[0];
      const centerX = selectedShape.x + (selectedShape.width || 100) / 2;
      const centerY = selectedShape.y + (selectedShape.height || 100) / 2;
      
      const currentAngle = calculateRotationAngle(centerX, centerY, x, y);
      const newRotation = currentAngle;
      
      // Update the selected shape with new rotation
      setShapes(prevShapes => 
        prevShapes.map(shape => {
          if (shape.id === selectedShape.id) {
            return {
              ...shape,
              rotation: newRotation
            };
          }
          return shape;
        })
      );
      
      // Update selected shapes for visual feedback
      setSelectedShapes(prevSelected =>
        prevSelected.map(shape => {
          if (shape.id === selectedShape.id) {
            return {
              ...shape,
              rotation: newRotation
            };
          }
          return shape;
        })
      );
      
      return;
    }

    // Handle shape resizing
    if (isResizing && resizeHandle && resizeStartPos && originalShapeSize && selectedShapes.length > 0) {
      const newSize = calculateNewSize(resizeHandle, resizeStartPos, { x, y }, originalShapeSize);
      
      // Update the selected shape with new size
      const selectedShape = selectedShapes[0];
      setShapes(prevShapes => 
        prevShapes.map(shape => {
          if (shape.id === selectedShape.id) {
            return {
              ...shape,
              x: newSize.x,
              y: newSize.y,
              width: newSize.width,
              height: newSize.height
            };
          }
          return shape;
        })
      );
      
      // Update selected shapes for visual feedback
      setSelectedShapes(prevSelected =>
        prevSelected.map(shape => {
          if (shape.id === selectedShape.id) {
            return {
              ...shape,
              x: newSize.x,
              y: newSize.y,
              width: newSize.width,
              height: newSize.height
            };
          }
          return shape;
        })
      );
      
      return;
    }

    // Handle shape dragging
    if (isDragging && selectedShapes.length > 0 && dragOffset && dragStartPos) {
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      
      // Update positions of all selected shapes
      setShapes(prevShapes => 
        prevShapes.map(shape => {
          if (selectedShapes.some(s => s.id === shape.id)) {
            return {
              ...shape,
              x: shape.x + deltaX,
              y: shape.y + deltaY
            };
          }
          return shape;
        })
      );
      
      // Update selected shapes positions for visual feedback
      setSelectedShapes(prevSelected =>
        prevSelected.map(shape => ({
          ...shape,
          x: shape.x + deltaX,
          y: shape.y + deltaY
        }))
      );
      
      // Update drag start position for next move
      setDragStartPos({ x, y });
      return;
    }

    // Handle pen drawing
    if (!isDrawing || !currentPath) return;

    // Only update path for pen tool
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
  };  const handleCanvasMouseUp = async () => {    // Handle rotation completion
    if (isRotating) {
      setIsRotating(false);
      setRotationStartPos(null);
      
      // TODO: Save shape rotation to database
      console.log('Rotation completed - shape rotated');
      return;
    }

    // Handle resize completion
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStartPos(null);
      setOriginalShapeSize(null);
      
      // TODO: Save shape size to database
      console.log('Resize completed - shape resized');
      return;
    }

    // Handle drag completion
    if (isDragging) {
      setIsDragging(false);
      setDragStartPos(null);
      setDragOffset(null);
      
      // TODO: Save shape positions to database
      console.log('Drag completed - shapes moved');
      return;
    }

    // Handle pen drawing completion
    if (isDrawing && currentPath) {
      const newDrawings = [...drawings, currentPath];
      setDrawings(newDrawings);
      setCurrentPath(null);
      
      // Auto-save drawings after completing a stroke (only if autosave is enabled)
      if (planExists && autoSaveEnabled) {
        try {
          setAutoSaving(true);
          await saveContent();
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setAutoSaving(false);
        }
      }
    }    setIsDrawing(false);
  };
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent default double-click behavior
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only handle double-click in select mode
    if (toolConfig.tool !== 'select') return;

    const clickedShape = getShapeAtPoint(x, y);
    
    if (clickedShape && (clickedShape.type === 'text' || clickedShape.type === 'sticky-note')) {
      // Start editing the text
      setEditingShape(clickedShape);
      setEditingText(clickedShape.text || '');      selectShape(clickedShape); // Ensure shape is selected
    }
  };

  const handleTextEditComplete = (save: boolean = true) => {
    if (!editingShape) return;

    if (save && editingText.trim()) {
      // Update the shape with new text
      setShapes(prevShapes => 
        prevShapes.map(shape => 
          shape.id === editingShape.id 
            ? { ...shape, text: editingText.trim() }
            : shape
        )
      );

      // Update selected shapes as well
      setSelectedShapes(prevSelected =>
        prevSelected.map(shape => 
          shape.id === editingShape.id 
            ? { ...shape, text: editingText.trim() }
            : shape
        )
      );
    }

    // Clear editing state
    setEditingShape(null);
    setEditingText('');
  };

  const handleTextEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (e.key === 'Enter') {
      handleTextEditComplete(true);
    } else if (e.key === 'Escape') {
      handleTextEditComplete(false);
    }
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
          const plan = await getCachedPlan(token, getPlanByToken);
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
      console.error('Error removing destination:', error);    }  };
  const clearCanvas = async (forceManualSave: boolean = false) => {
    try {
      setIsClearingCanvas(true); // Set flag to prevent auto-save
      setDrawings([]);
      setShapes([]); 
      setSelectedShapes([]);
      redrawCanvas();
      
      // Save if auto-save is enabled OR if this is a manual clear action
      if (planExists && (autoSaveEnabled || forceManualSave)) {
        await saveContent();
      }
    } catch (error) {
      console.error('Error clearing canvas:', error);
    } finally {
      setIsClearingCanvas(false); // Reset flag after operation
    }
  };

  const saveContent = useCallback(async () => {
    try {
      if (!planExists) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Working in offline mode - content not saved to database');
        }
        return;      }

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

      // Filter out invalid shapes
      const validShapes = shapes.filter(shape => 
        shape.id && 
        shape.type && 
        typeof shape.x === 'number' && 
        typeof shape.y === 'number' && 
        shape.strokeColor &&
        shape.strokeWidth > 0 &&
        !isNaN(shape.x) && 
        !isNaN(shape.y)
      );

      // Prepare drawings data
      const drawingsData = validDrawings.map(drawing => ({        path_data: drawing.points,
        color: drawing.color,
        stroke_width: drawing.width,
        layer_id: drawing.layer_id,
        opacity: drawing.opacity,
        brush_type: drawing.brush_type,
        smoothing: drawing.smoothing
      }));

      // Prepare shapes data - only include defined values to avoid null serialization issues
      const shapesData = validShapes.map(shape => {
        // Start with required fields
        const shapeData = {
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          rotation: shape.rotation,
          strokeColor: shape.strokeColor,
          strokeWidth: shape.strokeWidth,
          opacity: shape.opacity,
          zIndex: shape.zIndex,
          // Optional fields - only include if they have values
          ...(shape.width !== undefined && shape.width !== null && { width: shape.width }),
          ...(shape.height !== undefined && shape.height !== null && { height: shape.height }),
          ...(shape.fillColor !== undefined && shape.fillColor !== null && { fillColor: shape.fillColor }),
          ...(shape.text !== undefined && shape.text !== null && { text: shape.text }),
          ...(shape.fontSize !== undefined && shape.fontSize !== null && { fontSize: shape.fontSize }),
          ...(shape.fontFamily !== undefined && shape.fontFamily !== null && { fontFamily: shape.fontFamily }),
          ...(shape.layer_id !== undefined && shape.layer_id !== null && { layer_id: shape.layer_id })
        };
        
        return shapeData;
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('Saving content:', {
          token,
          totalDrawings: drawings.length,
          validDrawings: validDrawings.length,
          totalShapes: shapes.length,
          validShapes: validShapes.length,
          autoSaveEnabled,
          drawingCount: drawingsData.length,
          shapeCount: shapesData.length
        });
      }

      // Save both drawings and shapes in a single API call
      const response = await fetch('/api/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          drawings: drawingsData,
          shapes: shapesData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Failed to save content: ${response.status} ${response.statusText}${errorData ? ` - ${errorData.error}` : ''}`);
      }
      
      setLastSaved(new Date());
      if (process.env.NODE_ENV === 'development') {
        console.log('Content saved successfully - drawings and shapes');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Could not save content to database - working in offline mode:', error);
      }
    }
  }, [planExists, token, drawings, shapes, autoSaveEnabled]);

  const updatePlanTitle = async (newTitle: string) => {
    try {
      if (!planExists) return;
        const plan = await getCachedPlan(token, getPlanByToken);
      if (!plan) return;
      
      await updatePlan(plan.id, { title: newTitle });
      setPlanTitle(newTitle);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating plan title:', error);
    }  };
  // Ultra-optimized: Load all plan data (drawings + shapes) in a single API call
  const loadPlanDataOptimized = useCallback(async () => {
    try {
      if (!planExists) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Working in offline mode - plan data not loaded from database');
        }
        return;
      }

      // Single API call to load both drawings and shapes
      const response = await fetch(`/api/plans?token=${token}&all=true`);
      
      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] loadPlanDataOptimized: Raw combined data from API:', data);
        }

        // Process drawings
        if (data.drawings && Array.isArray(data.drawings)) {
          const mappedDrawings = data.drawings.map((d: ApiDrawingData) => ({
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
            console.log('[DEBUG] loadPlanDataOptimized: Mapped drawings for state:', mappedDrawings);
          }
          setDrawings(mappedDrawings);
        }

        // Process shapes
        if (data.shapes && Array.isArray(data.shapes)) {
          const mappedShapes: EnhancedShape[] = data.shapes.map((s: Shape) => ({
            id: s.id,
            type: s.shape_type,
            x: s.x_position,
            y: s.y_position,
            width: s.width,
            height: s.height,
            rotation: s.rotation,
            strokeColor: s.stroke_color,
            fillColor: s.fill_color,
            strokeWidth: s.stroke_width,
            opacity: s.opacity,
            text: s.text_content,
            fontSize: s.font_size,
            fontFamily: s.font_family,
            zIndex: s.z_index,
            layer_id: s.layer_id
          }));
          if (process.env.NODE_ENV === 'development') {
            console.log('[DEBUG] loadPlanDataOptimized: Mapped shapes for state:', mappedShapes);
          }
          setShapes(mappedShapes);
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] loadPlanDataOptimized: Completed single-call loading of drawings and shapes');
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Could not load plan data via optimized API, status:', response.status);
        }
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading plan data via optimized API:', error);
      }
    }
  }, [planExists, token]);
  // Fallback: Load all plan data (drawings + shapes) in parallel - kept for fallback scenarios
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadPlanData = useCallback(async () => {
    try {
      if (!planExists) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Working in offline mode - plan data not loaded from database');
        }
        return;
      }

      // Parallel API calls to load both drawings and shapes simultaneously
      const [drawingsResponse, shapesResponse] = await Promise.all([
        fetch(`/api/plans?token=${token}&drawings=true`),
        fetch(`/api/plans?token=${token}&shapes=true`)
      ]);

      // Process drawings if successful
      if (drawingsResponse.ok) {
        const drawingsData = await drawingsResponse.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] loadPlanData: Raw drawings data from API:', drawingsData);
        }
        if (drawingsData && Array.isArray(drawingsData)) {
          const mappedDrawings = drawingsData.map((d: ApiDrawingData) => ({
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
            console.log('[DEBUG] loadPlanData: Mapped drawings for state:', mappedDrawings);
          }
          setDrawings(mappedDrawings);
        }
      }

      // Process shapes if successful
      if (shapesResponse.ok) {
        const shapesData = await shapesResponse.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] loadPlanData: Raw shapes data from API:', shapesData);
        }
        if (shapesData && Array.isArray(shapesData)) {
          const mappedShapes: EnhancedShape[] = shapesData.map((s: Shape) => ({
            id: s.id,
            type: s.shape_type,
            x: s.x_position,
            y: s.y_position,
            width: s.width,
            height: s.height,
            rotation: s.rotation,
            strokeColor: s.stroke_color,
            fillColor: s.fill_color,
            strokeWidth: s.stroke_width,
            opacity: s.opacity,
            text: s.text_content,
            fontSize: s.font_size,
            fontFamily: s.font_family,
            zIndex: s.z_index,
            layer_id: s.layer_id
          }));
          if (process.env.NODE_ENV === 'development') {
            console.log('[DEBUG] loadPlanData: Mapped shapes for state:', mappedShapes);
          }
          setShapes(mappedShapes);
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] loadPlanData: Completed parallel loading of drawings and shapes');
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading plan data via API:', error);
      }
    }
  }, [planExists, token]);
  // Legacy loadShapes function - kept for specific use cases where only shapes need to be reloaded
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadShapes = useCallback(async () => {
    try {
      if (!planExists) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Working in offline mode - shapes not loaded from database');
        }
        return;
      }

      const response = await fetch(`/api/plans?token=${token}&shapes=true`);
      if (response.ok) {
        const shapesData = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] loadShapes: Raw shapes data from API:', shapesData);
        }
        if (shapesData && Array.isArray(shapesData)) {
          const mappedShapes: EnhancedShape[] = shapesData.map((s: Shape) => ({
            id: s.id,
            type: s.shape_type,
            x: s.x_position,
            y: s.y_position,
            width: s.width,
            height: s.height,
            rotation: s.rotation,
            strokeColor: s.stroke_color,
            fillColor: s.fill_color,
            strokeWidth: s.stroke_width,
            opacity: s.opacity,
            text: s.text_content,
            fontSize: s.font_size,
            fontFamily: s.font_family,
            zIndex: s.z_index,
            layer_id: s.layer_id
          }));
          if (process.env.NODE_ENV === 'development') {
            console.log('[DEBUG] loadShapes: Mapped shapes for state:', mappedShapes);
          }
          setShapes(mappedShapes);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Could not load shapes via API, might be empty or error:', response.status);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading shapes via API:', error);
      }    }
  }, [planExists, token]);

  // Load plan data from database
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
          // Try to get existing plan
        try {
          const plan = await getCachedPlan(token, getPlanByToken);
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
              })));            }            // Ultra-optimized: Load drawings and shapes in a single API call
            try {
              await loadPlanDataOptimized();
            } catch (dataError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error loading plan data via ultra-optimized API:', dataError);
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
  }, [token, loadPlanDataOptimized]); // Updated to use ultra-optimized loadPlanDataOptimized

  // Load autosave preference from localStorage
  useEffect(() => {
    const savedAutoSavePreference = localStorage.getItem('autosave-enabled');
    if (savedAutoSavePreference !== null) {
      setAutoSaveEnabled(JSON.parse(savedAutoSavePreference));
    }
  }, []);

  // Save autosave preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('autosave-enabled', JSON.stringify(autoSaveEnabled));  }, [autoSaveEnabled]);
  // Auto-save content when drawings or shapes change
  useEffect(() => {
    if (planExists && autoSaveEnabled && !isClearingCanvas && (drawings.length > 0 || shapes.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveContent();
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [drawings, shapes, planExists, autoSaveEnabled, isClearingCanvas, saveContent]);
  // Show loading state
  if (isLoading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${isDarkMode ? 'dark' : ''}`}>
        <div className="bg-background text-foreground text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Loading Travel Plan...</h2>
          <p className="text-muted-foreground">Token: {token}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-background text-foreground h-full">        {/* Header */}
        <div className="bg-card border-b border-border p-2 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mag-Drawing</h1>
              <input
                type="text"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                onBlur={(e) => updatePlanTitle(e.target.value)}
                className="text-sm sm:text-lg font-medium text-foreground bg-transparent border-none outline-none focus:bg-background focus:border focus:border-border focus:rounded px-2 py-1 w-full sm:w-auto"
                placeholder="Enter plan title..."
              />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground overflow-hidden">
              <span className="hidden sm:inline">Plan Token: </span>
              <code className="bg-muted text-muted-foreground px-1 sm:px-2 py-1 rounded text-xs break-all">{token}</code>
            </div>
          </div>          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-end sm:justify-start">
            {lastSaved && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                <span className="hidden sm:inline">Last saved: </span>
                <span className="sm:hidden">Saved: </span>
                {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            {autoSaving && (
              <span className="text-xs text-primary animate-pulse whitespace-nowrap">
                Auto-saving...
              </span>
            )}            <Button
              variant="outline"
              size="sm"
              onClick={saveContent}
              disabled={isLoading || autoSaving}
              className="h-8 px-2 sm:px-3"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">{autoSaving ? 'Saving...' : 'Save'}</span>
            </Button>

            <div className="flex items-center gap-1 sm:gap-2">
              <input
                type="checkbox"
                id="autosave-toggle"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="w-3 h-3 sm:w-4 sm:h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label 
                htmlFor="autosave-toggle" 
                className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                title="Automatically save drawings after each stroke"
              >
                <span className="hidden sm:inline">Auto-save</span>
                <span className="sm:hidden">Auto</span>
              </label>
            </div>
              {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkMode(!setIsDarkMode)}
              className="h-8 w-8 p-0 hover:scale-105 transition-all duration-200"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-foreground" />
              )}
            </Button>
          
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
        </div>
      </div>      <div className="flex-1 flex flex-col lg:flex-row relative">
        {/* Mobile Toggle Button for Sidebar */}
        <div className="lg:hidden p-2 border-b border-border bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="w-full justify-start"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {showSidebar ? 'Hide' : 'Show'} Travel Plan
          </Button>
        </div>

        {/* Enhanced Toolbar - Collapsible on mobile */}
        <div className={`${showToolbar ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-background border-b lg:border-b-0 lg:border-r border-border max-h-48 lg:max-h-none overflow-y-auto lg:overflow-visible`}>
          <div className="lg:hidden p-2 border-b border-border bg-card">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowToolbar(!showToolbar)}
              className="w-full justify-start"
            >
              <Palette className="h-4 w-4 mr-2" />
              {showToolbar ? 'Hide' : 'Show'} Tools            </Button>
          </div>
          
          <EnhancedToolbar
          toolConfig={toolConfig}
          onToolConfigChange={updateToolConfig}
          layers={layers}
          activeLayerId={activeLayerId}
          onLayerSelect={setActiveLayer}
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
          }}          onLayerOpacityChange={(layerId: string, opacity: number) => {
            if (updateLayer) {
              updateLayer(layerId, { opacity });
            }
          }}
          onClearCanvas={() => clearCanvas(true)}
          isDarkMode={isDarkMode}
        />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative"><canvas
            ref={canvasRef}            className={`w-full h-full bg-background ${
              toolConfig.tool === 'select' 
                ? (isRotating 
                  ? 'cursor-grab'
                  : isResizing 
                  ? (resizeHandle === 'nw' || resizeHandle === 'se' ? 'cursor-nw-resize' :
                     resizeHandle === 'ne' || resizeHandle === 'sw' ? 'cursor-ne-resize' :
                     resizeHandle === 'n' || resizeHandle === 's' ? 'cursor-ns-resize' :
                     resizeHandle === 'w' || resizeHandle === 'e' ? 'cursor-ew-resize' : 'cursor-default')
                  : (isDragging ? 'cursor-grabbing' : 'cursor-pointer'))
                : toolConfig.tool === 'eraser'
                ? 'cursor-crosshair'
                : 'cursor-crosshair'
            }`}onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}            onDoubleClick={handleCanvasDoubleClick}
          />          {/* Text Editing Overlay */}
          {editingShape && (
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={handleTextEditKeyDown}
              onBlur={() => handleTextEditComplete(true)}
              autoFocus
              className="absolute border-2 border-blue-500 bg-background text-foreground px-2 py-1 text-sm font-medium rounded shadow-lg"
              style={{
                left: editingShape.x,
                top: editingShape.y,
                width: Math.max(editingShape.width || 100, 150),
                fontSize: editingShape.fontSize || 16,
                fontFamily: editingShape.fontFamily || 'Inter',
                zIndex: 1000,
              }}
            />
          )}
          
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
        </div>        {/* Responsive Sidebar */}
        <div className={`${showSidebar ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-card border-l border-border overflow-y-auto absolute lg:relative top-0 right-0 h-full lg:h-auto z-20 lg:z-auto shadow-lg lg:shadow-none`}>
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Travel Plan
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
                className="lg:hidden h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
          
          <div className="space-y-4">
            {destinations.map((dest) => (
              <Card key={dest.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{dest.name}</h3>
                    {dest.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{dest.notes}</p>
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
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />                <p className="text-sm">No destinations added yet</p>
                <p className="text-xs">Click &quot;Add Place&quot; and then click on the canvas</p>
              </div>
            )}
          </div>
        </div>
      </div>      {/* Responsive Add Destination Modal */}
      {showAddDestination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="p-4 sm:p-6 w-full max-w-md bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Add New Destination</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const notes = formData.get('notes') as string;
              if (name.trim()) {
                addDestination(name, notes);
              }
            }}>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 text-foreground">Destination Name</label>
                  <Input name="name" placeholder="Enter destination name" required className="text-sm" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 text-foreground">Notes (optional)</label>
                  <Textarea name="notes" placeholder="Add notes about this destination" rows={3} className="text-sm" />
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
      )}      {/* Share Dialog */}      {/* Responsive Share Modal */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="p-4 sm:p-6 w-full max-w-md bg-card text-card-foreground">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Share Travel Plan</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-foreground">Share URL</label>
                <div className="flex gap-2">
                  <Input 
                    value={shareUrl} 
                    readOnly 
                    className="flex-1 bg-muted text-xs sm:text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyToClipboard}
                    className="px-2 sm:px-3"
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Anyone with this URL can view and edit your travel plan
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowShareDialog(false)}
                >
                  Close                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};

export default WhiteboardPlanner;
