import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Search, X } from 'lucide-react';
import { explain, isConfigured, listAuthors, type Author } from './api';
import { WriterCard } from './PostCard';
import { Seo, breadcrumbLd, SITE } from '../seo/Seo';

/* /blog/writers — everyone who has published on the CyberHx blog, most prolific first. Each name is a page
   of its own (/blog/author/<slug>), so a writer can share their work with one link. */

export default function WritersPage() {
  const [writers, setWriters] = useState<Author[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isConfigured()) { setError(explain(null)); return; }
    listAuthors(300).then(setWriters).catch((e) => setError(explain(e)));
  }, []);

  const term = q.trim().toLowerCase();
  const shown = useMemo(() => (writers ?? []).filter((w) => !term || `${w.name} ${w.role ?? ''}`.toLowerCase().includes(term)), [writers, term]);
  const posts = writers ? writers.reduce((n, w) => n + w.posts, 0) : 0;

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-white">
      <Seo
        title="Writers — CyberHx Blog"
        description="The people writing for the CyberHx blog: CTF players, researchers and students from around the world, with every write-up and article they have published."
        path="/blog/writers"
        noindex={!!term}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Writers · CyberHx Blog',
            url: `${SITE}/blog/writers`,
            ...(writers?.length
              ? { hasPart: writers.slice(0, 50).map((w) => ({ '@type': 'ProfilePage', name: w.name, url: `${SITE}/blog/author/${w.slug}` })) }
              : {}),
          },
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Writers', path: '/blog/writers' }]),
        ]}
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[15px] text-white/55"><Link to="/blog" className="transition hover:text-white">CyberHx Blog</Link></p>
            <h1 className="font-display mt-3 text-5xl text-white sm:text-6xl">Writers</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-white/55">
              {writers ? `${writers.length} ${writers.length === 1 ? 'writer' : 'writers'}, ${posts} ${posts === 1 ? 'post' : 'posts'}. ` : ''}
              Players, researchers and students from around the world. Every name is a page of their work.
            </p>
          </div>
          <Link to="/blog/write" className="btn btn-lime self-start md:self-auto"><PenLine size={17} /> Write a post</Link>
        </header>

        <label className="relative mt-10 block lg:w-80">
          <span className="sr-only">Search writers</span>
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search writers"
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-9 text-sm text-white shadow-sm outline-none transition placeholder:text-white/35 focus:border-lime focus:ring-2 focus:ring-lime/30"
          />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              <X size={16} />
            </button>
          )}
        </label>

        <div className="mt-8">
          {error && (
            <div className="rounded-3xl border border-white/[0.07] bg-[#0b1020] p-10 text-center">
              <h2 className="font-display text-2xl text-white">The writers couldn't load</h2>
              <p className="mx-auto mt-2 max-w-md text-white/55">{error}</p>
            </div>
          )}
          {!error && !writers && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <li key={i} className="h-[5.5rem] animate-pulse rounded-3xl border border-white/[0.07] bg-white/[0.04]" />)}
            </ul>
          )}
          {writers && !shown.length && (
            <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center">
              <h2 className="font-display text-2xl text-white">{term ? 'No writer by that name' : 'No writers yet'}</h2>
              <p className="mt-2 text-white/55">{term ? 'Try a shorter search.' : 'Publish the first post and this page starts with you.'}</p>
              {!term && <Link to="/blog/write" className="btn btn-lime mt-6">Write the first post</Link>}
            </div>
          )}
          {shown.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((w) => <WriterCard key={w.slug} w={w} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
