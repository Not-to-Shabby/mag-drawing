# Database Schema Setup

Since you now have your Supabase credentials configured, you need to run the database schema to create the required tables.

## Steps to Set Up Database:

1. **Open your Supabase Dashboard**:
   - Go to: https://vcndoiiubzaxymjemeog.supabase.co
   - Sign in to your account

2. **Navigate to SQL Editor**:
   - In the left sidebar, click on "SQL Editor"
   - Click "New Query" or use the existing query editor

3. **Copy and Paste the Schema**:
   - Copy the entire content below and paste it into the SQL editor:

```sql
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

-- Enable Row Level Security (but allow access via token)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

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

-- Create index for faster token lookups
CREATE INDEX idx_plans_token ON plans(token);
```

4. **Run the Schema**:
   - Click the "Run" button to execute the SQL
   - You should see "Success. No rows returned" message

5. **Verify Tables Created**:
   - Go to "Table Editor" in the left sidebar
   - You should see 3 new tables: `plans`, `destinations`, `drawings`

## After Setup:

Once the database schema is set up, your application will be fully functional with:
- ✅ Token-based plan sharing
- ✅ Auto-save functionality
- ✅ Persistent storage for drawings and destinations
- ✅ Real-time collaboration capabilities

Refresh your application page to see it working with the database!
