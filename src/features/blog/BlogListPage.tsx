import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Award, PenLine, Search, X } from 'lucide-react';
import { categoryCounts, explain, isConfigured, listAuthors, listCategories, listPosts, PAGE_SIZE, type Author, type Category, type PostCard as Card } from './api';
import { Byline, CardSkeleton, Cover, PostCard } from './PostCard';
import { compactNumber, sameText } from './utils';
import { Seo } from '../seo/Seo';
import { BlogCompanion } from './BlogCompanion';

export default function BlogListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';

  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [writers, setWriters] = useState<Author[]>([]);
  const [posts, setPosts] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<'loading' | 'ready' | 'more' | 'error'>('loading');
  const [error, setError] = useState('');
  const reqId = useRef(0);

  useEffect(() => {
    document.title = 'Blog · CyberHx';
    listCategories().then(setCategories).catch(() => undefined);
    categoryCounts().then(setCounts).catch(() => undefined);
    listAuthors(6).then(setWriters).catch(() => undefined);
  }, []);

  // Only categories that have posts (plus the one picked in the URL), each with its count.
  const chips = useMemo(() => {
    const all = categories.map((c) => c.name);
    const extra = counts ? [...counts.keys()].filter((n) => !all.includes(n)) : [];
    return [...all, ...extra]
      .filter((n) => !counts || (counts.get(n) ?? 0) > 0 || n === category)
      .sort((a, b) => (counts ? (counts.get(b) ?? 0) - (counts.get(a) ?? 0) : 0) || a.localeCompare(b));
  }, [categories, counts, category]);
  const totalPosts = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : null;

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
        description="CTF write-ups, scam breakdowns and cybersecurity tutorials from the global CyberHx community. Learn, practice and stay safe."
        path={category ? `/blog?category=${encodeURIComponent(category)}` : '/blog'}
        keywords="cybersecurity blog, ctf writeups, scam alert, ethical hacking tutorials, malware analysis, bug bounty"
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
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0b1020] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              The CyberHx blog
            </span>
            <h1 className="font-display mt-5 text-5xl text-white sm:text-6xl">
              Read, learn,{' '}
              <span className="relative inline-block">
                hack.
                <span aria-hidden="true" className="absolute -bottom-1 left-0 -z-10 h-[0.4em] w-full -rotate-1 rounded-sm bg-lime/70" />
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-white/55">
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
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              data-companion="search"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts"
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-9 text-sm text-white shadow-sm outline-none transition placeholder:text-white/35 focus:border-lime focus:ring-2 focus:ring-lime/30"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
            {['', ...chips].map((name) => {
              const on = name === category;
              const n = name ? counts?.get(name) : totalPosts;
              return (
                <button
                  key={name || 'all'}
                  type="button"
                  onClick={() => setFilter('category', name)}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                    on ? 'border-lime bg-lime text-ink' : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {name || 'All'}
                  {typeof n === 'number' && <span className={`text-xs tabular-nums ${on ? 'text-ink/60' : 'text-white/35'}`}>{n}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {tag && (
          <p className="mt-5 flex items-center gap-2 text-sm text-white/55">
            Tagged
            <span className="flex items-center gap-1 rounded-md bg-lime/20 px-2 py-0.5 font-semibold text-lime">
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
            <div className="rounded-3xl border border-white/[0.07] bg-[#0b1020] p-10 text-center">
              <h2 className="font-display text-2xl text-white">The blog couldn't load</h2>
              <p className="mx-auto mt-2 max-w-md text-white/55">{error}</p>
              {isConfigured() && (
                <button type="button" onClick={() => load(1)} className="btn btn-ghost mt-6">Try again</button>
              )}
            </div>
          )}

          {(state === 'ready' || state === 'more') && posts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center">
              {filtering ? (
                <>
                  <h2 className="font-display text-2xl text-white">No posts match that</h2>
                  <p className="mt-2 text-white/55">Try another word or category.</p>
                  <button type="button" onClick={clearAll} className="btn btn-ghost mt-6">Clear filters</button>
                </>
              ) : (
                <>
                  <h2 className="font-display mt-4 text-2xl text-white">No posts yet</h2>
                  <p className="mt-2 text-white/55">Be the first to write for the CyberHx blog.</p>
                  <Link to="/blog/write" className="btn btn-lime mt-6">Write the first post</Link>
                </>
              )}
            </div>
          )}

          {featured && (
            <Link
              to={`/blog/${featured.slug}`}
              className="group mb-10 grid overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.04] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_70px_-34px_rgba(16,24,40,0.3)] lg:grid-cols-[1.2fr_1fr]"
            >
              <div className="aspect-[16/9] overflow-hidden lg:aspect-[16/11]">
                <Cover src={featured.cover_image} alt="" eager seed={featured.slug} label={featured.category} className="transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-wide text-lime">
                  {featured.featured ? 'Featured · ' : 'Latest · '}
                  {featured.category}
                </p>
                <h2 className="font-display mt-3 text-3xl leading-tight text-white sm:text-4xl">{featured.title}</h2>
                {!sameText(featured.excerpt, featured.title) && <p className="mt-4 line-clamp-3 leading-7 text-white/55">{featured.excerpt}</p>}
                <div className="mt-7 border-t border-white/[0.06] pt-6">
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
            <p className="mt-12 text-center text-sm text-white/45">You've reached the end.</p>
          )}
        </div>

        {/* Top writers */}
        {!filtering && writers.length > 0 && (
          <section aria-labelledby="writers-h" className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="writers-h" className="font-display text-3xl text-white">Top writers</h2>
                <p className="mt-1 text-white/50">The people behind the posts. Write one and you're on this list.</p>
              </div>
              <Link to="/blog/write" className="text-sm font-semibold text-lime hover:underline">Write for CyberHx →</Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {writers.map((w, i) => (
                <li key={w.slug}>
                  <Link to={`/blog/author/${w.slug}`} className="group flex items-center gap-4 rounded-3xl border border-white/[0.07] bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-white/15">
                    {w.avatar
                      ? <img src={w.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
                      : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lg font-bold text-lime">{w.name[0]?.toUpperCase()}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-semibold text-white group-hover:text-lime">
                        <span className="truncate">{w.name}</span>
                        {i < 3 && <Award size={15} className="shrink-0 text-lime" aria-label="Top writer" />}
                      </span>
                      {w.role && <span className="block truncate text-sm text-white/45">{w.role}</span>}
                      <span className="mt-1 block text-xs text-white/40">{w.posts} post{w.posts === 1 ? '' : 's'} · {compactNumber(w.views)} reads · {compactNumber(w.likes)} likes</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <BlogCompanion signals={{ mode: 'list', state, total: Math.max(total, posts.length), filtering, q, category, tag }} />
    </div>
  );
}
