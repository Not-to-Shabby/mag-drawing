-- Migration to fix stroke_width constraint
-- This allows stroke_width up to 50 to match the UI slider maximum

-- Update the shapes table constraint for stroke_width
ALTER TABLE shapes DROP CONSTRAINT IF EXISTS shapes_stroke_width_check;
ALTER TABLE shapes ADD CONSTRAINT shapes_stroke_width_check 
  CHECK (stroke_width >= 1 AND stroke_width <= 50);

-- Update the drawings table constraint for stroke_width  
ALTER TABLE drawings DROP CONSTRAINT IF EXISTS drawings_stroke_width_check;
ALTER TABLE drawings ADD CONSTRAINT drawings_stroke_width_check 
  CHECK (stroke_width >= 1 AND stroke_width <= 50);

-- Add comment for documentation
COMMENT ON CONSTRAINT shapes_stroke_width_check ON shapes IS 'Stroke width must be between 1 and 50 pixels';
COMMENT ON CONSTRAINT drawings_stroke_width_check ON drawings IS 'Stroke width must be between 1 and 50 pixels';
