"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { 
  Circle, 
  Square, 
  Triangle, 
  ArrowRight, 
  Minus, 
  Type,
  Pen,
  Paintbrush,
  Highlighter,
  Eraser,
  MousePointer,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  StickyNote
} from 'lucide-react';
import { DrawingTool, BrushType, ToolConfig } from '../lib/drawing-tools';
import { LayerState } from '../lib/layer-management';

interface EnhancedToolbarProps {
  toolConfig: ToolConfig;
  onToolConfigChange: (updates: Partial<ToolConfig>) => void;
  layers: LayerState[];
  activeLayerId: string | null;
  onLayerSelect: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerAdd: (name: string) => void;
  onLayerRemove: (layerId: string) => void;
  onLayerMove: (layerId: string, direction: 'up' | 'down') => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  isDarkMode?: boolean;
}

export function EnhancedToolbar({
  toolConfig,
  onToolConfigChange,
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerAdd,
  onLayerRemove,
  onLayerMove,
  onLayerOpacityChange,
  isDarkMode = true // eslint-disable-line @typescript-eslint/no-unused-vars
}: EnhancedToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');

  // Predefined colors for quick selection
  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280',
    '#000000', '#ffffff', '#dc2626', '#059669', '#7c3aed'
  ];
  // Drawing tools configuration
  const drawingTools: Array<{ tool: DrawingTool; icon: React.ReactNode; label: string }> = [
    { tool: 'select', icon: <MousePointer size={16} />, label: 'Select' },
    { tool: 'pen', icon: <Pen size={16} />, label: 'Pen' },
    { tool: 'line', icon: <Minus size={16} />, label: 'Line' },
    { tool: 'rectangle', icon: <Square size={16} />, label: 'Rectangle' },
    { tool: 'circle', icon: <Circle size={16} />, label: 'Circle' },
    { tool: 'triangle', icon: <Triangle size={16} />, label: 'Triangle' },
    { tool: 'arrow', icon: <ArrowRight size={16} />, label: 'Arrow' },
    { tool: 'text', icon: <Type size={16} />, label: 'Text' },
    { tool: 'sticky-note', icon: <StickyNote size={16} />, label: 'Sticky Note' },
    { tool: 'eraser', icon: <Eraser size={16} />, label: 'Eraser' }
  ];

  // Brush types configuration
  const brushTypes: Array<{ type: BrushType; icon: React.ReactNode; label: string }> = [
    { type: 'pen', icon: <Pen size={16} />, label: 'Pen' },
    { type: 'marker', icon: <Paintbrush size={16} />, label: 'Marker' },
    { type: 'highlighter', icon: <Highlighter size={16} />, label: 'Highlighter' },
    { type: 'eraser', icon: <Eraser size={16} />, label: 'Eraser' }
  ];

  const handleAddLayer = () => {
    if (newLayerName.trim()) {
      onLayerAdd(newLayerName.trim());
      setNewLayerName('');
    }
  };

  const sortedLayers = [...layers].sort((a, b) => b.z_index - a.z_index);

  return (
    <div className="flex flex-col space-y-4 p-4 bg-background border-r border-border w-80 h-full overflow-y-auto">
      {/* Drawing Tools Section */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Drawing Tools</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {drawingTools.map(({ tool, icon, label }) => (
            <Button
              key={tool}
              variant={toolConfig.tool === tool ? "default" : "outline"}
              size="sm"
              onClick={() => onToolConfigChange({ tool })}
              className="flex flex-col items-center gap-1 h-12"
              title={label}
            >
              {icon}
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>

        {/* Brush Type Selection */}
        {toolConfig.tool === 'pen' && (
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Brush Type</label>
            <div className="grid grid-cols-2 gap-2">
              {brushTypes.map(({ type, icon, label }) => (
                <Button
                  key={type}
                  variant={toolConfig.brushType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToolConfigChange({ brushType: type })}
                  className="flex items-center gap-2"
                >
                  {icon}
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Brush Size */}        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Size: {toolConfig.brushSize}px
          </label>
          <Slider
            value={[toolConfig.brushSize]}
            onValueChange={(value: number[]) => onToolConfigChange({ brushSize: value[0] })}
            min={1}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Opacity */}        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Opacity: {Math.round(toolConfig.opacity * 100)}%
          </label>
          <Slider
            value={[toolConfig.opacity]}
            onValueChange={(value: number[]) => onToolConfigChange({ opacity: value[0] })}
            min={0.1}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Color Selection */}        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Stroke Color</label>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded border-2 border-border cursor-pointer"
              style={{ backgroundColor: toolConfig.strokeColor }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            <Input
              type="text"
              value={toolConfig.strokeColor}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  onToolConfigChange({ strokeColor: value });
                }
              }}
              className="flex-1 text-xs"
              placeholder="#3b82f6"
            />
          </div>
          
          {showColorPicker && (
            <div className="grid grid-cols-5 gap-1 mb-2">              {predefinedColors.map((color) => (
                <div
                  key={color}
                  className="w-6 h-6 rounded cursor-pointer border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onToolConfigChange({ strokeColor: color });
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Fill Color for Shapes */}
        {['rectangle', 'circle', 'ellipse', 'triangle'].includes(toolConfig.tool) && (          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Fill Color</label>
            <div className="flex items-center gap-2">
              <Button
                variant={toolConfig.fillColor ? "default" : "outline"}
                size="sm"
                onClick={() => onToolConfigChange({ fillColor: toolConfig.fillColor ? undefined : toolConfig.strokeColor })}
              >
                {toolConfig.fillColor ? 'Remove Fill' : 'Add Fill'}
              </Button>
              {toolConfig.fillColor && (
                <div
                  className="w-6 h-6 rounded border border-border cursor-pointer"
                  style={{ backgroundColor: toolConfig.fillColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Layers Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Layers</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
          >
            {showLayerPanel ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showLayerPanel && (
          <div className="space-y-2">
            {/* Add New Layer */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                placeholder="Layer name"
                className="flex-1 text-xs"
                maxLength={50}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLayer()}
              />
              <Button
                size="sm"
                onClick={handleAddLayer}
                disabled={!newLayerName.trim()}
              >
                <Plus size={12} />
              </Button>
            </div>

            {/* Layer List */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {sortedLayers.map((layer) => (
                <div
                  key={layer.id}                  className={`flex items-center gap-2 p-2 rounded border ${
                    layer.id === activeLayerId 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  {/* Layer Name */}
                  <span
                    className="flex-1 text-xs cursor-pointer truncate"
                    onClick={() => onLayerSelect(layer.id)}
                  >
                    {layer.name}
                  </span>

                  {/* Layer Controls */}
                  <div className="flex items-center gap-1">
                    {/* Visibility Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLayerToggleVisibility(layer.id)}
                      className="p-1 h-6 w-6"
                    >
                      {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </Button>

                    {/* Lock Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLayerToggleLock(layer.id)}
                      className="p-1 h-6 w-6"
                    >
                      {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </Button>

                    {/* Move Up */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLayerMove(layer.id, 'up')}
                      className="p-1 h-6 w-6"
                      disabled={layer.z_index === Math.max(...layers.map(l => l.z_index))}
                    >
                      <MoveUp size={12} />
                    </Button>

                    {/* Move Down */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLayerMove(layer.id, 'down')}
                      className="p-1 h-6 w-6"
                      disabled={layer.z_index === Math.min(...layers.map(l => l.z_index))}
                    >
                      <MoveDown size={12} />
                    </Button>

                    {/* Delete Layer */}
                    {!['Background', 'Routes', 'Destinations'].includes(layer.name) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLayerRemove(layer.id)}
                        className="p-1 h-6 w-6 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Layer Opacity for Active Layer */}
            {activeLayerId && (              <div className="pt-2 border-t border-border">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Layer Opacity: {Math.round((layers.find(l => l.id === activeLayerId)?.opacity || 1) * 100)}%
                </label>
                <Slider
                  value={[layers.find(l => l.id === activeLayerId)?.opacity || 1]}
                  onValueChange={(value: number[]) => activeLayerId && onLayerOpacityChange(activeLayerId, value[0])}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
