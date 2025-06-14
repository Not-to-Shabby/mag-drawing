# Excalidraw-Like Features Implementation Plan
**Security-First Approach**

## 🎯 Executive Summary

This plan outlines the implementation of advanced drawing and collaboration features similar to Excalidraw, while maintaining enterprise-grade security standards. All features will be implemented with defense-in-depth security principles.

---

## 🏗️ Phase 1: Core Drawing Engine Enhancement (Week 1-2)

### 1.1 Advanced Shape Tools
**Features to Add:**
- Rectangle, Circle, Ellipse, Triangle, Arrow, Line tools
- Text annotations with font selection
- Sticky notes/post-it functionality
- Shape selection and manipulation (resize, rotate, move)

**Security Considerations:**
```typescript
// Enhanced shape validation schema
const shapeSchema = z.object({
  type: z.enum(['rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'line', 'text', 'sticky']),
  x: z.number().min(-1000).max(20000),
  y: z.number().min(-1000).max(20000),
  width: z.number().min(1).max(5000),
  height: z.number().min(1).max(5000),
  rotation: z.number().min(-360).max(360),
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  fillColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeWidth: z.number().min(1).max(20),
  text: z.string().max(500).regex(/^[a-zA-Z0-9\s\-_.,!?\n\r()[\]]*$/).optional(),
  fontSize: z.number().min(8).max(72).optional(),
  fontFamily: z.enum(['Inter', 'Roboto', 'Arial', 'Georgia']).optional()
});
```

**Database Schema Updates:**
```sql
-- New shapes table with security constraints
CREATE TABLE shapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  shape_type VARCHAR(20) NOT NULL CHECK (shape_type IN ('rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'line', 'text', 'sticky')),
  x_position FLOAT NOT NULL CHECK (x_position >= -1000 AND x_position <= 20000),
  y_position FLOAT NOT NULL CHECK (y_position >= -1000 AND y_position <= 20000),
  width FLOAT CHECK (width >= 1 AND width <= 5000),
  height FLOAT CHECK (height >= 1 AND height <= 5000),
  rotation FLOAT DEFAULT 0 CHECK (rotation >= -360 AND rotation <= 360),
  stroke_color VARCHAR(7) DEFAULT '#000000' CHECK (stroke_color ~ '^#[0-9A-Fa-f]{6}$'),
  fill_color VARCHAR(7) CHECK (fill_color IS NULL OR fill_color ~ '^#[0-9A-Fa-f]{6}$'),
  stroke_width INTEGER DEFAULT 2 CHECK (stroke_width >= 1 AND stroke_width <= 20),
  text_content TEXT CHECK (char_length(text_content) <= 500),
  font_size INTEGER CHECK (font_size >= 8 AND font_size <= 72),
  font_family VARCHAR(20) CHECK (font_family IN ('Inter', 'Roboto', 'Arial', 'Georgia')),
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE shapes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Token-based shape access" ON shapes FOR ALL USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = shapes.plan_id)
);
```

### 1.2 Layer Management System
**Features:**
- Z-index based layering
- Layer visibility toggle
- Layer locking mechanism
- Layer grouping

**Security Implementation:**
- Maximum 100 layers per plan (prevent DoS)
- Layer name validation (max 50 chars, alphanumeric only)
- Rate limiting on layer operations (10 per minute)

---

## 🏗️ Phase 2: Real-Time Collaboration Engine (Week 3-4)

### 2.1 WebSocket Integration with Supabase Realtime
**Features:**
- Real-time cursor tracking
- Live drawing synchronization  
- User presence indicators
- Conflict resolution system

**Security Measures:**
```typescript
// WebSocket message validation
const realtimeMessageSchema = z.object({
  type: z.enum(['cursor', 'drawing', 'shape', 'user_join', 'user_leave']),
  planToken: z.string().regex(/^[a-zA-Z0-9\-_]{12,64}$/),
  userId: z.string().uuid().optional(), // Anonymous users get generated UUID
  data: z.record(z.any()).refine(data => {
    // Validate data size to prevent large payloads
    return JSON.stringify(data).length <= 10000;
  }),
  timestamp: z.number().int().positive()
});

// Rate limiting for WebSocket messages
const wsRateLimit = {
  cursor: { limit: 60, window: 60000 }, // 60 per minute
  drawing: { limit: 30, window: 60000 }, // 30 per minute
  shape: { limit: 20, window: 60000 }    // 20 per minute
};
```

