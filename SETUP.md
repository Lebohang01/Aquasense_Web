# AquaSense UJ Web Dashboard — Setup Guide

## Prerequisites
- Node.js 18+
- Your Supabase project URL and anon key

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Run development server
npm run dev
# Opens at http://localhost:3000

# 4. Build for production
npm run build
npm start
```

## Pages
| Route       | Description                    |
|-------------|-------------------------------|
| /           | Landing page                   |
| /login      | Sign in / Sign up              |
| /dashboard  | Live node cards + stats        |
| /map        | Interactive Leaflet campus map |
| /alerts     | Alert feed with resolve        |
| /history    | Readings log + Recharts chart  |
| /community  | Forum posts + new post modal   |
| /admin      | Admin panel (role-gated)       |
| /settings   | Account settings               |

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

## Deploy to Vercel (Free)
```bash
npm install -g vercel
vercel
# Follow prompts — add env vars in Vercel dashboard
```
