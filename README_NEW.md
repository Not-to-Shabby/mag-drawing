# Mag-Drawing - Travel Planning Whiteboard

A collaborative travel planning application with interactive whiteboard functionality, built with Next.js 15, React 19, and Supabase.

## 🚀 Live Demo

**Production URL:** https://drawing-plan.vercel.app

## ✨ Features

- 🎨 **Interactive Whiteboard**: Draw paths, routes, and annotations with color picker
- 📍 **Destination Markers**: Add locations with notes and coordinates
- 🔗 **Token-Based Sharing**: Share plans via unique URLs without authentication
- 💾 **Auto-Save**: Automatic persistence to Supabase database
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Offline Mode**: Graceful fallback when database is unavailable
- 🎯 **Real-Time Collaboration**: Multiple users can work on the same plan

## 🛠️ Technology Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Frontend**: React 19, TypeScript 5.8.3
- **Styling**: Tailwind CSS 4.1.8, shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Canvas**: HTML5 Canvas API

## 🏗️ Architecture

```
Next.js App Router Structure:
├── app/
│   ├── page.tsx              # Homepage with auto-redirect
│   ├── layout.tsx            # Root layout and metadata
│   ├── globals.css           # Global styles
│   ├── plan/[token]/         # Dynamic routes for plan sharing
│   └── api/                  # API endpoints
├── components/
│   ├── whiteboard-planner.tsx # Main interactive component
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── database.ts           # Supabase operations
│   ├── supabase.ts           # Client configuration
│   └── utils.ts              # Utility functions
└── database/
    └── schema.sql            # PostgreSQL schema
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (optional for offline mode)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mag-drawing.git
   cd mag-drawing
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup** (Optional - for database features)
   ```bash
   cp .env.example .env.local
   ```
   
   Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup** (Optional)
   - Create a new Supabase project
   - Run the SQL schema from `database/schema.sql` in the SQL Editor
   - Enable Row Level Security (RLS) policies

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Open in Browser**
   Navigate to `http://localhost:3000`

## 📦 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables**
   Add your Supabase credentials in the Vercel dashboard.

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 🎯 Usage

1. **Create a Plan**: Visit the homepage to automatically generate a new plan
2. **Draw on Canvas**: Use the drawing tools to sketch routes and annotations
3. **Add Destinations**: Click on the canvas to add location markers with notes
4. **Share Plans**: Copy the URL to share with collaborators
5. **Collaborative Planning**: Multiple users can access the same plan via the shared URL

## 🔧 API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/plans` - Create new plan token

## 🗄️ Database Schema

The application uses three main tables:
- `plans` - Travel plan metadata
- `destinations` - Location markers with coordinates
- `drawings` - Canvas drawing paths and strokes

See `database/schema.sql` for complete schema definition.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛟 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See `/docs` folder for detailed guides
- **Live Demo**: https://drawing-plan.vercel.app

## 🔮 Roadmap

- [ ] Real-time collaboration with WebSockets
- [ ] Export plans to PDF/PNG
- [ ] Plan templates and themes
- [ ] Mobile app version
- [ ] Integration with mapping services
- [ ] User authentication (optional)

---

**Built with ❤️ for collaborative travel planning**