**Database Schema for User Sessions:**
```sql
-- User sessions for collaboration tracking
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  user_color VARCHAR(7) NOT NULL CHECK (user_color ~ '^#[0-9A-Fa-f]{6}$'),
  cursor_x FLOAT,
  cursor_y FLOAT,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-cleanup inactive sessions (>30 minutes)
CREATE INDEX idx_user_sessions_last_seen ON user_sessions(last_seen);
```

### 2.2 Operational Transform System
**Features:**
- Conflict-free collaborative editing
- Operation ordering and transformation
- Undo/Redo with collaborative awareness

**Security Implementation:**
- Operation signature validation
- Maximum operation size limits
- Historical operation pruning (keep last 100 operations)

---

## 🏗️ Phase 3: Advanced Drawing Features (Week 5-6)

### 3.1 Freehand Drawing Enhancements
**Features:**
- Pressure-sensitive drawing (if supported)
- Brush types (pen, marker, highlighter)
- Stroke smoothing and optimization
- Eraser tool with selective erasing

**Security Considerations:**
```typescript
// Enhanced drawing path validation
const advancedDrawingSchema = z.object({
  pathData: z.array(z.object({
    x: z.number().min(-1000).max(20000),
    y: z.number().min(-1000).max(20000),
    pressure: z.number().min(0).max(1).optional(),
    timestamp: z.number().int().positive()
  })).max(10000), // Limit path complexity
  brushType: z.enum(['pen', 'marker', 'highlighter', 'eraser']),
  brushSize: z.number().min(1).max(50),
  opacity: z.number().min(0.1).max(1),
  smoothing: z.number().min(0).max(1)
});
```

### 3.2 Image and File Handling
**Features:**
- Image upload and embedding
- SVG import support
- Screenshot/export functionality
- File drag-and-drop

**Critical Security Measures:**
```typescript
// Comprehensive file validation
const fileUploadSchema = z.object({
  filename: z.string()
    .max(100)
    .regex(/^[a-zA-Z0-9\-_.\s]+\.(jpg|jpeg|png|svg|webp)$/i),
  size: z.number().max(5 * 1024 * 1024), // 5MB max
  mimeType: z.enum([
    'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'
  ])
});

// File processing security
const fileSecurityMeasures = {
  virusScanning: true,
  metadataStripping: true,
  imageReencoding: true,  // Prevent malicious embedded content
  svgSanitization: true,  // Remove scripts from SVG
  sizeOptimization: true, // Compress large images
  watermarking: false     // Optional: add subtle watermark
};
```

**File Storage Schema:**
```sql
-- Secure file storage tracking
CREATE TABLE plan_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size <= 5242880), -- 5MB
  mime_type VARCHAR(50) NOT NULL,
  storage_path TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL, -- SHA-256 hash
  is_processed BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File access policies
ALTER TABLE plan_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Token-based file access" ON plan_files FOR ALL USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_files.plan_id)
);
```

---

## 🏗️ Phase 4: UI/UX Enhancements (Week 7-8)

### 4.1 Advanced Toolbar and Panels
**Features:**
- Floating toolbar with tool categories
- Property panel for selected objects
- Color palette with custom colors
- Zoom and pan controls
- Grid and snap-to-grid functionality

**Security Implementation:**
- UI state validation to prevent XSS
- Sanitized user preferences storage
- Local storage encryption for sensitive data

### 4.2 Keyboard Shortcuts and Accessibility
**Features:**
- Comprehensive keyboard shortcuts
- Screen reader compatibility
- High contrast mode
- Keyboard navigation for all tools

**Security Considerations:**
- Keyboard shortcut injection prevention
- Input sanitization for accessibility features
- ARIA label validation

---

## 🏗️ Phase 5: Export and Sharing Features (Week 9-10)

### 5.1 Export Capabilities
**Features:**
- PNG/JPEG export with custom resolution
- SVG export with embedded fonts
- PDF export for printing
- JSON export for backup/import

**Security Measures:**
```typescript
// Export security validation
const exportSchema = z.object({
  format: z.enum(['png', 'jpeg', 'svg', 'pdf', 'json']),
  quality: z.number().min(0.1).max(1).optional(),
  resolution: z.object({
    width: z.number().min(100).max(8000),
    height: z.number().min(100).max(8000)
  }),
  includeMetadata: z.boolean().default(false)
});

// Server-side export processing (prevent client-side exploitation)
const exportSecurityMeasures = {
  serverSideRendering: true,
  outputSanitization: true,
  memoryLimits: true,
  timeoutProtection: true,
  rateLimiting: { limit: 5, window: 300000 } // 5 exports per 5 minutes
};
```

### 5.2 Advanced Sharing Options
**Features:**
- Password-protected plans
- Expiring share links
- View-only sharing mode
- Embed code generation

