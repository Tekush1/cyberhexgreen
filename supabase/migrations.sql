-- ============================================================
-- CyberHx Blog — Supabase Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable pg_trgm for fast full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── blog_categories ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── blog_posts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_name TEXT NOT NULL,
  author_avatar TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT 'Contributor',
  published_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  read_time INT NOT NULL DEFAULT 3,
  views INT NOT NULL DEFAULT 0,
  likes INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(author_name,'')), 'C')
  ) STORED
);

-- ─── Indexes for performance at 1000s of posts + 5000 users ──
CREATE INDEX IF NOT EXISTS idx_posts_status_published ON blog_posts(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON blog_posts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON blog_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_posts_search ON blog_posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_views ON blog_posts(views DESC);

-- ─── Auto-update updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_posts_updated_at ON blog_posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── View counter (atomic, no race condition) ─────────────────
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN UPDATE blog_posts SET views = views + 1 WHERE id = post_id; END;
$$;

-- ─── Row-Level Security ───────────────────────────────────────
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "public_read_published" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Authenticated admins can do everything
CREATE POLICY "admin_all" ON blog_posts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "public_read_categories" ON blog_categories
  FOR SELECT USING (true);

-- ─── Seed categories ─────────────────────────────────────────
INSERT INTO blog_categories (name, slug, description) VALUES
  ('Scam Alert',         'scam-alert',        'Latest scam warnings and phishing campaigns'),
  ('Malware Analysis',   'malware-analysis',  'Deep dives into malware samples and trojans'),
  ('Fraud Investigation','fraud-investigation','Investigations into fraud rings and schemes'),
  ('Social Engineering', 'social-engineering','Manipulation tactics and awareness'),
  ('Email Security',     'email-security',    'Email threats, spoofing, and BEC attacks'),
  ('Web Security',       'web-security',      'Web vulnerabilities and bug bounty findings'),
  ('Mobile Security',    'mobile-security',   'Android & iOS threats'),
  ('CTF Writeups',       'ctf-writeups',      'Capture the Flag challenge solutions'),
  ('News & Updates',     'news-updates',      'CyberHx announcements and industry news')
ON CONFLICT (slug) DO NOTHING;

-- ─── Sample seed post ────────────────────────────────────────
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, category, tags, author_name, author_role, published_at, read_time, views, likes, featured, status)
VALUES (
  'Welcome to the CyberHx Security Blog',
  'welcome-cyberhx-blog',
  'The official launch of CyberHx Security Blog — your community hub for scam alerts, malware research, and cybersecurity insights.',
  '# Welcome to CyberHx Security Blog\n\nWe are excited to launch the official CyberHx blog powered by Supabase. This platform is built to scale to thousands of articles and millions of readers.\n\n## What to expect\n\n- Real-time scam alerts from our research team\n- In-depth malware analysis reports\n- CTF writeups and learning resources\n- Community submissions and bug bounty findings\n\nStay safe out there!',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80',
  'News & Updates',
  ARRAY['Announcement', 'CyberHx', 'Community'],
  'CyberHx Team',
  'Admin',
  now(),
  3, 500, 42, true, 'published'
) ON CONFLICT (slug) DO NOTHING;
