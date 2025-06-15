-- Supabase Database Schema for Mag-Drawing
-- Create these tables in your Supabase project

-- Plans table to store travel plans with URL tokens
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL, -- URL token for sharing
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Destinations table to store destination markers
CREATE TABLE destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  notes TEXT,
  x_position FLOAT NOT NULL,
  y_position FLOAT NOT NULL,
  color VARCHAR(7) DEFAULT '#ef4444',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drawings table to store drawing paths
CREATE TABLE drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  path_data JSONB NOT NULL, -- Store path points as JSON
  color VARCHAR(7) DEFAULT '#3b82f6',
  stroke_width INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phase 1: Enhanced Drawing Engine Schema
-- Shapes table for advanced drawing tools
CREATE TABLE shapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES plan_layers(id) ON DELETE CASCADE,
  shape_type VARCHAR(20) NOT NULL CHECK (shape_type IN ('rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'line', 'text', 'sticky-note')),
  x_position FLOAT NOT NULL CHECK (x_position >= -1000 AND x_position <= 20000),
  y_position FLOAT NOT NULL CHECK (y_position >= -1000 AND y_position <= 20000),
  width FLOAT CHECK (width >= 1 AND width <= 5000),
  height FLOAT CHECK (height >= 1 AND height <= 5000),
  rotation FLOAT DEFAULT 0 CHECK (rotation >= -360 AND rotation <= 360),
  stroke_color VARCHAR(7) DEFAULT '#000000' CHECK (stroke_color ~ '^#[0-9A-Fa-f]{6}$'),
  fill_color VARCHAR(7) CHECK (fill_color IS NULL OR fill_color ~ '^#[0-9A-Fa-f]{6}$'),
  stroke_width INTEGER DEFAULT 2 CHECK (stroke_width >= 1 AND stroke_width <= 50),
  opacity FLOAT DEFAULT 1.0 CHECK (opacity >= 0.1 AND opacity <= 1.0),
  text_content TEXT CHECK (char_length(text_content) <= 500),
  font_size INTEGER CHECK (font_size >= 8 AND font_size <= 72),
  font_family VARCHAR(20) CHECK (font_family IN ('Inter', 'Roboto', 'Arial', 'Georgia')),
  z_index INTEGER DEFAULT 0 CHECK (z_index >= 0 AND z_index <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Layers table for layer management
CREATE TABLE plan_layers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL CHECK (name ~ '^[a-zA-Z0-9\s\-_]+$'),
  z_index INTEGER NOT NULL CHECK (z_index >= 0 AND z_index <= 100),
  opacity FLOAT NOT NULL DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
  visible BOOLEAN DEFAULT true,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, z_index) -- Prevent duplicate z-index values per plan
);

-- Enhanced drawings table with layer support
ALTER TABLE drawings ADD COLUMN layer_id UUID REFERENCES plan_layers(id) ON DELETE SET NULL;
ALTER TABLE drawings ADD COLUMN opacity FLOAT DEFAULT 1.0 CHECK (opacity >= 0.1 AND opacity <= 1.0);
ALTER TABLE drawings ADD COLUMN brush_type VARCHAR(20) DEFAULT 'pen' CHECK (brush_type IN ('pen', 'marker', 'highlighter', 'eraser'));
ALTER TABLE drawings ADD COLUMN smoothing FLOAT DEFAULT 0.5 CHECK (smoothing >= 0 AND smoothing <= 1);

-- Enable Row Level Security (but allow access via token)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_layers ENABLE ROW LEVEL SECURITY;

-- Create policies for token-based access (no authentication required)
CREATE POLICY "Anyone can view plans" ON plans FOR SELECT USING (true);
CREATE POLICY "Anyone can create plans" ON plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update plans" ON plans FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete plans" ON plans FOR DELETE USING (true);

-- Policies for destinations (accessible to everyone)
CREATE POLICY "Anyone can view destinations" ON destinations FOR SELECT USING (true);
CREATE POLICY "Anyone can create destinations" ON destinations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update destinations" ON destinations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete destinations" ON destinations FOR DELETE USING (true);

-- Policies for drawings (accessible to everyone)
CREATE POLICY "Anyone can view drawings" ON drawings FOR SELECT USING (true);
CREATE POLICY "Anyone can create drawings" ON drawings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update drawings" ON drawings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete drawings" ON drawings FOR DELETE USING (true);

-- Shapes policies
CREATE POLICY "Token-based shape access" ON shapes FOR ALL USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = shapes.plan_id)
);

-- Layer policies  
CREATE POLICY "Token-based layer access" ON plan_layers FOR ALL USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_layers.plan_id)
);

-- Function to limit layers per plan
CREATE OR REPLACE FUNCTION check_layer_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM plan_layers WHERE plan_id = NEW.plan_id) >= 20 THEN
    RAISE EXCEPTION 'Maximum 20 layers allowed per plan';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to limit shapes per layer
CREATE OR REPLACE FUNCTION check_shapes_per_layer_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.layer_id IS NOT NULL AND (SELECT COUNT(*) FROM shapes WHERE layer_id = NEW.layer_id) >= 500 THEN
    RAISE EXCEPTION 'Maximum 500 shapes allowed per layer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for limits
CREATE TRIGGER layer_limit_trigger
  BEFORE INSERT ON plan_layers
  FOR EACH ROW EXECUTE FUNCTION check_layer_limit();

CREATE TRIGGER shapes_per_layer_limit_trigger
  BEFORE INSERT ON shapes
  FOR EACH ROW EXECUTE FUNCTION check_shapes_per_layer_limit();

-- Indexes for performance
CREATE INDEX idx_shapes_plan_id ON shapes(plan_id);
CREATE INDEX idx_shapes_layer_id ON shapes(layer_id);
CREATE INDEX idx_shapes_z_index ON shapes(z_index);
CREATE INDEX idx_plan_layers_plan_id ON plan_layers(plan_id);
CREATE INDEX idx_plan_layers_z_index ON plan_layers(plan_id, z_index);

-- Default layers for new plans
INSERT INTO plan_layers (plan_id, name, z_index, opacity, visible) 
SELECT id, 'Background', 0, 1.0, true FROM plans WHERE id NOT IN (SELECT DISTINCT plan_id FROM plan_layers WHERE plan_id IS NOT NULL);

INSERT INTO plan_layers (plan_id, name, z_index, opacity, visible)
SELECT id, 'Routes', 1, 1.0, true FROM plans WHERE id NOT IN (SELECT plan_id FROM plan_layers WHERE name = 'Routes');

INSERT INTO plan_layers (plan_id, name, z_index, opacity, visible)
SELECT id, 'Destinations', 2, 1.0, true FROM plans WHERE id NOT IN (SELECT plan_id FROM plan_layers WHERE name = 'Destinations');
