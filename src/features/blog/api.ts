// Every blog read and write goes through this file.
// Public reads use the anon client. Admin writes use the admin's login token
// (set by /admin) so Row Level Security knows who is writing.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { readTime, slugify } from './utils';

const URL_ = import.meta.env.VITE_SUPABASE_URL ?? '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const ADMIN_TOKEN_KEY = 'cyberhx_admin_token';
export const MEDIA_BUCKET = 'blog-media';
export const PAGE_SIZE = 9;

export const isConfigured = () => /^https:\/\/.+\.supabase\.co/.test(URL_) && KEY.length > 20;

export type PostStatus = 'draft' | 'published' | 'archived';

export interface Post {
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
  published_at: string | null;
  updated_at: string | null;
  read_time: number;
  views: number;
  likes: number;
  featured: boolean;
  status: PostStatus;
  /** Set by the database from author_name ("Kushagra Dwivedi" -> "kushagra-dwivedi"); links to /blog/author/<slug>. */
  author_slug: string | null;
  author_bio: string;
  author_url: string;
  /** CTF write-ups only. */
  difficulty: Difficulty | null;
  /** The CyberHx event this post is about (/events/<slug>). */
  event_slug: string | null;
  /** Set by the database: the first image in the post's text, used as the cover when none was set. */
  first_image: string | null;
}
export type Difficulty = 'easy' | 'medium' | 'hard' | 'insane';
export type PostCard = Omit<Post, 'content' | 'updated_at' | 'status' | 'author_bio' | 'author_url'>;

