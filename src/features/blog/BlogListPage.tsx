import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PenLine, Search, X } from 'lucide-react';
import { Mascot } from '../../components/shared/Mascot';
import { explain, isConfigured, listCategories, listPosts, PAGE_SIZE, type Category, type PostCard as Card } from './api';
import { Byline, CardSkeleton, Cover, PostCard } from './PostCard';
import { Seo } from '../seo/Seo';

export default function BlogListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';

  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<'loading' | 'ready' | 'more' | 'error'>('loading');
  const [error, setError] = useState('');
  const reqId = useRef(0);

  useEffect(() => {
    document.title = 'Blog · CyberHx';
    listCategories().then(setCategories).catch(() => undefined);
  }, []);

  // Keep the box in sync when the URL changes (back button, tag links).
  useEffect(() => setSearch(q), [q]);

  // Debounce typing into the URL.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (search.trim()) next.set('q', search.trim());
      else next.delete('q');
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [search, q, params, setParams]);

  const load = (p: number) => {
    const id = ++reqId.current;
    setState(p === 1 ? 'loading' : 'more');
    listPosts({ page: p, category, search: q, tag })
      .then(({ posts: rows, total: n }) => {
        if (id !== reqId.current) return;
        setPosts((prev) => (p === 1 ? rows : [...prev, ...rows]));
        setTotal(n);
        setPage(p);
        setState('ready');
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        setError(explain(e));
        setState('error');
      });
  };

  useEffect(() => {
    if (!isConfigured()) {
      setError(explain(null));
      setState('error');
      return;
    }
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, tag]);

  const setFilter = (k: 'category' | 'tag', v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };
  const clearAll = () => setParams(new URLSearchParams());

  const filtering = !!(q || category || tag);
  const [featured, rest] = useMemo(() => {
    if (filtering || !posts.length) return [null, posts] as const;
    return [posts[0], posts.slice(1)] as const;
  }, [posts, filtering]);

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-white">
      <Seo
        title={category ? `${category} — CyberHx Blog` : tag ? `#${tag} — CyberHx Blog` : 'CyberHx Blog — CTF Write-ups, Scam Alerts & Security Tutorials'}
        description="CTF write-ups, scam breakdowns and cybersecurity tutorials from the CyberHx community in India. Learn, practice and stay safe."
        path={category ? `/blog?category=${encodeURIComponent(category)}` : '/blog'}
        keywords="cybersecurity blog india, ctf writeups, scam alert, ethical hacking tutorials, malware analysis, bug bounty"
        jsonLd={
          posts.length
            ? {
                '@context': 'https://schema.org',
                '@type': 'Blog',
                name: 'CyberHx Blog',
                url: 'https://cyberhx.com/blog',
                blogPost: posts.slice(0, 12).map((p) => ({
                  '@type': 'BlogPosting',
                  headline: p.title,
                  url: `https://cyberhx.com/blog/${p.slug}`,
                  datePublished: p.published_at || undefined,
                  author: { '@type': 'Person', name: p.author_name },
                  image: p.cover_image && /^https?:\/\//.test(p.cover_image) ? p.cover_image : undefined,
                })),
              }
            : undefined
        }
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl">The blog</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
              CTF write-ups, scam breakdowns and tutorials from the CyberHx community.
            </p>
          </div>
          <Link to="/blog/write" className="btn btn-lime self-start md:self-auto">
            <PenLine size={17} /> Write a post
          </Link>
        </header>

        {/* Search + categories */}
        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative block lg:w-80">
            <span className="sr-only">Search posts</span>
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts"
              className="w-full rounded-xl border-2 border-line bg-panel py-2.5 pl-10 pr-9 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-glow"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
            {[{ id: '', name: 'All' }, ...categories].map((c) => {
              const on = (c.name === 'All' && !category) || c.name === category;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setFilter('category', c.name === 'All' ? '' : c.name)}
                  aria-pressed={on}
                  className={`whitespace-nowrap rounded-lg border-2 px-3.5 py-1.5 text-sm font-semibold transition ${
                    on ? 'border-lime bg-lime text-ink' : 'border-line text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {tag && (
          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            Tagged
            <span className="flex items-center gap-1 rounded-md bg-glow/10 px-2 py-0.5 font-semibold text-glow">
              {tag}
              <button type="button" aria-label="Remove tag filter" onClick={() => setFilter('tag', '')}><X size={13} /></button>
            </span>
          </p>
        )}

        {/* Content */}
        <div className="mt-10">
          {state === 'loading' && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-2xl border-2 border-line bg-panel p-10 text-center">
              <Mascot pose="confused" alt="" className="mx-auto w-32" />
              <h2 className="font-display mt-4 text-2xl">The blog couldn't load</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">{error}</p>
              {isConfigured() && (
                <button type="button" onClick={() => load(1)} className="btn btn-ghost mt-6">Try again</button>
              )}
            </div>
          )}

          {(state === 'ready' || state === 'more') && posts.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-line p-12 text-center">
              <Mascot pose={filtering ? 'confused' : 'point'} alt="" className="mx-auto w-32" />
              {filtering ? (
                <>
                  <h2 className="font-display mt-4 text-2xl">No posts match that</h2>
                  <p className="mt-2 text-muted">Try another word or category.</p>
                  <button type="button" onClick={clearAll} className="btn btn-ghost mt-6">Clear filters</button>
                </>
              ) : (
                <>
                  <h2 className="font-display mt-4 text-2xl">No posts yet</h2>
                  <p className="mt-2 text-muted">Be the first to write for the CyberHx blog.</p>
                  <Link to="/blog/write" className="btn btn-lime mt-6">Write the first post</Link>
                </>
              )}
            </div>
          )}

          {featured && (
            <Link
              to={`/blog/${featured.slug}`}
              className="group mb-10 grid overflow-hidden rounded-3xl border-2 border-line bg-panel transition hover:border-white/20 lg:grid-cols-[1.2fr_1fr]"
            >
              <div className="aspect-[16/9] overflow-hidden border-b-2 border-line lg:aspect-[16/11] lg:border-b-0 lg:border-r-2">
                <Cover src={featured.cover_image} alt="" seed={featured.slug} label={featured.category} className="transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <p className="text-sm font-semibold text-glow">
                  {featured.featured ? 'Featured · ' : 'Latest · '}
                  {featured.category}
                </p>
                <h2 className="font-display mt-3 text-3xl leading-tight group-hover:text-lime sm:text-4xl">{featured.title}</h2>
                <p className="mt-4 line-clamp-3 leading-7 text-muted">{featured.excerpt}</p>
                <div className="mt-7">
                  <Byline post={featured} />
                </div>
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}

          {posts.length > 0 && posts.length < total && (
            <div className="mt-12 text-center">
              <button type="button" onClick={() => load(page + 1)} disabled={state === 'more'} className="btn btn-ghost disabled:opacity-60">
                {state === 'more' ? 'Loading…' : `Show more (${total - posts.length} left)`}
              </button>
            </div>
          )}
          {posts.length > PAGE_SIZE && posts.length >= total && (
            <p className="mt-12 text-center text-sm text-muted">You've reached the end.</p>
          )}
        </div>
      </div>
    </div>
  );
}
