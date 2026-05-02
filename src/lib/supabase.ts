import { createClient } from '@supabase/supabase-js';

// ─── REPLACE WITH YOUR ACTUAL SUPABASE PROJECT VALUES ─────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'YOUR_ANON_KEY';
// ──────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: { 'x-app-name': 'cyberhx-blog' } },
});

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  tags: string[];
  author_name: string;
  author_avatar: string;
  author_role: string;
  published_at: string;
  updated_at: string;
  read_time: number;
  views: number;
  likes: number;
  comments_count: number;
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
}

export const PAGE_SIZE = 12;

export async function fetchPosts(opts: {
  page?: number;
  category?: string;
  search?: string;
  featured?: boolean;
  tag?: string;
}) {
  const { page = 1, category, search, featured, tag } = opts;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,cover_image,category,tags,author_name,author_avatar,author_role,published_at,read_time,views,likes,comments_count,featured', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);

  if (category && category !== 'all') query = query.eq('category', category);
  if (featured !== undefined) query = query.eq('featured', featured);
  if (tag) query = query.contains('tags', [tag]);
  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,author_name.ilike.%${search}%`);
  }

  return query;
}

export async function fetchPostBySlug(slug: string) {
  return supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single();
}

export async function fetchCategories() {
  return supabase.from('blog_categories').select('*').order('name');
}

export async function incrementViews(id: string) {
  return supabase.rpc('increment_post_views', { post_id: id });
}