/** A writer, from the public view blog_authors (published posts only). */
export interface Author {
  slug: string;
  name: string;
  avatar: string | null;
  role: string | null;
  bio: string | null;
  url: string | null;
  posts: number;
  likes: number;
  views: number;
  last_post: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

const CARD_FIELDS =
  'id,title,slug,excerpt,cover_image,category,tags,author_name,author_avatar,author_role,author_slug,published_at,read_time,views,likes,featured,difficulty,event_slug,first_image';

/** The picture for a card: the cover, else the first image in the post. */
export const coverOf = (p: Pick<Post, 'cover_image' | 'first_image'>) => p.cover_image || p.first_image || '';

/** A friendly message for any Supabase error. */
export const explain = (e: unknown): string => {
  const err = e as { code?: string; message?: string; status?: number; statusCode?: string } | null;
  const code = String(err?.code ?? '');
  const msg = String(err?.message ?? '');
  if (!isConfigured()) return 'The blog is not connected to Supabase yet.';
  if (code === 'PGRST205' || code === '42P01' || /relation .* does not exist/i.test(msg))
    return 'Blog tables are missing. Run the SQL files in supabase/ in the Supabase SQL editor.';
  if (/bucket not found/i.test(msg)) return 'Image storage is not set up. Run supabase/blog_v2.sql in Supabase.';
  if (code === '23505') return 'A post with this link already exists. Change the title or the link.';
  if (code === '42501' || /row-level security|not authorized|permission/i.test(msg))
    return 'You are not allowed to do that. Log in at /admin with an admin account.';
  if (/JWT|expired/i.test(msg)) return 'Your admin login expired. Log in again at /admin.';
  if (/payload too large|exceeded the maximum/i.test(msg)) return 'That file is too big. The limit is 8 MB.';
  if (/mime type/i.test(msg)) return 'That file type is not allowed. Use JPG, PNG, WebP, GIF or PDF.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Could not reach the server. Check your connection and try again.';
  return msg || 'Something went wrong. Try again.';
};

/* ───────────── Admin session ───────────── */

export const adminToken = () => {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

let adminClientCache: { token: string; client: SupabaseClient } | null = null;
const adminClient = () => {
  const token = adminToken();
  if (!token) throw new Error('not authorized');
  if (adminClientCache?.token !== token) {
    adminClientCache = {
      token,
      client: createClient(URL_, KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }),
    };
  }
  return adminClientCache.client;
};

/** True only when the stored login is staff allowed to manage the blog (owner or campaign/newsletter role). */
export async function checkAdmin(): Promise<boolean> {
  if (!adminToken() || !isConfigured()) return false;
  try {
    const { data, error } = await adminClient().rpc('can', { p_area: 'blog' });
    return !error && data === true;
  } catch {
    return false;
  }
}

/* ───────────── Public reads ───────────── */

export async function listPosts(opts: {
  page?: number;
  /** One category, or the categories of a section (any of them). */
  category?: string | string[];
  search?: string;
  tag?: string;
  pageSize?: number;
  /** 'views': most read first (write-ups); 'latest' (default): featured, then newest. */
  sort?: 'latest' | 'views';
}) {
  const { page = 1, category, search, tag, pageSize = PAGE_SIZE, sort = 'latest' } = opts;
  const from = (page - 1) * pageSize;
  let q = supabase.from('blog_posts').select(CARD_FIELDS, { count: 'exact' }).eq('status', 'published');
  q = sort === 'views'
    ? q.order('views', { ascending: false }).order('published_at', { ascending: false })
    : q.order('featured', { ascending: false }).order('published_at', { ascending: false });
  q = q.range(from, from + pageSize - 1);
  if (Array.isArray(category)) {
    if (category.length === 1) q = q.eq('category', category[0]);
    else if (category.length) q = q.in('category', category);
  } else if (category) q = q.eq('category', category);
  if (tag) q = q.contains('tags', [tag]);
  const term = search?.trim().replace(/[%,()]/g, ' ');
  if (term) q = q.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%,author_name.ilike.%${term}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { posts: (data ?? []) as PostCard[], total: count ?? 0 };
}

export async function getPost(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data as Post | null;
}

/** Up to 3 posts to read next: same category first, then the newest others, never the post itself. */
export async function relatedPosts(post: Pick<Post, 'id' | 'category'>) {
  const [same, latest] = await Promise.all([
    supabase.from('blog_posts').select(CARD_FIELDS).eq('status', 'published').eq('category', post.category)
      .neq('id', post.id).order('published_at', { ascending: false }).limit(3),
    supabase.from('blog_posts').select(CARD_FIELDS).eq('status', 'published').neq('id', post.id)
      .order('published_at', { ascending: false }).limit(6),
  ]);
  const seen = new Set<string>();
  return ([...(same.data ?? []), ...(latest.data ?? [])] as PostCard[])
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .slice(0, 3);
}

/** How many published posts each category has (empty categories are left out). */
export async function categoryCounts() {
  const { data, error } = await supabase.from('blog_category_counts').select('category,posts');
  if (error) throw error;
  return new Map(((data ?? []) as { category: string; posts: number }[]).map((r) => [r.category, r.posts]));
}

/** Writers ranked by published posts, then likes. */
export async function listAuthors(limit = 6) {
  const { data, error } = await supabase
    .from('blog_authors')
    .select('*')
    .order('posts', { ascending: false })
    .order('likes', { ascending: false })
    .order('views', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Author[];
}

export async function getAuthor(slug: string) {
  const { data, error } = await supabase.from('blog_authors').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data as Author | null;
}

export async function postsByAuthor(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(CARD_FIELDS)
    .eq('status', 'published')
    .eq('author_slug', slug)
    .order('published_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as PostCard[];
}

/** Write-ups and posts about one CyberHx event (/events/<slug>), most read first. */
export async function postsForEvent(eventSlug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(CARD_FIELDS)
    .eq('status', 'published')
    .eq('event_slug', eventSlug)
    .order('views', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []) as PostCard[];
}

/** Every published write-up card (most read first), for the Write-ups section's by-event and by-writer views. */
export async function listWriteups(limit = 300) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(CARD_FIELDS)
    .eq('status', 'published')
    .eq('category', 'CTF Writeups')
    .order('views', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PostCard[];
}

/** Group cards by a key, keeping the incoming order inside each group; groups with the most views (then posts) first. */
export function groupCards<K extends string>(cards: PostCard[], key: (c: PostCard) => K | null) {
  const groups = new Map<K, PostCard[]>();
  for (const c of cards) {
    const k = key(c);
    if (!k) continue;
    const g = groups.get(k);
    if (g) g.push(c);
    else groups.set(k, [c]);
  }
  return [...groups.entries()].sort((a, b) => viewsOf(b[1]) - viewsOf(a[1]) || b[1].length - a[1].length);
}

export const viewsOf = (cards: Pick<PostCard, 'views'>[]) => cards.reduce((n, c) => n + (Number(c.views) || 0), 0);

export async function listCategories() {
  const { data, error } = await supabase.from('blog_categories').select('id,name,slug').order('name');
  if (error) throw error;
  return (data ?? []) as Category[];
}

export const addView = (id: string) => supabase.rpc('increment_post_views', { post_id: id }).then(() => undefined);

export async function likePost(id: string, delta: 1 | -1) {
  const { data, error } = await supabase.rpc('like_post', { post_id: id, delta });
  if (error) throw error;
  return typeof data === 'number' ? data : null;
}

/* ───────────── Writing ───────────── */

export interface Draft {
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  tags: string[];
  author_name: string;
  author_role: string;
  author_avatar: string;
  author_bio: string;
  author_url: string;
  difficulty: Difficulty | '';
  event_slug: string;
  slug: string;
  featured: boolean;
}

/** Only https links are kept (LinkedIn, GitHub, a personal site). */
export const cleanUrl = (u: string) => {
  const t = u.trim();
  if (!t) return '';
  const withScheme = /^https?:\/\//i.test(t) ? t.replace(/^http:/i, 'https:') : `https://${t}`;
  return /^https:\/\/[^\s"'<>]{3,300}$/.test(withScheme) ? withScheme : '';
};

/** Community writers: send for review. Email is private and only admins can read it. */
export async function submitForReview(d: Draft, email: string) {
  const { error } = await supabase.from('article_submissions').insert({
    title: d.title.trim(),
    excerpt: d.excerpt.trim(),
    content: d.content,
    cover_image: d.cover_image,
    category: d.category,
    tags: d.tags,
    author_name: d.author_name.trim(),
    author_email: email.trim(),
    author_role: d.author_role.trim() || 'Contributor',
    author_avatar: d.author_avatar,
    author_bio: d.author_bio.trim().slice(0, 300),
    author_url: cleanUrl(d.author_url),
    difficulty: d.category === 'CTF Writeups' && d.difficulty ? d.difficulty : null,
    event_slug: d.event_slug || null,
    status: 'pending',
  });
  if (error) throw error;
}

/** Admins: create or update a post. Retries with a suffix if the link is taken. */
export async function savePost(d: Draft, status: PostStatus, id?: string): Promise<Post> {
  const db = adminClient();
  const row = {
    title: d.title.trim(),
    excerpt: d.excerpt.trim(),
    content: d.content,
    cover_image: d.cover_image,
    category: d.category,
    tags: d.tags,
    author_name: d.author_name.trim() || 'CyberHx Team',
    author_role: d.author_role.trim() || 'CyberHx',
    author_avatar: d.author_avatar,
    author_bio: d.author_bio.trim().slice(0, 300),
    author_url: cleanUrl(d.author_url),
    difficulty: d.category === 'CTF Writeups' && d.difficulty ? d.difficulty : null,
    event_slug: d.event_slug || null,
    featured: d.featured,
    read_time: readTime(d.content), // the database recomputes this from the text
    status,
  };
  let slug = slugify(d.slug || d.title);
  for (let attempt = 0; attempt < 4; attempt++) {
    const payload = { ...row, slug };
    const res = id
      ? await db.from('blog_posts').update(payload).eq('id', id).select('*').single()
      : await db
          .from('blog_posts')
          // A draft has no publish date yet; it is stamped below when it first goes live.
          .insert({ ...payload, published_at: status === 'published' ? new Date().toISOString() : null })
          .select('*')
          .single();
    if (!res.error) {
      // Stamp the publish time the first time a draft goes live.
      const saved = res.data as Post;
      if (status === 'published' && id && !saved.published_at) {
        await db.from('blog_posts').update({ published_at: new Date().toISOString() }).eq('id', saved.id);
      }
      return saved;
    }
    if (res.error.code !== '23505') throw res.error;
    slug = `${slugify(d.slug || d.title)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new Error('Could not find a free link for this post.');
}

export async function getPostForEdit(id: string) {
  const { data, error } = await adminClient().from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Post | null;
}

export async function deletePost(id: string) {
  const { error } = await adminClient().from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

/* ───────────── Uploads ───────────── */

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

/** Shrinks big photos to at most 1920px wide WebP before upload. GIFs and PDFs are left alone. */
async function compress(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / bmp.width);
    if (scale === 1 && file.size < 400 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export interface Uploaded {
  url: string;
  name: string;
  isImage: boolean;
}

export async function uploadFile(file: File, asAdmin: boolean): Promise<Uploaded> {
  if (!ALLOWED.includes(file.type)) throw new Error('That file type is not allowed. Use JPG, PNG, WebP, GIF or PDF.');
  const body = await compress(file);
  if (body.size > MAX_BYTES) throw new Error('That file is too big. The limit is 8 MB.');

  const isWebp = body !== file && body.type === 'image/webp';
  const base = slugify(file.name.replace(/\.[^.]+$/, '')).slice(0, 40) || 'file';
  // Extension from the checked file type, never from the file name (no x.html posing as an image).
  const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' };
  const ext = isWebp ? 'webp' : EXT[file.type] || 'bin';
  const d = new Date();
  const path = `${asAdmin ? 'posts' : 'submissions'}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}-${base}.${ext}`;

  const client = asAdmin ? adminClient() : supabase;
  const { error } = await client.storage
    .from(MEDIA_BUCKET)
    .upload(path, body, { contentType: isWebp ? 'image/webp' : file.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, name: file.name, isImage: file.type.startsWith('image/') };
}
