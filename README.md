# Mag-Drawing

A modern whiteboard planner designed to help users organize their travel plans with an intuitive drawing interface.

## Tech Stack

- **Frontend**: React with Next.js 14 (App Router)
- **UI Library**: shadcn/ui with Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Language**: TypeScript

## Features

- Interactive whiteboard drawing interface
- Add and remove destinations with visual markers
- Create timeline for trips with drag-and-drop functionality
- Add notes and important information for each destination
- **URL-based sharing** - Share plans via unique tokens (no authentication required)
- Real-time collaboration (planned)
- Export plans as images or PDFs (planned)

## Getting Started

First, install the dependencies:

```bash
npm install
```

Set up your environment variables by creating a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Setup

**📋 Complete Setup Guide**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

**Quick Setup:**
1. Create a new project on [Supabase](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the SQL schema from `database/schema.sql`
4. Restart your development server

The database includes:
- **Token-based access** - No authentication required
- **Plans table** - Travel plans with unique tokens
- **Destinations table** - Destination markers with coordinates
- **Drawings table** - Canvas drawings as JSON paths
- **Public access policies** - Anyone with token can edit

## How URL Sharing Works

- Each travel plan has a unique token (e.g., `abc123def456`)
- Plans are accessed via URLs like `/plan/abc123def456`
- Anyone with the URL can view and edit the plan
- No user accounts or authentication required
- Perfect for collaborative travel planning

## Development

You can start editing the page by modifying `app/plan/[token]/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

```
app/
├── page.tsx                 # Landing page (redirects to new plan)
├── plan/[token]/page.tsx    # Dynamic route for plan tokens
├── api/plans/route.ts       # API for plan creation
└── ...
components/
├── whiteboard-planner.tsx   # Main whiteboard component
└── ui/                      # shadcn/ui components
lib/
├── database.ts              # Database utility functions
└── supabase.ts              # Supabase client
database/
└── schema.sql               # Database schema
```

## Usage

1. Visit the root URL to create a new travel plan
2. You'll be redirected to `/plan/{unique-token}`
3. Use the drawing tools to sketch your travel route
4. Click "Add Place" to add destination markers
5. Click "Share Plan" to get a shareable URL
6. Anyone with the URL can view and edit the plan

## Current Status

🚀 **Ready for Production** - Full Supabase integration completed!

### ✅ What's Working:
- **Token-based plan sharing** - Unique URLs for each travel plan
- **Database persistence** - All data saves to Supabase automatically
- **Real-time drawing** - Interactive canvas with multiple colors
- **Destination management** - Add, edit, and remove travel stops
- **Auto-save functionality** - Drawings and destinations save automatically
- **Editable plan titles** - Click to edit plan names
- **Share functionality** - Copy URLs to clipboard for sharing

### 🎯 **Features Implemented:**
- Interactive whiteboard with drawing tools
- Destination markers with notes and coordinates
- URL-based sharing (no authentication required)
- Database persistence via Supabase
- Real-time auto-save
- Plan title editing
- Token-based access control
- Clean, modern UI with shadcn/ui components

## Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial Mag-Drawing setup"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variables**:
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add the same variables from your `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Deploy**: Click "Deploy" and your app will be live!

### Other Deployment Options
- **Netlify**: Similar process, supports Next.js
- **Railway**: Good for full-stack apps
- **DigitalOcean App Platform**: Scalable hosting option

### Environment Variables for Production
Make sure to set these in your hosting platform:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
