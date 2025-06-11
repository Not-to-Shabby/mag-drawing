# Supabase Setup Guide for Mag-Drawing

Follow these steps to set up your Supabase database:

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended)
4. Click "New Project"
5. Choose your organization
6. Fill in project details:
   - **Name**: mag-drawing
   - **Database Password**: (choose a strong password)
   - **Region**: (choose closest to you)
7. Click "Create new project"

## 2. Get Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (something like `https://xxxxx.supabase.co`)
   - **Project API Key** (anon/public key)

## 3. Configure Environment Variables

1. In your project root, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and replace the values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 4. Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `database/schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create:
- `plans` table with token-based access
- `destinations` table for travel markers
- `drawings` table for canvas drawings
- Proper security policies for public access

## 5. Test the Connection

### Option 1: Quick Test Command
```bash
npm run test-supabase
```

This command will:
- Test basic Supabase connection
- Try creating a test plan
- Verify database permissions
- Clean up test data

### Option 2: Manual Test
1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`
3. You should see a new plan load automatically
4. Try adding destinations and drawings
5. Check your Supabase dashboard > **Table Editor** to see the data

## 6. Verify Database Tables

In Supabase dashboard > **Table Editor**, you should see:

### plans table:
- `id` (uuid, primary key)
- `token` (varchar, unique)
- `title` (varchar)
- `description` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### destinations table:
- `id` (uuid, primary key)
- `plan_id` (uuid, foreign key)
- `name` (varchar)
- `notes` (text)
- `x_position` (float)
- `y_position` (float)
- `color` (varchar)
- `order_index` (integer)
- `created_at` (timestamp)

### drawings table:
- `id` (uuid, primary key)
- `plan_id` (uuid, foreign key)
- `path_data` (jsonb)
- `color` (varchar)
- `stroke_width` (integer)
- `created_at` (timestamp)

## Troubleshooting

### Connection Issues:
- Double-check your `.env.local` file
- Ensure no extra spaces in environment variables
- Restart the development server after changes

### Database Issues:
- Verify the SQL schema ran without errors
- Check that Row Level Security policies are enabled
- Ensure tables were created successfully

### Token Issues:
- New plans should automatically create database entries
- Check browser network tab for API errors
- Verify Supabase URL is accessible

## Next Steps

Once setup is complete, you can:
- Create new travel plans
- Share plan URLs with others
- Add destinations and drawings
- All data will persist in Supabase
- Deploy to Vercel with the same environment variables
