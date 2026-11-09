import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, PenLine, Search, X } from 'lucide-react';
import {
  categoryCounts, explain, groupCards, isConfigured, listAuthors, listPosts, listWriteups, PAGE_SIZE,
  type Author, type PostCard as Card,
} from './api';
import { Byline, CardSkeleton, Cover, PostCard, WriterCard } from './PostCard';
import { authorLabel, DIFFICULTY, isAnonymous, sameText } from './utils';
import { Seo, breadcrumbLd, SITE } from '../seo/Seo';
import { BlogCompanion } from './BlogCompanion';
import { BLOG_SECTIONS, blogSection, sectionForCategory } from '../../../shared/blogSections';
import { eventBySlug } from '../../data/events';

/* /blog and /blog/<section>.
   The hub shows everything, newest first. Each section (News, Write-ups, Tutorials, Scam alerts, Research) is a
   page of its own with a stable URL, so search engines can rank it. Write-ups can also be read by event or by
   writer, because many players write about the same CTF. */

type View = 'latest' | 'event' | 'writer';
const VIEWS: { id: View; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'event', label: 'By event' },
  { id: 'writer', label: 'By writer' },
];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'] as const;

const tabClass = (on: boolean) =>
  `-mb-px block whitespace-nowrap border-b-2 pb-3 text-[15px] font-semibold transition ${
    on ? 'border-lime text-white' : 'border-transparent text-white/50 hover:text-white'
  }`;
const textFilterClass = (on: boolean) =>
  `whitespace-nowrap text-[15px] transition ${on ? 'font-semibold text-white' : 'text-white/50 hover:text-white'}`;

