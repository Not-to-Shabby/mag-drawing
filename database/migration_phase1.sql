-- Migration script for Phase 1 Enhanced Drawing Features
-- Run this in your Supabase SQL Editor

-- 1. Create the shapes table
CREATE TABLE IF NOT EXISTS shapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  layer_id UUID,
  shape_type VARCHAR(20) NOT NULL CHECK (shape_type IN ('rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'line', 'text', 'sticky')),
  x_position FLOAT NOT NULL CHECK (x_position >= -1000 AND x_position <= 20000),
  y_position FLOAT NOT NULL CHECK (y_position >= -1000 AND y_position <= 20000),
  width FLOAT CHECK (width >= 1 AND width <= 5000),
  height FLOAT CHECK (height >= 1 AND height <= 5000),
  rotation FLOAT DEFAULT 0 CHECK (rotation >= -360 AND rotation <= 360),
  stroke_color VARCHAR(7) DEFAULT '#000000' CHECK (stroke_color ~ '^#[0-9A-Fa-f]{6}$'),
  fill_color VARCHAR(7) CHECK (fill_color IS NULL OR fill_color ~ '^#[0-9A-Fa-f]{6}$'),
  stroke_width INTEGER DEFAULT 2 CHECK (stroke_width >= 1 AND stroke_width <= 20),
  opacity FLOAT DEFAULT 1.0 CHECK (opacity >= 0.1 AND opacity <= 1.0),
  text_content TEXT CHECK (char_length(text_content) <= 500),
  font_size INTEGER CHECK (font_size >= 8 AND font_size <= 72),
  font_family VARCHAR(20) CHECK (font_family IN ('Inter', 'Roboto', 'Arial', 'Georgia')),
  z_index INTEGER DEFAULT 0 CHECK (z_index >= 0 AND z_index <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the plan_layers table
CREATE TABLE IF NOT EXISTS plan_layers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL CHECK (name ~ '^[a-zA-Z0-9\s\-_]+$'),
  z_index INTEGER NOT NULL CHECK (z_index >= 0 AND z_index <= 100),
  opacity FLOAT NOT NULL DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
  visible BOOLEAN DEFAULT true,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, z_index)
);

-- 3. Add layer support to existing drawings table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawings' AND column_name = 'layer_id') THEN
    ALTER TABLE drawings ADD COLUMN layer_id UUID REFERENCES plan_layers(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawings' AND column_name = 'opacity') THEN
    ALTER TABLE drawings ADD COLUMN opacity FLOAT DEFAULT 1.0 CHECK (opacity >= 0.1 AND opacity <= 1.0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawings' AND column_name = 'brush_type') THEN
    ALTER TABLE drawings ADD COLUMN brush_type VARCHAR(20) DEFAULT 'pen' CHECK (brush_type IN ('pen', 'marker', 'highlighter', 'eraser'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawings' AND column_name = 'smoothing') THEN
    ALTER TABLE drawings ADD COLUMN smoothing FLOAT DEFAULT 0.5 CHECK (smoothing >= 0 AND smoothing <= 1);
  END IF;
END $$;

-- 4. Add foreign key constraint for shapes to layers (after plan_layers is created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shapes_layer_id_fkey') THEN
    ALTER TABLE shapes ADD CONSTRAINT shapes_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES plan_layers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Enable RLS for new tables
ALTER TABLE shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_layers ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS "Token-based shape access" ON shapes;
CREATE POLICY "Token-based shape access" ON shapes FOR ALL USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = shapes.plan_id)
);

DROP POLICY IF EXISTS "Token-based layer access" ON plan_layers;
CREATE POLICY "Token-based layer access" ON plan_layers FOR ALL USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_layers.plan_id)
);

-- 7. Create functions for constraints
CREATE OR REPLACE FUNCTION check_layer_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM plan_layers WHERE plan_id = NEW.plan_id) >= 20 THEN
    RAISE EXCEPTION 'Maximum 20 layers allowed per plan';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_shapes_per_layer_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.layer_id IS NOT NULL AND (SELECT COUNT(*) FROM shapes WHERE layer_id = NEW.layer_id) >= 500 THEN
    RAISE EXCEPTION 'Maximum 500 shapes allowed per layer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers
DROP TRIGGER IF EXISTS layer_limit_trigger ON plan_layers;
CREATE TRIGGER layer_limit_trigger
  BEFORE INSERT ON plan_layers
  FOR EACH ROW EXECUTE FUNCTION check_layer_limit();

DROP TRIGGER IF EXISTS shapes_per_layer_limit_trigger ON shapes;
CREATE TRIGGER shapes_per_layer_limit_trigger
  BEFORE INSERT ON shapes
  FOR EACH ROW EXECUTE FUNCTION check_shapes_per_layer_limit();

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shapes_plan_id ON shapes(plan_id);
CREATE INDEX IF NOT EXISTS idx_shapes_layer_id ON shapes(layer_id);
CREATE INDEX IF NOT EXISTS idx_shapes_z_index ON shapes(z_index);
CREATE INDEX IF NOT EXISTS idx_plan_layers_plan_id ON plan_layers(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_layers_z_index ON plan_layers(plan_id, z_index);
CREATE INDEX IF NOT EXISTS idx_drawings_layer_id ON drawings(layer_id);

-- 10. Initialize default layers for existing plans
DO $$
DECLARE
  plan_record RECORD;
BEGIN
  FOR plan_record IN SELECT id FROM plans LOOP
    -- Check if plan already has layers
    IF NOT EXISTS (SELECT 1 FROM plan_layers WHERE plan_id = plan_record.id) THEN
      -- Create default layers
      INSERT INTO plan_layers (plan_id, name, z_index, opacity, visible, locked) VALUES
        (plan_record.id, 'Background', 0, 1.0, true, false),
        (plan_record.id, 'Routes', 1, 1.0, true, false),
        (plan_record.id, 'Destinations', 2, 1.0, true, false)
      ON CONFLICT (plan_id, z_index) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Migration completed successfully!
-- You can now use the enhanced drawing features with layers and shapes.
