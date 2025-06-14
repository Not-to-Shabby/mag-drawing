// Enhanced Drawing Tools Hook for Phase 1
import { useState, useCallback } from 'react';
import { z } from 'zod';

// Drawing tool types
export type DrawingTool = 'pen' | 'line' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'text' | 'eraser' | 'select';
export type BrushType = 'pen' | 'marker' | 'highlighter' | 'eraser';

// Tool configuration interface
export interface ToolConfig {
  tool: DrawingTool;
  brushSize: number;
  opacity: number;
  strokeColor: string;
  fillColor?: string;
  brushType: BrushType;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
}

// Validation schemas
const toolConfigSchema = z.object({
  tool: z.enum(['pen', 'line', 'rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'text', 'eraser', 'select']),
  brushSize: z.number().min(1).max(50),
  opacity: z.number().min(0.1).max(1),
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  fillColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  brushType: z.enum(['pen', 'marker', 'highlighter', 'eraser']),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted'])
});

// Custom hook for drawing tools
export function useDrawingTools() {
  const [toolConfig, setToolConfig] = useState<ToolConfig>({
    tool: 'pen',
    brushSize: 2,
    opacity: 1,
    strokeColor: '#3b82f6',
    fillColor: undefined,
    brushType: 'pen',
    strokeStyle: 'solid'
  });

  const updateToolConfig = useCallback((updates: Partial<ToolConfig>) => {
    const newConfig = { ...toolConfig, ...updates };
    
    try {
      const validatedConfig = toolConfigSchema.parse(newConfig);
      setToolConfig(validatedConfig);
      return true;
    } catch (error) {
      console.error('Invalid tool configuration:', error);
      return false;
    }
  }, [toolConfig]);

  const selectTool = useCallback((tool: DrawingTool) => {
    updateToolConfig({ tool });
  }, [updateToolConfig]);

  const setBrushSize = useCallback((brushSize: number) => {
    updateToolConfig({ brushSize });
  }, [updateToolConfig]);

  const setOpacity = useCallback((opacity: number) => {
    updateToolConfig({ opacity });
  }, [updateToolConfig]);

  const setStrokeColor = useCallback((strokeColor: string) => {
    updateToolConfig({ strokeColor });
  }, [updateToolConfig]);

  const setFillColor = useCallback((fillColor?: string) => {
    updateToolConfig({ fillColor });
  }, [updateToolConfig]);

  const setBrushType = useCallback((brushType: BrushType) => {
    updateToolConfig({ brushType });
  }, [updateToolConfig]);

  return {
    toolConfig,
    updateToolConfig,
    selectTool,
    setBrushSize,
    setOpacity,
    setStrokeColor,
    setFillColor,
    setBrushType
  };
}

// Shape drawing utilities
export class ShapeDrawer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // Validate coordinates
  private validateCoordinates(x: number, y: number, width?: number, height?: number): boolean {
    if (x < -1000 || x > 20000 || y < -1000 || y > 20000) return false;
    if (width !== undefined && (width < 1 || width > 5000)) return false;
    if (height !== undefined && (height < 1 || height > 5000)) return false;
    return true;
  }

  // Set up canvas style based on tool config
  private applyStyle(config: ToolConfig): void {
    this.ctx.strokeStyle = config.strokeColor;
    this.ctx.lineWidth = config.brushSize;
    this.ctx.globalAlpha = config.opacity;
    
    if (config.fillColor) {
      this.ctx.fillStyle = config.fillColor;
    }

    // Apply stroke style
    switch (config.strokeStyle) {
      case 'dashed':
        this.ctx.setLineDash([5, 5]);
        break;
      case 'dotted':
        this.ctx.setLineDash([2, 3]);
        break;
      default:
        this.ctx.setLineDash([]);
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  // Draw rectangle
  drawRectangle(x: number, y: number, width: number, height: number, config: ToolConfig): boolean {
    if (!this.validateCoordinates(x, y, width, height)) return false;

    this.applyStyle(config);
    
    if (config.fillColor) {
      this.ctx.fillRect(x, y, width, height);
    }
    this.ctx.strokeRect(x, y, width, height);
    
    return true;
  }

  // Draw circle
  drawCircle(centerX: number, centerY: number, radius: number, config: ToolConfig): boolean {
    if (!this.validateCoordinates(centerX, centerY) || radius < 1 || radius > 2500) return false;

    this.applyStyle(config);
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    
    if (config.fillColor) {
      this.ctx.fill();
    }
    this.ctx.stroke();
    
    return true;
  }

  // Draw ellipse
  drawEllipse(centerX: number, centerY: number, radiusX: number, radiusY: number, config: ToolConfig): boolean {
    if (!this.validateCoordinates(centerX, centerY) || radiusX < 1 || radiusY < 1 || radiusX > 2500 || radiusY > 2500) return false;

    this.applyStyle(config);
    
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    
    if (config.fillColor) {
      this.ctx.fill();
    }
    this.ctx.stroke();
    
    return true;
  }

  // Draw triangle
  drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, config: ToolConfig): boolean {
    if (!this.validateCoordinates(x1, y1) || !this.validateCoordinates(x2, y2) || !this.validateCoordinates(x3, y3)) return false;

    this.applyStyle(config);
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.closePath();
    
    if (config.fillColor) {
      this.ctx.fill();
    }
    this.ctx.stroke();
    
    return true;
  }

  // Draw arrow
  drawArrow(fromX: number, fromY: number, toX: number, toY: number, config: ToolConfig): boolean {
    if (!this.validateCoordinates(fromX, fromY) || !this.validateCoordinates(toX, toY)) return false;

    const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    if (distance > 2000 || distance < 10) return false; // Prevent extremely long or short arrows

    this.applyStyle(config);
    
    // Calculate arrow head
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = Math.min(20, distance * 0.3); // Dynamic head size
    
    // Draw arrow line
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    
    // Draw arrow head
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
    
    return true;
  }

  // Draw line
  drawLine(fromX: number, fromY: number, toX: number, toY: number, config: ToolConfig): boolean {
    if (!this.validateCoordinates(fromX, fromY) || !this.validateCoordinates(toX, toY)) return false;

    this.applyStyle(config);
    
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    
    return true;
  }

  // Draw text
  drawText(text: string, x: number, y: number, config: ToolConfig & { fontSize?: number; fontFamily?: string }): boolean {
    if (!this.validateCoordinates(x, y) || text.length > 500) return false;
    
    // Validate text content
    const textPattern = /^[a-zA-Z0-9\s\-_.,!?\n\r()[\]]*$/;
    if (!textPattern.test(text)) return false;

    this.applyStyle(config);
    
    const fontSize = config.fontSize || 16;
    const fontFamily = config.fontFamily || 'Inter';
    
    if (fontSize < 8 || fontSize > 72) return false;
    if (!['Inter', 'Roboto', 'Arial', 'Georgia'].includes(fontFamily)) return false;
    
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = config.strokeColor;
    this.ctx.fillText(text, x, y);
    
    return true;
  }
}

// Path smoothing utilities
export class PathSmoother {
  static smoothPath(points: Array<{ x: number; y: number }>, smoothing: number = 0.5): Array<{ x: number; y: number }> {
    if (points.length < 3 || smoothing <= 0) return points;
    
    const smoothedPoints: Array<{ x: number; y: number }> = [points[0]];
    
    for (let i = 1; i < points.length - 1; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      
      const smoothedX = currentPoint.x + (prevPoint.x + nextPoint.x - 2 * currentPoint.x) * smoothing;
      const smoothedY = currentPoint.y + (prevPoint.y + nextPoint.y - 2 * currentPoint.y) * smoothing;
      
      smoothedPoints.push({ x: smoothedX, y: smoothedY });
    }
    
    smoothedPoints.push(points[points.length - 1]);
    return smoothedPoints;
  }

  static optimizePath(points: Array<{ x: number; y: number }>, tolerance: number = 2): Array<{ x: number; y: number }> {
    if (points.length <= 2) return points;
    
    const optimized: Array<{ x: number; y: number }> = [points[0]];
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = optimized[optimized.length - 1];
      const current = points[i];
      const next = points[i + 1];
      
      // Calculate distance from current point to line between prev and next
      const distance = this.pointToLineDistance(current, prev, next);
      
      if (distance > tolerance) {
        optimized.push(current);
      }
    }
    
    optimized.push(points[points.length - 1]);
    return optimized;
  }

  private static pointToLineDistance(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