**Security Implementation:**
```sql
-- Enhanced sharing security
ALTER TABLE plans ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE plans ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE plans ADD COLUMN view_only BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN max_collaborators INTEGER DEFAULT 10;
ALTER TABLE plans ADD COLUMN embed_allowed BOOLEAN DEFAULT false;

-- Access logging
CREATE TABLE plan_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  access_type VARCHAR(20) CHECK (access_type IN ('view', 'edit', 'export', 'embed')),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🏗️ Phase 6: Enhanced Travel-Specific Features (Week 11-14)

### 6.1 Drawing & Design Enhancements

**Advanced Drawing Tools Implementation:**
```typescript
// Enhanced drawing tool state management with security validation
const drawingToolSchema = z.object({
  tool: z.enum(['pen', 'line', 'rectangle', 'circle', 'arrow', 'text']),
  brushSize: z.number().min(1).max(50),
  opacity: z.number().min(0.1).max(1),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']),
  fillStyle: z.enum(['none', 'solid', 'pattern']).optional()
});

// Add to whiteboard-planner.tsx with security measures
const [drawingTool, setDrawingTool] = useState<'pen' | 'line' | 'rectangle' | 'circle' | 'arrow'>('pen');
const [brushSize, setBrushSize] = useState(2);
const [opacity, setOpacity] = useState(1);

// Secure arrow drawing with coordinate validation
const drawArrow = (fromX: number, fromY: number, toX: number, toY: number) => {
  // Validate coordinates are within canvas bounds
  const validatedCoords = coordinateValidator.parse({ fromX, fromY, toX, toY });
  // Arrow drawing logic with path length limits
  const maxArrowLength = 2000; // Prevent extremely long arrows
  const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
  if (distance > maxArrowLength) return null;
  
  // Render arrow with security constraints
};
```

**Layers System with Security:**
```typescript
// Enhanced layer management with validation
const layerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean().default(false),
  drawings: z.array(z.any()).max(1000) // Limit drawings per layer
});

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  drawings: DrawingData[];
  zIndex: number;
}

const [layers, setLayers] = useState<Layer[]>([
  { id: '1', name: 'Routes', visible: true, opacity: 1, locked: false, drawings: [], zIndex: 1 },
  { id: '2', name: 'Destinations', visible: true, opacity: 1, locked: false, drawings: [], zIndex: 2 }
]);

// Maximum layers per plan (prevent resource exhaustion)
const MAX_LAYERS_PER_PLAN = 20;
```

**Database Schema for Layers:**
```sql
-- Secure layers table
CREATE TABLE plan_layers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL CHECK (name ~ '^[a-zA-Z0-9\s\-_]+$'),
  z_index INTEGER NOT NULL CHECK (z_index >= 0 AND z_index <= 100),
  opacity FLOAT NOT NULL DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
  visible BOOLEAN DEFAULT true,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, z_index) -- Prevent duplicate z-index values
);

-- Limit layers per plan
CREATE OR REPLACE FUNCTION check_layer_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM plan_layers WHERE plan_id = NEW.plan_id) >= 20 THEN
    RAISE EXCEPTION 'Maximum 20 layers allowed per plan';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER layer_limit_trigger
  BEFORE INSERT ON plan_layers
  FOR EACH ROW EXECUTE FUNCTION check_layer_limit();
```

### 6.2 Map Integration Features

**Interactive Map Background with Security:**
```typescript
// Secure map integration
const mapConfigSchema = z.object({
  provider: z.enum(['openstreetmap', 'mapbox', 'google']),
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  zoom: z.number().min(1).max(20),
  bounds: z.object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180)
  }).optional()
});

export function MapBackground({ bounds, apiKey }: { bounds: MapBounds, apiKey?: string }) {
  // Validate API key format (prevent injection)
  const keyValidator = z.string().regex(/^[a-zA-Z0-9\-_]{20,100}$/);
  const validatedKey = apiKey ? keyValidator.parse(apiKey) : null;
  
  // Rate limiting for map tile requests
  const mapRateLimit = useRateLimit('map-tiles', { limit: 100, window: 60000 });
  
  // Secure map tile loading with HTTPS only
  const tileUrlPattern = /^https:\/\/[a-z0-9\-\.]+\/[a-z0-9\-\/_{}]+$/i;
}
```

**Enhanced GPS Coordinates with Validation:**
```typescript
// Enhanced destination interface with GPS validation
const gpsCoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
  altitude: z.number().optional()
});

interface EnhancedDestination extends Destination {
  lat?: number;
  lng?: number;
  address?: string;
  countryCode?: string; // ISO country code validation
  timezone?: string;    // IANA timezone validation
  accuracy?: number;    // GPS accuracy in meters
}

