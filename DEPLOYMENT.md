# Vercel Deployment Guide for Mag-Drawing

## 🚀 Quick Deployment Steps

### 1. Prepare Repository
```bash
# Add all files
git add .

# Commit changes
git commit -m "Ready for Vercel deployment - Mag-Drawing travel planner"

# Push to GitHub (if you have a remote repository)
git push origin master
```

### 2. Deploy to Vercel

#### Option A: Via Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy project
vercel

# Follow the prompts:
# - Set up and deploy? [Y/n] y
# - Which scope? [your-username]
# - Link to existing project? [y/N] n
# - Project name: mag-drawing
# - Directory: ./
# - Override settings? [y/N] n
```

#### Option B: Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js settings
5. Add environment variables (see below)
6. Click "Deploy"

### 3. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vcndoiiubzaxymjemeog.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbmRvaWl1YnpheHltamVtZW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MzM1NDYsImV4cCI6MjA2NTIwOTU0Nn0.Fmwm_o_4df0PM9-5PdQ_N21eH4X0t2RPjzHu3NhN1yQ` |

**Important**: Set these for all environments (Production, Preview, Development)

### 4. Verify Deployment

1. **Check Build Status**: Monitor deployment in Vercel dashboard
2. **Test Application**: Visit your deployed URL
3. **Test Features**:
   - Create new plan (should redirect to `/plan/[token]`)
   - Draw on canvas
   - Add destinations
   - Share plan URL
   - Verify data persistence in Supabase

### 5. Custom Domain (Optional)

1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed by Vercel

## 🔧 Deployment Configuration

### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vcndoiiubzaxymjemeog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## ✅ Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] New plans create unique tokens
- [ ] Drawing canvas works
- [ ] Destination markers can be added
- [ ] Share functionality works
- [ ] Data persists in Supabase
- [ ] URLs are shareable between users
- [ ] Mobile responsiveness works

## 🌐 Expected URLs

After deployment, your app will be available at:
- **Production**: `https://mag-drawing-[random].vercel.app`
- **Plan URLs**: `https://your-domain.com/plan/[unique-token]`

## 🐛 Troubleshooting

### Build Failures
- Check environment variables are set
- Verify all dependencies in `package.json`
- Check for TypeScript errors

### Runtime Errors
- Verify Supabase connection
- Check database tables exist
- Ensure RLS policies are correct

### Supabase Connection Issues
- Verify environment variables in Vercel
- Test database connection from local environment
- Check Supabase URL and API key are correct

## 🎉 Success!

Once deployed, your Mag-Drawing travel planner will be live and ready for users worldwide to create and share travel plans!
