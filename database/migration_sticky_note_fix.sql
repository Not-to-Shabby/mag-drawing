-- Migration to fix sticky note shape type constraint
-- Run this in your Supabase SQL Editor to update existing database

-- Step 1: Drop the existing constraint
ALTER TABLE shapes DROP CONSTRAINT IF EXISTS shapes_shape_type_check;

-- Step 2: Add the new constraint with 'sticky-note'
ALTER TABLE shapes ADD CONSTRAINT shapes_shape_type_check 
CHECK (shape_type IN ('rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'line', 'text', 'sticky-note'));

-- Step 3: Update any existing 'sticky' values to 'sticky-note' (if any exist)
UPDATE shapes SET shape_type = 'sticky-note' WHERE shape_type = 'sticky';

-- Step 4: Verify the constraint is working
-- This query should return 0 rows if all shape types are valid
SELECT shape_type, COUNT(*) as count 
FROM shapes 
WHERE shape_type NOT IN ('rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'line', 'text', 'sticky-note')
GROUP BY shape_type;