export default function BlogListPage({ section: sectionSlug }: { section?: string }) {
  const section = sectionSlug ? blogSection(sectionSlug) : null;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const rawCategory = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';
  const viewParam = params.get('view') as View | null;
  const view: View = section?.slug === 'writeups' && viewParam && VIEWS.some((v) => v.id === viewParam) ? viewParam : 'latest';
  const difficulty = params.get('difficulty') ?? '';
  // Inside a section only its own categories can narrow the list.
  const category = section ? (section.categories.includes(rawCategory) ? rawCategory : '') : rawCategory;

  const [search, setSearch] = useState(q);
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [writers, setWriters] = useState<Author[]>([]);
  const [posts, setPosts] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<'loading' | 'ready' | 'more' | 'error'>('loading');
  const [error, setError] = useState('');
  const [writeups, setWriteups] = useState<Card[] | null>(null);
  const [writeupsError, setWriteupsError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const reqId = useRef(0);

  // Old links (/blog?category=CTF%20Writeups) land on the section page that now owns that category.
  useEffect(() => {
    if (section || !rawCategory) return;
    const home = sectionForCategory(rawCategory);
    if (!home) return;
    const next = new URLSearchParams(params);
    if (home.categories.length === 1) next.delete('category');
    navigate({ pathname: `/blog/${home.slug}`, search: next.toString() ? `?${next}` : '' }, { replace: true });
  }, [section, rawCategory, params, navigate]);

  useEffect(() => {
    categoryCounts().then(setCounts).catch(() => undefined);
    if (!section) listAuthors(6).then(setWriters).catch(() => undefined);
  }, [section]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setExpanded(new Set());
  }, [sectionSlug]);

  const sectionCount = (slugs: string[]) => (counts ? slugs.reduce((n, c) => n + (counts.get(c) ?? 0), 0) : null);
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
    listPosts({ page: p, category: category || section?.categories || undefined, search: q, tag })
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
  }, [q, category, tag, sectionSlug]);

  // Every write-up at once, for the by-event and by-writer views and the difficulty filter.
  useEffect(() => {
    if (section?.slug !== 'writeups' || writeups || !isConfigured()) return;
    if (view === 'latest' && !difficulty) return;
    listWriteups().then(setWriteups).catch((e) => setWriteupsError(explain(e)));
  }, [section, view, difficulty, writeups]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };
  const clearAll = () => setParams(new URLSearchParams());

  const filtering = !!(q || category || tag || difficulty);
  const [featured, rest] = useMemo(() => {
    if (filtering || !posts.length) return [null, posts] as const;
    return [posts[0], posts.slice(1)] as const;
  }, [posts, filtering]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /* ── Copy and SEO ── */
  const title = section
    ? category && section.categories.length > 1
      ? `${category} — ${section.name} · CyberHx Blog`
      : section.title
    : tag
      ? `#${tag} — CyberHx Blog`
      : 'CyberHx Blog — CTF Write-ups, News, Tutorials and Security Research';
  const description = section
    ? section.description
    : 'Write-ups, news, tutorials, scam alerts and research from the CyberHx community in 90+ countries. Learn, practice and stay ahead.';
  const path = section ? `/blog/${section.slug}` : '/blog';
  const heading = section ? section.name : 'Blog';
  const lead = section
    ? section.lead
    : 'Write-ups, news, tutorials and research from a community of players in 90+ countries.';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': section ? 'CollectionPage' : 'Blog',
      name: section ? `${section.name} · CyberHx Blog` : 'CyberHx Blog',
      url: SITE + path,
      description,
      ...(posts.length
        ? {
            [section ? 'hasPart' : 'blogPost']: posts.slice(0, 12).map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              url: `${SITE}/blog/${p.slug}`,
              datePublished: p.published_at || undefined,
              author: { '@type': 'Person', name: authorLabel(p.author_name) },
              image: p.cover_image && /^https?:\/\//.test(p.cover_image) ? p.cover_image : undefined,
            })),
          }
        : {}),
    },
    breadcrumbLd(section ? [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: section.name, path }] : [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }]),
  ];

  const showWriteupViews = section?.slug === 'writeups';
  const grouped = view !== 'latest';

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-white">
      <Seo title={title} description={description} path={path} noindex={!!(q || tag || difficulty || (section && category))} jsonLd={jsonLd}
        keywords={section ? `${section.categories.join(', ').toLowerCase()}, cyberhx` : 'cybersecurity blog, ctf writeups, scam alert, ethical hacking tutorials, malware analysis, bug bounty'} />
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            {section && <p className="text-[15px] text-white/55"><Link to="/blog" className="transition hover:text-white">CyberHx Blog</Link></p>}
            <h1 className={`font-display text-5xl text-white sm:text-6xl ${section ? 'mt-3' : ''}`}>{heading}</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-white/55">{lead}</p>
          </div>
          <div className="flex items-center gap-5 self-start md:self-auto">
            <Link to="/blog/feedback" className="text-sm font-semibold text-white/60 transition hover:text-white">Share feedback</Link>
            <Link to="/blog/write" className="btn btn-lime"><PenLine size={17} /> Write a post</Link>
          </div>
        </header>

        {/* Sections */}
        <nav aria-label="Blog sections" className="mt-10 border-b border-white/10">
          <ul className="hide-scrollbar -mx-5 flex gap-7 overflow-x-auto px-5 lg:mx-0 lg:px-0">
            <li><NavLink to="/blog" end className={({ isActive }) => tabClass(isActive)}>All{typeof totalPosts === 'number' && <Count n={totalPosts} />}</NavLink></li>
            {BLOG_SECTIONS.map((s) => {
              const n = sectionCount(s.categories);
              return (
                <li key={s.slug}>
                  <NavLink to={`/blog/${s.slug}`} className={({ isActive }) => tabClass(isActive)}>{s.name}{typeof n === 'number' && <Count n={n} />}</NavLink>
                </li>
              );
            })}
            <li className="lg:ml-auto"><NavLink to="/blog/writers" className={({ isActive }) => tabClass(isActive)}>Writers</NavLink></li>
          </ul>
        </nav>

        {/* Search + refinements */}
        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block lg:w-80">
            <span className="sr-only">Search {section ? section.name.toLowerCase() : 'posts'}</span>
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              data-companion="search"
              onChange={(e) => setSearch(e.target.value)}
              placeholder={section ? `Search ${section.name.toLowerCase()}` : 'Search the blog'}
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-9 text-sm text-white shadow-sm outline-none transition placeholder:text-white/35 focus:border-lime focus:ring-2 focus:ring-lime/30"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X size={16} />
              </button>
            )}
          </label>

          {showWriteupViews && (
            <div className="hide-scrollbar -mx-5 flex items-center gap-6 overflow-x-auto px-5 lg:mx-0 lg:px-0">
              <div role="tablist" aria-label="Arrange write-ups" className="flex items-center gap-5">
                {VIEWS.map((v) => (
                  <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => setParam('view', v.id === 'latest' ? '' : v.id)} className={textFilterClass(view === v.id)}>
                    {v.label}
                  </button>
                ))}
              </div>
              <span aria-hidden="true" className="h-4 w-px shrink-0 bg-white/15" />
              <div className="flex items-center gap-5" aria-label="Difficulty">
                <button type="button" onClick={() => setParam('difficulty', '')} className={textFilterClass(!difficulty)}>Any level</button>
                {DIFFICULTIES.map((d) => (
                  <button key={d} type="button" onClick={() => setParam('difficulty', d === difficulty ? '' : d)} aria-pressed={difficulty === d} className={textFilterClass(difficulty === d)}>
                    {DIFFICULTY[d].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {section && !showWriteupViews && section.categories.length > 1 && (
            <div className="hide-scrollbar -mx-5 flex items-center gap-5 overflow-x-auto px-5 lg:mx-0 lg:px-0" aria-label="Topics">
              <button type="button" onClick={() => setParam('category', '')} className={textFilterClass(!category)}>All topics</button>
              {section.categories
                .filter((c) => !counts || (counts.get(c) ?? 0) > 0 || c === category)
                .map((c) => (
                  <button key={c} type="button" onClick={() => setParam('category', c === category ? '' : c)} aria-pressed={category === c} className={textFilterClass(category === c)}>
                    {c}{counts && <Count n={counts.get(c) ?? 0} />}
                  </button>
                ))}
            </div>
          )}
        </div>

        {tag && (
          <p className="mt-5 flex items-center gap-2 text-sm text-white/55">
            Tagged
            <span className="flex items-center gap-1 rounded-md bg-lime/20 px-2 py-0.5 font-semibold text-lime">
              {tag}
              <button type="button" aria-label="Remove tag filter" onClick={() => setParam('tag', '')}><X size={13} /></button>
            </span>
          </p>
        )}

        {/* Content */}
        <div className="mt-10">
          {grouped || difficulty ? (
            <WriteupViews
              view={view}
              difficulty={difficulty}
              search={q}
              cards={writeups}
              error={writeupsError}
              expanded={expanded}
              onToggle={toggle}
              onClear={clearAll}
            />
          ) : (
            <>
              {state === 'loading' && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
                </div>
              )}

              {state === 'error' && (
                <div className="rounded-3xl border border-white/[0.07] bg-[#0b1020] p-10 text-center">
                  <h2 className="font-display text-2xl text-white">The blog couldn't load</h2>
                  <p className="mx-auto mt-2 max-w-md text-white/55">{error}</p>
                  {isConfigured() && <button type="button" onClick={() => load(1)} className="btn btn-ghost mt-6">Try again</button>}
                </div>
              )}

              {(state === 'ready' || state === 'more') && posts.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center">
                  {filtering ? (
                    <>
                      <h2 className="font-display text-2xl text-white">Nothing matches that</h2>
                      <p className="mt-2 text-white/55">Try another word or topic.</p>
                      <button type="button" onClick={clearAll} className="btn btn-ghost mt-6">Clear filters</button>
                    </>
                  ) : (
                    <>
                      <h2 className="font-display text-2xl text-white">{section ? `No ${section.name.toLowerCase()} yet` : 'No posts yet'}</h2>
                      <p className="mt-2 text-white/55">{section?.slug === 'writeups' ? 'Solved a CyberHx challenge? Write it up and it goes here.' : 'Be the first to write for the CyberHx blog.'}</p>
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
                <p className="mt-12 text-center text-sm text-white/45">That is everything, for now.</p>
              )}
            </>
          )}
        </div>

        {/* Hub only: the sections, then the writers */}
        {!section && !filtering && (
          <section aria-labelledby="sections-h" className="mt-20 border-t border-white/10 pt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="sections-h" className="font-display text-3xl text-white">Read by section</h2>
              <p className="max-w-md text-[15px] leading-7 text-white/50">Five sections, each with its own page. Follow the one that fits what you are working on.</p>
            </div>
            <ul className="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {BLOG_SECTIONS.map((s) => {
                const n = sectionCount(s.categories);
                return (
                  <li key={s.slug}>
                    <Link to={`/blog/${s.slug}`} className="group grid gap-2 py-6 sm:grid-cols-[14rem_1fr_auto] sm:items-baseline sm:gap-8">
                      <span className="font-display text-2xl text-white">{s.name}</span>
                      <span className="text-[15px] leading-7 text-white/55">{s.lead}</span>
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-white/70 transition group-hover:text-white">
                        {typeof n === 'number' ? `${n} ${n === 1 ? 'post' : 'posts'}` : 'Open'}
                        <ArrowRight size={16} className="text-lime transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!section && !filtering && writers.length > 0 && (
          <section aria-labelledby="writers-h" className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="writers-h" className="font-display text-3xl text-white">Top writers</h2>
                <p className="mt-1 text-white/50">The people behind the posts. Publish one and you are on this list.</p>
              </div>
              <Link to="/blog/writers" className="text-sm font-semibold text-lime hover:underline">All writers →</Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {writers.map((w) => <WriterCard key={w.slug} w={w} />)}
            </ul>
          </section>
        )}
      </div>
      <BlogCompanion signals={{ mode: 'list', state, total: Math.max(total, posts.length), filtering, q, category: category || section?.name || '', tag }} />
    </div>
  );
}

const Count = ({ n }: { n: number }) => (n > 0 ? <span className="ml-1.5 text-[13px] font-medium tabular-nums text-white/35">{n}</span> : null);

/* Write-ups arranged by event or by writer, or the latest ones at one difficulty. All client-side from one load. */
function WriteupViews({ view, difficulty, search, cards, error, expanded, onToggle, onClear }: {
  view: View;
  difficulty: string;
  search: string;
  cards: Card[] | null;
  error: string;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onClear: () => void;
}) {
  const term = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      (cards ?? []).filter(
        (c) =>
          (!difficulty || c.difficulty === difficulty) &&
          (!term || `${c.title} ${c.excerpt} ${c.author_name}`.toLowerCase().includes(term)),
      ),
    [cards, difficulty, term],
  );

  if (error) {
    return (
      <div className="rounded-3xl border border-white/[0.07] bg-[#0b1020] p-10 text-center">
        <h2 className="font-display text-2xl text-white">The write-ups couldn't load</h2>
        <p className="mx-auto mt-2 max-w-md text-white/55">{error}</p>
      </div>
    );
  }
  if (!cards) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  if (!filtered.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center">
        <h2 className="font-display text-2xl text-white">No write-ups match that</h2>
        <p className="mt-2 text-white/55">Try another level or clear the search.</p>
        <button type="button" onClick={onClear} className="btn btn-ghost mt-6">Clear filters</button>
      </div>
    );
  }

  if (view === 'latest') {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    );
  }

  const groups =
    view === 'event'
      ? groupCards(filtered, (c) => c.event_slug || '_other')
      : groupCards(filtered, (c) => (c.author_slug && !isAnonymous(c.author_name) ? c.author_slug : '_anon'));
  // Named groups first; the catch-all last.
  groups.sort((a, b) => Number(a[0].startsWith('_')) - Number(b[0].startsWith('_')) || b[1].length - a[1].length);
  const LIMIT = 6;

  return (
    <div className="space-y-14">
      {groups.map(([key, list]) => {
        const open = expanded.has(key);
        const shown = open ? list : list.slice(0, LIMIT);
        const first = list[0];
        const head =
          view === 'event'
            ? key === '_other'
              ? { name: 'Other challenges', to: '' }
              : { name: eventBySlug(key)?.title || key.replace(/-/g, ' '), to: `/events/${key}` }
            : key === '_anon'
              ? { name: 'Anonymous contributors', to: '' }
              : { name: authorLabel(first.author_name), to: `/blog/author/${key}` };
        return (
          <section key={key} aria-labelledby={`g-${key}`}>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                {view === 'writer' && key !== '_anon' && (
                  first.author_avatar
                    ? <img src={first.author_avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
                    : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime/20 text-base font-bold text-lime">{first.author_name[0]?.toUpperCase()}</span>
                )}
                <div>
                  <h2 id={`g-${key}`} className="font-display text-2xl text-white sm:text-3xl">
                    {head.to ? <Link to={head.to} className="transition hover:text-lime">{head.name}</Link> : head.name}
                  </h2>
                  <p className="mt-1 text-[15px] text-white/50">
                    {list.length} {list.length === 1 ? 'write-up' : 'write-ups'}
                    {view === 'event' && head.to && <> · <Link to={head.to} className="text-white/70 hover:text-white">About the event</Link></>}
                    {view === 'writer' && head.to && <> · <Link to={head.to} className="text-white/70 hover:text-white">Profile</Link></>}
                  </p>
                </div>
              </div>
              {list.length > LIMIT && (
                <button type="button" onClick={() => onToggle(key)} className="text-[15px] font-semibold text-white/70 transition hover:text-white">
                  {open ? 'Show fewer' : `Show all ${list.length}`}
                </button>
              )}
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
