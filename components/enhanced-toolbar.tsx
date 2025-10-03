"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
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
  onClearCanvas: () => void;
  isDarkMode?: boolean;
  buttonSize?: 'small' | 'medium' | 'large';
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
  onClearCanvas,
  isDarkMode = true, // eslint-disable-line @typescript-eslint/no-unused-vars
  buttonSize = 'medium'
}: EnhancedToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [showSizeSlider, setShowSizeSlider] = useState(false);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);

  // Predefined colors for quick selection
  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280',
    '#000000', '#ffffff', '#dc2626', '#059669', '#7c3aed'
  ];
  
  // Preset sizes for quick selection
  const presetSizes = [2, 4, 8, 12, 16, 24, 32];
  
  // Preset opacities for quick selection
  const presetOpacities = [0.3, 0.5, 0.7, 0.9, 1.0];  // Shape tools grouped
  const shapeTools: Array<{ tool: DrawingTool; icon: React.ReactNode; label: string }> = [
    { tool: 'rectangle', icon: <Square size={16} />, label: 'Rectangle' },
    { tool: 'circle', icon: <Circle size={16} />, label: 'Circle' },
    { tool: 'triangle', icon: <Triangle size={16} />, label: 'Triangle' },
    { tool: 'arrow', icon: <ArrowRight size={16} />, label: 'Arrow' },
    { tool: 'line', icon: <Minus size={16} />, label: 'Line' }
  ];

  // Text tools grouped
  const textTools: Array<{ tool: DrawingTool; icon: React.ReactNode; label: string }> = [
    { tool: 'text', icon: <Type size={16} />, label: 'Text' },
    { tool: 'sticky-note', icon: <StickyNote size={16} />, label: 'Sticky Note' }
  ];

  // State for dropdown menus
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showPenMenu, setShowPenMenu] = useState(false);
  
  // Refs for dropdown containers
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const textMenuRef = useRef<HTMLDivElement>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);

  // Get current shape icon based on selected tool
  const getCurrentShapeIcon = () => {
    const currentShapeTool = shapeTools.find(shape => shape.tool === toolConfig.tool);
    return currentShapeTool ? currentShapeTool.icon : <Square size={18} />;
  };

  // Get current text icon based on selected tool
  const getCurrentTextIcon = () => {
    const currentTextTool = textTools.find(text => text.tool === toolConfig.tool);
    return currentTextTool ? currentTextTool.icon : <Type size={18} />;
  };

  // Get current brush icon based on selected brush type
  const getCurrentBrushIcon = () => {
    const currentBrushType = brushTypes.find(brush => brush.type === toolConfig.brushType);
    return currentBrushType ? currentBrushType.icon : <Pen size={16} />;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(event.target as Node)) {
        setShowShapeMenu(false);
      }
      if (textMenuRef.current && !textMenuRef.current.contains(event.target as Node)) {
        setShowTextMenu(false);
      }
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target as Node)) {
        setShowStyleMenu(false);
      }
      if (penMenuRef.current && !penMenuRef.current.contains(event.target as Node)) {
        setShowPenMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Prevent scroll on toolbar when dropdowns are open
    const preventScroll = (e: Event) => {
      if (showStyleMenu || showShapeMenu || showTextMenu || showPenMenu) {
        const target = e.target as HTMLElement;
        // Allow scrolling within dropdown menus
        if (
          (styleMenuRef.current && styleMenuRef.current.contains(target)) ||
          (shapeMenuRef.current && shapeMenuRef.current.contains(target)) ||
          (textMenuRef.current && textMenuRef.current.contains(target)) ||
          (penMenuRef.current && penMenuRef.current.contains(target))
        ) {
          return;
        }
      }
    };
    
    document.addEventListener('scroll', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', preventScroll);
    };
  }, [showShapeMenu, showTextMenu, showStyleMenu, showPenMenu]);
  
  // Prevent scroll when style menu opens
  useEffect(() => {
    if (showStyleMenu && styleMenuRef.current) {
      // Smooth scroll to show the style dropdown with all its content
      setTimeout(() => {
        const dropdown = styleMenuRef.current?.querySelector('.style-dropdown-content');
        if (dropdown) {
          // Get the toolbar container (parent with overflow)
          const toolbarContainer = styleMenuRef.current?.closest('.overflow-y-auto');
          
          if (toolbarContainer) {
            // Calculate the position to scroll to
            const dropdownRect = dropdown.getBoundingClientRect();
            const containerRect = toolbarContainer.getBoundingClientRect();
            
            // Scroll the container to show the full dropdown
            const scrollTop = toolbarContainer.scrollTop + (dropdownRect.bottom - containerRect.bottom) + 20; // 20px padding
            
            toolbarContainer.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          }
        }
      }, 50);
    }
  }, [showStyleMenu]);

  // Brush types configuration (removed eraser as it's a separate tool)
  const brushTypes: Array<{ type: BrushType; icon: React.ReactNode; label: string }> = [
    { type: 'pen', icon: <Pen size={16} />, label: 'Pen' },
    { type: 'marker', icon: <Paintbrush size={16} />, label: 'Marker' },
    { type: 'highlighter', icon: <Highlighter size={16} />, label: 'Highlighter' }
  ];

  const handleAddLayer = () => {
    if (newLayerName.trim()) {
      onLayerAdd(newLayerName.trim());
      setNewLayerName('');
    }
  };
  
  // Get button size classes based on setting
  const getButtonSizeClasses = () => {
    switch (buttonSize) {
      case 'small':
        return { height: 'h-16', iconSize: 16, fontSize: 'text-xs' };
      case 'large':
        return { height: 'h-24', iconSize: 20, fontSize: 'text-sm' };
      case 'medium':
      default:
        return { height: 'h-20', iconSize: 18, fontSize: 'text-xs' };
    }
  };
  
  const btnSize = getButtonSizeClasses();
  const sortedLayers = [...layers].sort((a, b) => b.z_index - a.z_index);
  return (
    <div className="flex flex-col gap-6 p-4 bg-background border-r border-border w-full h-full overflow-y-auto">
      {/* Drawing Tools Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <h3 className="text-sm font-semibold text-foreground">Drawing Tools</h3>
        </div>
        
        {/* Tool Grid - Unified Layout */}
        <div className="grid grid-cols-2 gap-3">
          {/* Row 1: Select and Pen */}
          <Button
            variant={toolConfig.tool === 'select' ? "default" : "outline"}
            size="default"
            onClick={() => onToolConfigChange({ tool: 'select' })}
            className={`flex flex-col items-center gap-2 ${btnSize.height} p-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
              toolConfig.tool === 'select' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105' 
                : 'hover:bg-accent hover:scale-105 hover:shadow-md'
            }`}
            title="Select"
          >
            <div className="flex-shrink-0 text-current transition-transform group-hover:scale-110">
              <MousePointer size={btnSize.iconSize} />
            </div>
            <span className={`${btnSize.fontSize} font-medium leading-tight`}>Select</span>
            {toolConfig.tool === 'select' && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            )}
          </Button>

          <div className="relative" ref={penMenuRef}>
            <Button
              variant={toolConfig.tool === 'pen' ? "default" : "outline"}
              size="default"
              onClick={() => setShowPenMenu(!showPenMenu)}
              className={`flex flex-col items-center gap-2 ${btnSize.height} p-3 rounded-xl transition-all duration-300 group relative overflow-hidden w-full ${
                toolConfig.tool === 'pen'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105' 
                  : 'hover:bg-accent hover:scale-105 hover:shadow-md'
              }`}
              title="Pen Tools"
            >
              <div className="flex-shrink-0 text-current transition-transform group-hover:scale-110">
                {getCurrentBrushIcon()}
              </div>
              <span className={`${btnSize.fontSize} font-medium leading-tight`}>Pen</span>
              {toolConfig.tool === 'pen' && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              )}
            </Button>
            
            {showPenMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 gap-1">
                  {brushTypes.map(({ type, icon, label }) => (
                    <Button
                      key={type}
                      variant={toolConfig.brushType === type && toolConfig.tool === 'pen' ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        onToolConfigChange({ tool: 'pen', brushType: type });
                        setShowPenMenu(false);
                      }}
                      className="flex items-center gap-3 justify-start h-10 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      <div className="flex-shrink-0 text-current">
                        {icon}
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Shapes and Text */}
          <div className="relative" ref={shapeMenuRef}>
            <Button
              variant={shapeTools.some(shape => shape.tool === toolConfig.tool) ? "default" : "outline"}
              size="default"
              onClick={() => setShowShapeMenu(!showShapeMenu)}
              className={`flex flex-col items-center gap-2 ${btnSize.height} p-3 rounded-xl transition-all duration-300 group relative overflow-hidden w-full ${
                shapeTools.some(shape => shape.tool === toolConfig.tool)
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105' 
                  : 'hover:bg-accent hover:scale-105 hover:shadow-md'
              }`}
              title="Shapes"
            >
              <div className="flex-shrink-0 text-current transition-transform group-hover:scale-110">
                {getCurrentShapeIcon()}
              </div>
              <span className={`${btnSize.fontSize} font-medium leading-tight`}>Shapes</span>
              {shapeTools.some(shape => shape.tool === toolConfig.tool) && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              )}
            </Button>
            
            {showShapeMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 gap-1">
                  {shapeTools.map(({ tool, icon, label }) => (
                    <Button
                      key={tool}
                      variant={toolConfig.tool === tool ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        onToolConfigChange({ tool });
                        setShowShapeMenu(false);
                      }}
                      className="flex items-center gap-3 justify-start h-10 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      <div className="flex-shrink-0 text-current">
                        {icon}
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={textMenuRef}>
            <Button
              variant={textTools.some(text => text.tool === toolConfig.tool) ? "default" : "outline"}
              size="default"
              onClick={() => setShowTextMenu(!showTextMenu)}
              className={`flex flex-col items-center gap-2 ${btnSize.height} p-3 rounded-xl transition-all duration-300 group relative overflow-hidden w-full ${
                textTools.some(text => text.tool === toolConfig.tool)
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105' 
                  : 'hover:bg-accent hover:scale-105 hover:shadow-md'
              }`}
              title="Text"
            >
              <div className="flex-shrink-0 text-current transition-transform group-hover:scale-110">
                {getCurrentTextIcon()}
              </div>
              <span className={`${btnSize.fontSize} font-medium leading-tight`}>Text</span>
              {textTools.some(text => text.tool === toolConfig.tool) && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              )}
            </Button>
            
            {showTextMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 gap-1">
                  {textTools.map(({ tool, icon, label }) => (
                    <Button
                      key={tool}
                      variant={toolConfig.tool === tool ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        onToolConfigChange({ tool });
                        setShowTextMenu(false);
                      }}
                      className="flex items-center gap-3 justify-start h-10 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      <div className="flex-shrink-0 text-current">
                        {icon}
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Standalone Tools */}
        <div className="flex justify-center">
          <Button
            variant={toolConfig.tool === 'eraser' ? "default" : "outline"}
            size="default"
            onClick={() => onToolConfigChange({ tool: 'eraser' })}
            className={`flex flex-col items-center gap-2 ${btnSize.height} p-3 rounded-xl transition-all duration-300 group relative overflow-hidden w-32 ${
              toolConfig.tool === 'eraser' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105' 
                : 'hover:bg-accent hover:scale-105 hover:shadow-md'
            }`}
            title="Eraser"
          >
            <div className="flex-shrink-0 text-current transition-transform group-hover:scale-110">
              <Eraser size={btnSize.iconSize} />
            </div>
            <span className={`${btnSize.fontSize} font-medium leading-tight`}>Eraser</span>
            {toolConfig.tool === 'eraser' && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            )}
          </Button>
        </div>
      </div>

      {/* Tool Configuration */}
      <div className="space-y-4">
        {/* Style Controls Dropdown */}
        <div className="space-y-3">
          <div className="relative" ref={styleMenuRef}>
            <Button
              variant="outline"
              size="default"
              onClick={(e) => {
                e.preventDefault();
                setShowStyleMenu(!showStyleMenu);
              }}
              className="flex items-center justify-between w-full h-16 p-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md"
              title="Style Controls"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg border-2 border-border shadow-sm relative overflow-hidden"
                  style={{ backgroundColor: toolConfig.strokeColor }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Style</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{toolConfig.brushSize}px</span>
                    <span>•</span>
                    <span>{Math.round(toolConfig.opacity * 100)}%</span>
                  </div>
                </div>
              </div>
              <div className="text-xs">
                {showStyleMenu ? '−' : '+'}
              </div>
            </Button>
            
            {showStyleMenu && (
              <div 
                className="absolute top-full left-0 mt-2 w-full bg-background border border-border rounded-xl shadow-lg z-50 p-4 style-dropdown-content animate-in fade-in slide-in-from-top-2 duration-300"
                style={{ 
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
              >
                <div className="space-y-4">
                  {/* Size Control */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Size</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {toolConfig.brushSize}px
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSizeSlider(!showSizeSlider)}
                          className="h-6 w-6 p-0 text-xs hover:scale-110 transition-all"
                          title={showSizeSlider ? "Hide slider" : "Show slider"}
                        >
                          {showSizeSlider ? '−' : '+'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preset Size Bubbles */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {presetSizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => onToolConfigChange({ brushSize: size })}
                          className={`rounded-full border-2 transition-all duration-300 hover:scale-110 hover:shadow-md relative ${
                            toolConfig.brushSize === size
                              ? 'border-primary bg-primary/20 shadow-lg shadow-primary/25'
                              : 'border-border hover:border-primary/50 bg-background'
                          }`}
                          style={{
                            width: `${Math.max(28, size + 16)}px`,
                            height: `${Math.max(28, size + 16)}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={`${size}px`}
                        >
                          <div
                            className="rounded-full bg-foreground"
                            style={{
                              width: `${Math.min(size, 20)}px`,
                              height: `${Math.min(size, 20)}px`
                            }}
                          />
                        </button>
                      ))}
                    </div>
                    
                    {/* Optional Slider */}
                    {showSizeSlider && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <Slider
                          value={[toolConfig.brushSize]}
                          onValueChange={(value: number[]) => onToolConfigChange({ brushSize: value[0] })}
                          min={1}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Opacity Control */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Opacity</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {Math.round(toolConfig.opacity * 100)}%
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowOpacitySlider(!showOpacitySlider)}
                          className="h-6 w-6 p-0 text-xs hover:scale-110 transition-all"
                          title={showOpacitySlider ? "Hide slider" : "Show slider"}
                        >
                          {showOpacitySlider ? '−' : '+'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preset Opacity Bubbles */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {presetOpacities.map((opacity) => (
                        <button
                          key={opacity}
                          onClick={() => onToolConfigChange({ opacity })}
                          className={`w-10 h-10 rounded-full border-2 transition-all duration-300 hover:scale-110 hover:shadow-md relative overflow-hidden ${
                            Math.abs(toolConfig.opacity - opacity) < 0.01
                              ? 'border-primary shadow-lg shadow-primary/25'
                              : 'border-border hover:border-primary/50'
                          }`}
                          title={`${Math.round(opacity * 100)}%`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="w-6 h-6 rounded-full bg-foreground"
                              style={{ opacity }}
                            />
                          </div>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground mix-blend-difference">
                            {Math.round(opacity * 100)}
                          </span>
                        </button>
                      ))}
                    </div>
                    
                    {/* Optional Slider */}
                    {showOpacitySlider && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <Slider
                          value={[toolConfig.opacity]}
                          onValueChange={(value: number[]) => onToolConfigChange({ opacity: value[0] })}
                          min={0.1}
                          max={1}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Color Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Stroke Color</label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden"
                        style={{ backgroundColor: toolConfig.strokeColor }}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                      </div>
                      <Input
                        type="text"
                        value={toolConfig.strokeColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            onToolConfigChange({ strokeColor: value });
                          }
                        }}
                        className="flex-1 h-10 font-mono text-sm"
                        placeholder="#3b82f6"
                      />
                    </div>
                    
                    {showColorPicker && (
                      <div className="grid grid-cols-5 gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                        {predefinedColors.map((color) => (
                          <div
                            key={color}
                            className="w-6 h-6 rounded-md cursor-pointer border-2 border-border hover:scale-110 transition-all duration-300 hover:border-ring shadow-sm hover:shadow-md relative overflow-hidden"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              onToolConfigChange({ strokeColor: color });
                              setShowColorPicker(false);
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fill Color for Shapes */}
                    {['rectangle', 'circle', 'ellipse', 'triangle'].includes(toolConfig.tool) && (
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center gap-3">
                          <Button
                            variant={toolConfig.fillColor ? "default" : "outline"}
                            size="sm"
                            onClick={() => onToolConfigChange({ fillColor: toolConfig.fillColor ? undefined : toolConfig.strokeColor })}
                            className="hover:scale-105 transition-all duration-300 rounded-lg"
                          >
                            {toolConfig.fillColor ? 'Remove Fill' : 'Add Fill'}
                          </Button>
                          {toolConfig.fillColor && (
                            <div
                              className="w-6 h-6 rounded-md border-2 border-border cursor-pointer hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden"
                              style={{ backgroundColor: toolConfig.fillColor }}
                              onClick={() => setShowColorPicker(!showColorPicker)}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clear Canvas Button */}
        <div className="pt-4 border-t border-border/50">
          <Button
            variant="destructive"
            size="default"
            onClick={onClearCanvas}
            className="w-full hover:scale-105 transition-all duration-300 rounded-xl h-12 gap-3 shadow-md hover:shadow-lg"
          >
            <Trash2 className="h-4 w-4" />
            Clear Canvas
          </Button>
        </div>
      </div>

      {/* Layers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary"></div>
            <h3 className="text-sm font-semibold text-foreground">Layers</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="hover:scale-105 transition-all duration-300 rounded-lg h-8 w-8 p-0"
          >
            <span className="text-xs">{showLayerPanel ? '−' : '+'}</span>
          </Button>
        </div>

        {showLayerPanel && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
            {/* Add New Layer */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                placeholder="New layer name"
                className="flex-1 text-sm h-10 rounded-lg"
                maxLength={50}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLayer()}
              />
              <Button
                size="sm"
                onClick={handleAddLayer}
                disabled={!newLayerName.trim()}
                className="h-10 w-10 p-0 rounded-lg hover:scale-105 transition-all duration-300"
              >
                <Plus size={16} />
              </Button>
            </div>

            {/* Layer List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {sortedLayers.map((layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 group ${
                    layer.id === activeLayerId 
                      ? 'border-primary bg-primary/10 shadow-md scale-105' 
                      : 'border-border hover:bg-accent/50 hover:scale-105 hover:shadow-sm'
                  }`}
                >
                  {/* Layer Name */}
                  <span
                    className="flex-1 text-sm cursor-pointer truncate font-medium transition-colors group-hover:text-foreground"
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
                      className="p-1.5 h-7 w-7 rounded-md hover:scale-110 transition-all duration-300"
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>

                    {/* Lock Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLayerToggleLock(layer.id)}
                      className="p-1.5 h-7 w-7 rounded-md hover:scale-110 transition-all duration-300"
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </Button>

                    {/* Move Up */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLayerMove(layer.id, 'up')}
                      className="p-1.5 h-7 w-7 rounded-md hover:scale-110 transition-all duration-300"
                      disabled={layer.z_index === Math.max(...layers.map(l => l.z_index))}
                      title="Move layer up"
                    >
                      <MoveUp size={14} />
                    </Button>

                    {/* Move Down */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLayerMove(layer.id, 'down')}
                      className="p-1.5 h-7 w-7 rounded-md hover:scale-110 transition-all duration-300"
                      disabled={layer.z_index === Math.min(...layers.map(l => l.z_index))}
                      title="Move layer down"
                    >
                      <MoveDown size={14} />
                    </Button>

                    {/* Delete Layer */}
                    {!['Background', 'Routes', 'Destinations'].includes(layer.name) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLayerRemove(layer.id)}
                        className="p-1.5 h-7 w-7 rounded-md hover:scale-110 transition-all duration-300 text-destructive hover:text-destructive"
                        title="Delete layer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Layer Opacity for Active Layer */}
            {activeLayerId && (
              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground"></div>
                    <label className="text-sm font-medium text-foreground">Layer Opacity</label>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {Math.round((layers.find(l => l.id === activeLayerId)?.opacity || 1) * 100)}%
                  </span>
                </div>
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
      </div>
    </div>
  );
}