// Address validation to prevent injection
const addressSchema = z.string()
  .max(200)
  .regex(/^[a-zA-Z0-9\s,.\-#()]+$/, 'Invalid address format');
```

### 6.3 Mobile & Touch Features

**Secure Touch Drawing Optimization:**
```typescript
// Enhanced touch handling with security measures
const touchEventSchema = z.object({
  touches: z.array(z.object({
    clientX: z.number().min(0),
    clientY: z.number().min(0),
    pressure: z.number().min(0).max(1).optional()
  })).max(10), // Limit simultaneous touches
  timestamp: z.number().int().positive()
});

const handleTouchStart = (e: React.TouchEvent) => {
  e.preventDefault();
  
  // Validate touch event to prevent manipulation
  const touchData = {
    touches: Array.from(e.touches).map(touch => ({
      clientX: touch.clientX,
      clientY: touch.clientY,
      pressure: (touch as any).force || 1
    })),
    timestamp: Date.now()
  };
  
  const validatedTouch = touchEventSchema.parse(touchData);
  
  // Apply rate limiting to prevent touch spam
  const touchRateLimit = useRateLimit('touch-events', { limit: 60, window: 1000 });
  if (!touchRateLimit.allowed) return;
  
  // Process validated touch
  const rect = canvasRef.current?.getBoundingClientRect();
  // Multi-touch support for zoom/pan with bounds checking
};
```

**Secure Gesture Controls:**
```typescript
// Gesture validation schema
const gestureSchema = z.object({
  scale: z.number().min(0.1).max(10), // Prevent extreme zoom
  panX: z.number().min(-5000).max(5000), // Limit pan range
  panY: z.number().min(-5000).max(5000),
  rotation: z.number().min(-360).max(360).optional()
});

const [scale, setScale] = useState(1);
const [panX, setPanX] = useState(0);
const [panY, setPanY] = useState(0);

// Gesture rate limiting
const gestureRateLimit = useRateLimit('gestures', { limit: 30, window: 1000 });
```

### 6.4 Real-time Collaboration Enhancement

**Advanced Real-time Canvas with Security:**
```typescript
import { supabase } from './supabase';

// Enhanced realtime message validation
const realtimeMessageSchema = z.object({
  type: z.enum(['draw', 'cursor', 'user_join', 'user_leave', 'layer_change']),
  planToken: z.string().regex(/^[a-zA-Z0-9\-_]{12,64}$/),
  userId: z.string().uuid(),
  data: z.record(z.any()).refine(data => {
    const jsonString = JSON.stringify(data);
    return jsonString.length <= 5000; // Limit message size
  }),
  timestamp: z.number().int().positive(),
  checksum: z.string().length(64) // SHA-256 message integrity
});

export function useRealtimeCanvas(planToken: string) {
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  const messageRateLimit = useRateLimit(`realtime-${planToken}`, { limit: 30, window: 60000 });
  
  useEffect(() => {
    const channel = supabase
      .channel(`plan-${planToken}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'drawings'
      }, (payload) => {
        // Validate payload before processing
        const validatedPayload = realtimeMessageSchema.parse(payload);
        
        // Verify message integrity
        const expectedChecksum = calculateChecksum(validatedPayload.data);
        if (expectedChecksum !== validatedPayload.checksum) {
          console.warn('Message integrity check failed');
          return;
        }
        
        // Apply rate limiting
        if (!messageRateLimit.allowed) {
          console.warn('Rate limit exceeded for realtime messages');
          return;
        }
        
        // Update canvas in real-time
        updateCanvasFromPayload(validatedPayload);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [planToken]);
}
```

**Secure User Presence:**
```typescript
// User presence with privacy and security
const userPresenceSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string().max(50).regex(/^[a-zA-Z0-9\s\-_]+$/),
  cursor: z.object({
    x: z.number().min(-1000).max(20000),
    y: z.number().min(-1000).max(20000)
  }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  lastSeen: z.number().int().positive(),
  sessionId: z.string().uuid()
});

interface UserPresence {
  userId: string;
  userName: string; // Sanitized display name
  cursor: { x: number; y: number };
  color: string;
  lastSeen: number;
  sessionId: string;
}

// Auto-cleanup inactive users (5 minutes)
const PRESENCE_TIMEOUT = 5 * 60 * 1000;
```

### 6.5 Planning & Organization Features

**Secure Travel Itinerary:**
```typescript
// Itinerary validation schema
const itineraryItemSchema = z.object({
  id: z.string().uuid(),
  day: z.number().min(1).max(365), // Max 1 year itinerary
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  destination: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s,.\-()]+$/),
  activity: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s,.\-()!?]+$/),
  duration: z.number().min(15).max(1440), // 15 minutes to 24 hours
  notes: z.string().max(500).regex(/^[a-zA-Z0-9\s,.\-()!?\n\r]*$/),
  cost: z.number().min(0).max(1000000).optional() // Optional cost tracking
});

interface ItineraryItem {
  id: string;
  day: number;
  time: string;
  destination: string;
  activity: string;
  duration: number; // in minutes
  notes: string;
  cost?: number;
}

export function ItineraryPanel({ planToken }: { planToken: string }) {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  
  // Limit itinerary items per plan
  const MAX_ITINERARY_ITEMS = 200;
  
  // Drag and drop with validation
  const handleDragEnd = (result: any) => {
    // Validate drag operation
    const dragValidator = z.object({
      source: z.object({ index: z.number().min(0) }),
      destination: z.object({ index: z.number().min(0) }).nullable()
    });
    
    const validatedResult = dragValidator.parse(result);
    // Process validated drag operation
  };
}
```

**Secure Budget Tracker:**
```typescript
// Budget validation with currency support
const budgetItemSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(['transport', 'accommodation', 'food', 'activities', 'shopping', 'other']),
  description: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s,.\-()]+$/),
  amount: z.number().min(0).max(1000000), // Reasonable max amount
  currency: z.string().length(3).regex(/^[A-Z]{3}$/), // ISO currency codes
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  receipt_url: z.string().url().optional(),
  tags: z.array(z.string().max(20)).max(10).optional()
});

interface BudgetItem {
  id: string;
  category: 'transport' | 'accommodation' | 'food' | 'activities' | 'shopping' | 'other';
  description: string;
  amount: number;
  currency: string;
  date: string;
  receipt_url?: string;
  tags?: string[];
}

// Budget totals with currency conversion security
const currencyRateSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  rate: z.number().positive(),
  lastUpdated: z.number().int().positive()
});
```

### 6.6 Templates & Presets

**Secure Plan Templates:**
```typescript
// Template validation schema
const planTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_()]+$/),
  description: z.string().max(500).regex(/^[a-zA-Z0-9\s,.\-()!?\n\r]*$/),
  category: z.enum(['city-tour', 'road-trip', 'backpacking', 'business', 'family', 'adventure']),
  presetDestinations: z.array(destinationSchema).max(50),
  presetRoutes: z.array(drawingSchema).max(100),
  estimatedDuration: z.number().min(1).max(365), // days
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  tags: z.array(z.string().max(20)).max(10),
  isPublic: z.boolean().default(false),
  createdBy: z.string().uuid().optional()
});

interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: 'city-tour' | 'road-trip' | 'backpacking' | 'business' | 'family' | 'adventure';
  presetDestinations: Destination[];
  presetRoutes: DrawingData[];
  estimatedDuration: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  tags: string[];
  isPublic: boolean;
  createdBy?: string;
}

// Template usage rate limiting
const templateRateLimit = useRateLimit('template-usage', { limit: 10, window: 3600000 }); // 10 per hour
```

**Secure Drawing Presets:**
```typescript
// Drawing preset validation
const drawingPresetSchema = z.object({
  name: z.string().min(1).max(50),
  colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1).max(10),
  tools: z.array(z.enum(['pen', 'brush', 'marker', 'highlighter'])).min(1).max(5),
  brushSizes: z.array(z.number().min(1).max(50)).max(5),
  opacity: z.number().min(0.1).max(1)
});

// Preset categories with validation
const travelPresets = {
  'beach-vacation': { 
    colors: ['#87CEEB', '#F0E68C', '#FF6347'], 
    tools: ['brush', 'marker'],
    brushSizes: [2, 4, 8],
    opacity: 0.8
  },
  'mountain-hiking': { 
    colors: ['#228B22', '#8B4513', '#696969'], 
    tools: ['pen', 'highlighter'],
    brushSizes: [1, 3, 6],
    opacity: 1.0
  }
};
```

### 6.7 Enhanced Export & Sharing

**Secure Multi-Format Export:**
```typescript
// Export validation with security measures
const exportConfigSchema = z.object({
  format: z.enum(['png', 'jpeg', 'svg', 'pdf', 'json']),
  quality: z.number().min(0.1).max(1).optional(),
  resolution: z.object({
    width: z.number().min(100).max(8000),
    height: z.number().min(100).max(8000)
  }),
  includeMetadata: z.boolean().default(false),
  watermark: z.boolean().default(false),
  password: z.string().min(8).max(100).optional() // For PDF password protection
});

export async function exportPlan(planData: PlanData, config: ExportConfig) {
  // Validate export configuration
  const validatedConfig = exportConfigSchema.parse(config);
  
  // Apply export rate limiting
  const exportRateLimit = useRateLimit('export', { limit: 5, window: 300000 }); // 5 per 5 minutes
  if (!exportRateLimit.allowed) {
    throw new Error('Export rate limit exceeded');
  }
  
  // Sanitize plan data before export
  const sanitizedData = sanitizePlanData(planData);
  
  switch (validatedConfig.format) {
    case 'png':
      return await exportToPNG(sanitizedData, validatedConfig);
    case 'pdf':
      return await exportToPDF(sanitizedData, validatedConfig);
    case 'svg':
      return await exportToSVG(sanitizedData, validatedConfig);
    case 'json':
      return await exportToJSON(sanitizedData, validatedConfig);
  }
}

// Server-side export processing for security
async function exportToPDF(data: PlanData, config: ExportConfig) {
  // Use server-side PDF generation to prevent client-side exploits
  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, config })
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  return await response.blob();
}
```

**Enhanced Social Sharing with Security:**
```typescript
// Social sharing validation
const shareConfigSchema = z.object({
  platform: z.enum(['twitter', 'facebook', 'whatsapp', 'linkedin', 'email']),
  message: z.string().max(280).regex(/^[a-zA-Z0-9\s,.\-()!?#@]*$/),
  includePreview: z.boolean().default(true),
  privacy: z.enum(['public', 'unlisted', 'private']).default('unlisted')
});

export function ShareDialog({ planUrl, planTitle }: { planUrl: string, planTitle: string }) {
  // Validate and sanitize sharing data
  const sanitizedTitle = z.string().max(100).parse(planTitle);
  const sanitizedUrl = z.string().url().parse(planUrl);
  
  const shareToSocial = (platform: string, config: any) => {
    const validatedConfig = shareConfigSchema.parse({ platform, ...config });
    
    // Generate secure sharing URLs with CSRF protection
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(validatedConfig.message)}&url=${encodeURIComponent(sanitizedUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sanitizedUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${validatedConfig.message} ${sanitizedUrl}`)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sanitizedUrl)}`,
      email: `mailto:?subject=${encodeURIComponent(sanitizedTitle)}&body=${encodeURIComponent(`${validatedConfig.message}\n\n${sanitizedUrl}`)}`
    };
    
    // Open in secure popup with restrictions
    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank', 'noopener,noreferrer,width=600,height=400');
  };
}
```

---

## 🏗️ Phase 7: Advanced Features & Analytics (Week 15-16)

### 7.1 Search & Discovery

**Secure Destination Search:**
```typescript
// Search validation schema
const searchQuerySchema = z.object({
  query: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s,.\-()]+$/),
  filters: z.object({
    type: z.enum(['city', 'attraction', 'restaurant', 'hotel']).optional(),
    radius: z.number().min(1).max(100).optional(), // km
    priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional()
  }).optional(),
  limit: z.number().min(1).max(50).default(20)
});

export function DestinationSearch() {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search rate limiting
  const searchRateLimit = useRateLimit('destination-search', { limit: 20, window: 60000 });
  
  const performSearch = async (query: string, filters?: any) => {
    if (!searchRateLimit.allowed) {
      throw new Error('Search rate limit exceeded');
    }
    
    const validatedQuery = searchQuerySchema.parse({ query, filters });
    
    setIsLoading(true);
    try {
      // Secure API calls with sanitized queries
      const response = await fetch('/api/search/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedQuery)
      });
      
      const results = await response.json();
      setSearchResults(results.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
}
```

**Secure Public Plan Gallery:**
```typescript
// Public plan validation
const publicPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s,.\-()!?]+$/),
  description: z.string().max(500).regex(/^[a-zA-Z0-9\s,.\-()!?\n\r]*$/),
  thumbnail: z.string().url().regex(/^https:\/\/[^\/]+\/.*\.(jpg|jpeg|png|webp)$/i),
  likes: z.number().min(0).max(1000000),
  views: z.number().min(0).max(10000000),
  tags: z.array(z.string().max(20).regex(/^[a-zA-Z0-9\-_]+$/)).max(10),
  createdAt: z.string().datetime(),
  difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
  duration: z.number().min(1).max(365).optional() // days
});

interface PublicPlan {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  likes: number;
  views: number;
  tags: string[];
  createdAt: string;
  difficulty?: 'easy' | 'moderate' | 'hard';
  duration?: number;
}

// Gallery browsing with content moderation
export function PlanGallery() {
  // Content filtering for inappropriate content
  const contentFilter = useContentModeration();
  
  // Pagination with limits
  const [currentPage, setCurrentPage] = useState(1);
  const PLANS_PER_PAGE = 20;
  const MAX_PAGES = 100; // Prevent deep pagination attacks
}
```

### 7.2 Progressive Web App Implementation

**Secure PWA Configuration:**
```typescript
// PWA configuration with security
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    }
  ],
  // Security headers for service worker
  swSrc: 'public/sw.js',
  fallbacks: {
    document: '/offline'
  }
});

module.exports = withPWA({
  // Enhanced PWA security
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        {
          key: 'Service-Worker-Allowed',
          value: '/'
        },
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate'
        }
      ]
    }
  ]
});
```

**Secure Offline Support:**
```typescript
// Offline storage with encryption
export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  
  // Encrypt sensitive data before storing offline
  const encryptOfflineData = (data: any) => {
    const key = generateOfflineKey();
    return encrypt(JSON.stringify(data), key);
  };
  
  // IndexedDB with security measures
  const initOfflineDB = async () => {
    const db = await openDB('TravelPlannerDB', 1, {
      upgrade(db) {
        // Plans store
        const planStore = db.createObjectStore('plans', { keyPath: 'token' });
        planStore.createIndex('lastModified', 'lastModified');
        
        // Offline actions queue
        const queueStore = db.createObjectStore('actionQueue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp');
      }
    });
    
    return db;
  };
  
  // Sync when online with conflict resolution
  const syncOfflineData = async () => {
    if (!isOnline) return;
    
    const db = await initOfflineDB();
    const actions = await db.getAll('actionQueue');
    
    for (const action of actions) {
      try {
        // Validate action before syncing
        const validatedAction = offlineActionSchema.parse(action);
        await processOfflineAction(validatedAction);
        await db.delete('actionQueue', action.id);
      } catch (error) {
        console.error('Sync failed for action:', action.id, error);
      }
    }
  };
}
```

### 7.3 Admin & Analytics

**Secure Usage Analytics:**
```typescript
// Analytics with privacy compliance
const analyticsEventSchema = z.object({
  event: z.enum(['plan_created', 'plan_shared', 'export_generated', 'feature_used']),
  planToken: z.string().regex(/^[a-zA-Z0-9\-_]{12,64}$/),
  metadata: z.record(z.any()).refine(data => {
    return JSON.stringify(data).length <= 1000; // Limit metadata size
  }),
  timestamp: z.number().int().positive(),
  sessionId: z.string().uuid(),
  // No personal information collected
});

export function trackPlanCreation(planToken: string, metadata: any = {}) {
  // Validate analytics data
  const event = analyticsEventSchema.parse({
    event: 'plan_created',
    planToken,
    metadata: {
      hasDestinations: metadata.destinationCount > 0,
      hasDrawings: metadata.drawingCount > 0,
      templateUsed: metadata.templateId || null,
      // Aggregate data only, no personal info
    },
    timestamp: Date.now(),
    sessionId: generateSessionId()
  });
  
  // Send to analytics service (privacy-compliant)
  sendAnalyticsEvent(event);
}

// Privacy-compliant analytics storage
const analyticsStorage = {
  retention: 90, // days
  anonymization: true,
  aggregationOnly: true,
  noPersonalData: true
};
```

**Secure Plan Management API:**
```typescript
// Enhanced plan management with admin controls
export async function POST(request: Request) {
  // Admin authentication check
  const adminToken = request.headers.get('admin-token');
  if (!validateAdminToken(adminToken)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const body = await request.json();
  
  // Plan management validation
  const planManagementSchema = z.object({
    action: z.enum(['create', 'update', 'delete', 'suspend', 'restore']),
    planToken: z.string().regex(/^[a-zA-Z0-9\-_]{12,64}$/),
    settings: z.object({
      expirationDate: z.string().datetime().optional(),
      maxCollaborators: z.number().min(1).max(100).optional(),
      isPublic: z.boolean().optional(),
      moderationStatus: z.enum(['approved', 'pending', 'rejected']).optional()
    }).optional()
  });
  
  const validatedRequest = planManagementSchema.parse(body);
  
  // Process admin action with audit logging
  await processAdminAction(validatedRequest, adminToken);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 🎨 Enhanced UI/UX & Accessibility (Integrated into existing phases)

### Theme Customization with Security
```typescript
// Secure theme validation
const themeSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
  }),
  fonts: z.object({
    primary: z.enum(['Inter', 'Roboto', 'Arial', 'Georgia']),
    secondary: z.enum(['Inter', 'Roboto', 'Arial', 'Georgia'])
  }),
  spacing: z.enum(['compact', 'normal', 'spacious']),
  animations: z.boolean().default(true)
});

