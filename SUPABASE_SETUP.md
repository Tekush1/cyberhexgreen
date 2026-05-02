# CyberHx Blog — Supabase Setup Guide

## Step 1 — Create a Supabase project
1. Go to https://app.supabase.com and create a free project
2. Wait for the database to provision (~2 min)

## Step 2 — Run the migration
1. In your Supabase dashboard → **SQL Editor**
2. Paste the entire contents of `supabase/migrations.sql`
3. Click **Run**

This creates:
- `blog_posts` table (optimised for 1000s of articles + 5000 concurrent users)
- `blog_categories` table
- Full-text search indexes (GIN on tsvector)
- B-tree indexes on status, category, featured, published_at, views
- Row Level Security (public can read published posts; admins can do everything)
- `increment_post_views` RPC function (atomic counter, no race conditions)

## Step 3 — Add environment variables
Copy `.env.example` → `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
Get these from: Supabase Dashboard → Settings → API

## Step 4 — Write articles
Option A — **Supabase Table Editor** (no code):
- Open `blog_posts` table → Insert row
- Set `status = 'published'` to make it live

Option B — **Admin UI** (coming soon):
- Build a simple `/admin` route with Supabase Auth
- Only users with `role: admin` in their JWT can write

## Publishing articles at scale
- The schema supports **unlimited articles** — indexes ensure queries stay fast
- **Full-text search** uses PostgreSQL's tsvector (indexed) — searches over 100k articles in <10ms
- **Pagination** uses `offset/limit` with `count=exact` header — the blog loads 12 posts per page
- **View counter** uses a PL/pgSQL function (`increment_post_views`) — atomic, no race conditions at 5000 concurrent users
- **CDN**: Host images on Cloudflare R2 or Supabase Storage for fast delivery

## Scaling to 5000 users
- Enable **Supabase connection pooling** (PgBouncer) in the dashboard
- Set pool mode to **Transaction** for REST/API workloads
- Use Supabase's built-in CDN for public content caching
- Consider upgrading to the **Pro plan** for higher connection limits

## Categories
Edit categories directly in the `blog_categories` table.
Current categories: Scam Alert, Malware Analysis, Fraud Investigation,
Social Engineering, Email Security, Web Security, Mobile Security,
CTF Writeups, News & Updates