const predefinedThemes = {
  light: { 
    name: 'Light',
    colors: { primary: '#3b82f6', secondary: '#64748b', background: '#ffffff', surface: '#f8fafc', text: '#1e293b', accent: '#10b981' },
    fonts: { primary: 'Inter', secondary: 'Inter' },
    spacing: 'normal',
    animations: true
  },
  dark: { 
    name: 'Dark',
    colors: { primary: '#60a5fa', secondary: '#94a3b8', background: '#1f2937', surface: '#374151', text: '#f9fafb', accent: '#34d399' },
    fonts: { primary: 'Inter', secondary: 'Inter' },
    spacing: 'normal',
    animations: true
  },
  travel: { 
    name: 'Travel',
    colors: { primary: '#10b981', secondary: '#6b7280', background: '#f0fdf4', surface: '#ecfdf5', text: '#1f2937', accent: '#f59e0b' },
    fonts: { primary: 'Inter', secondary: 'Georgia' },
    spacing: 'normal',
    animations: true
  }
};
```

### Enhanced Accessibility Features
```typescript
// Accessibility validation and features
const accessibilitySchema = z.object({
  highContrast: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  fontSize: z.enum(['small', 'normal', 'large', 'extra-large']).default('normal'),
  screenReader: z.boolean().default(false),
  keyboardNavigation: z.boolean().default(true),
  voiceCommands: z.boolean().default(false)
});

export function AccessibilityPanel() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    fontSize: 'normal',
    screenReader: false,
    keyboardNavigation: true,
    voiceCommands: false
  });
  
  // Implement accessibility features with security validation
  const updateAccessibilitySetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    const validatedSettings = accessibilitySchema.parse(newSettings);
    setSettings(validatedSettings);
    
    // Apply accessibility changes with XSS prevention
    applyAccessibilitySettings(validatedSettings);
  };
  
  // Voice command security (if implemented)
  const voiceCommandValidator = z.object({
    command: z.enum(['zoom_in', 'zoom_out', 'select_tool', 'add_destination', 'save_plan']),
    confidence: z.number().min(0.7).max(1.0), // High confidence required
    timestamp: z.number().int().positive()
  });
}
```

---

## 🔄 Updated Implementation Timeline

### **Extended Timeline: 16 Weeks Total**

| Phase | Duration | Enhanced Deliverables | Security Additions |
|-------|----------|----------------------|-------------------|
| 1-2 | Week 1-4 | Core shapes + Advanced drawing tools | Tool validation, Canvas bounds |
| 3 | Week 5-6 | Real-time collaboration + User presence | WebSocket security, Message integrity |
| 4 | Week 7-8 | File handling + Map integration | File security, GPS validation |
| 5 | Week 9-10 | Export + Advanced sharing | Server-side processing, Social sharing security |
| 6 | Week 11-14 | Travel features + Templates + Mobile optimization | Touch security, Template validation |
| 7 | Week 15-16 | PWA + Analytics + Admin tools | Offline security, Privacy compliance |

### **Priority Implementation Order:**
1. **Phase 1**: Advanced drawing tools (immediate user value)
2. **Phase 2**: Real-time collaboration (high engagement)
3. **Phase 6**: Mobile touch optimization (accessibility)
4. **Phase 3**: Map integration (travel-specific value)
5. **Phase 5**: Export functionality (retention)
6. **Phase 6**: Templates & itinerary (productivity)
7. **Phase 7**: PWA & analytics (long-term growth)

---

## 📊 **Resource Requirements Update**

### **Development Team:**
- **Lead Developer**: Full-stack development (16 weeks)
- **Frontend Specialist**: UI/UX + Mobile optimization (12 weeks)
- **Backend Developer**: API security + Real-time features (10 weeks)
- **Security Engineer**: Security review + penetration testing (8 weeks, part-time)
- **QA Engineer**: Feature testing + security validation (16 weeks, part-time)

### **Infrastructure:**
- Enhanced monitoring tools for real-time features
- CDN for map tiles and static assets
- Background job processing for exports
- Redis/caching layer for real-time collaboration
- Extended database storage for new features

### **Security Enhancements:**
- Advanced threat detection for file uploads
- Real-time collaboration monitoring
- Export generation security scanning
- Mobile-specific security measures
- PWA security auditing tools

---

**This comprehensive enhancement plan maintains your security-first approach while adding powerful Excalidraw-like features specifically tailored for travel planning. Each feature includes detailed security considerations and implementation guidelines.**
