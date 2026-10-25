import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Globe, Linkedin, PenLine } from 'lucide-react';
import { Mascot } from '../../components/shared/Mascot';
import { explain, getAuthor, listAuthors, postsByAuthor, type Author, type PostCard as Card } from './api';
import { CardSkeleton, PostCard } from './PostCard';
import { Seo, breadcrumbLd, SITE } from '../seo/Seo';
import { compactNumber, formatDate, prettyUrl } from './utils';

/* /blog/author/:slug — one writer: who they are and everything they've published on the CyberHx blog. */

export default function AuthorPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [posts, setPosts] = useState<Card[]>([]);
  const [rank, setRank] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setState('loading');
    window.scrollTo(0, 0);
    Promise.all([getAuthor(slug), postsByAuthor(slug), listAuthors(3).catch(() => [] as Author[])])
      .then(([a, p, top]) => {
        if (!alive) return;
        if (!a) { setState('missing'); return; }
        setAuthor(a);
        setPosts(p);
        setRank(top.findIndex((t) => t.slug === a.slug) + 1);
        setState('ready');
      })
      .catch((e) => { if (alive) { setError(explain(e)); setState('error'); } });
    return () => { alive = false; };
  }, [slug]);

  if (state === 'missing' || state === 'error') {
    return (
      <div className="min-h-screen bg-ink px-5 pb-24 pt-32 text-center text-white">
        <Mascot pose="confused" alt="" eager className="mx-auto w-40" />
        <h1 className="font-display mt-6 text-3xl">{state === 'missing' ? 'Writer not found' : "This page couldn't load"}</h1>
        <p className="mx-auto mt-3 max-w-md text-white/55">{state === 'missing' ? 'They may not have a published post yet.' : error}</p>
        <Link to="/blog" className="btn btn-lime mt-8">Back to the blog</Link>
      </div>
    );
  }

  const path = `/blog/author/${slug}`;
  const isLinkedIn = /linkedin\.com/i.test(author?.url || '');

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-white">
      {author && (
        <Seo
          title={`${author.name} — writer on the CyberHx Blog`}
          description={`${author.name}${author.role ? `, ${author.role}` : ''}: ${author.posts} post${author.posts === 1 ? '' : 's'} on the CyberHx cybersecurity blog.${author.bio ? ` ${author.bio}` : ''}`.slice(0, 300)}
          path={path}
          image={author.avatar || undefined}
          type="website"
          jsonLd={[
            {
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              url: `${SITE}${path}`,
              mainEntity: {
                '@type': 'Person',
                name: author.name,
                ...(author.role ? { jobTitle: author.role } : {}),
                ...(author.bio ? { description: author.bio } : {}),
                ...(author.avatar ? { image: author.avatar } : {}),
                ...(author.url ? { sameAs: [author.url] } : {}),
              },
            },
            breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: author.name, path }]),
          ]}
        />
      )}
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white">
          <ArrowLeft size={16} /> All posts
        </Link>

        {state === 'loading' || !author ? (
          <div className="mt-8 flex items-center gap-5">
            <div className="h-24 w-24 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="space-y-3"><div className="h-8 w-60 animate-pulse rounded bg-white/[0.06]" /><div className="h-4 w-40 animate-pulse rounded bg-white/[0.04]" /></div>
          </div>
        ) : (
          <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
            {author.avatar
              ? <img src={author.avatar} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-white/10" />
              : <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-lime/20 font-display text-4xl text-lime">{author.name[0]?.toUpperCase()}</span>}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Writer</p>
              <h1 className="font-display mt-1 flex flex-wrap items-center gap-3 text-4xl text-white sm:text-5xl">
                {author.name}
                {rank > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-lime/30 bg-lime/10 px-2.5 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-lime">
                    <Award size={13} /> Top writer
                  </span>
                )}
              </h1>
              {author.role && <p className="mt-1 text-lg text-white/55">{author.role}</p>}
              {author.bio && <p className="mt-3 max-w-2xl leading-7 text-white/70">{author.bio}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
                <span><b className="text-white">{author.posts}</b> post{author.posts === 1 ? '' : 's'}</span>
                <span><b className="text-white">{compactNumber(author.views)}</b> reads</span>
                <span><b className="text-white">{compactNumber(author.likes)}</b> likes</span>
                {author.last_post && <span>Last post {formatDate(author.last_post)}</span>}
                {author.url && (
                  <a href={author.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 font-semibold text-glow hover:underline">
                    {isLinkedIn ? <Linkedin size={15} /> : <Globe size={15} />} {prettyUrl(author.url)}
                  </a>
                )}
              </div>
            </div>
          </header>
        )}

        <h2 className="font-display mt-14 text-2xl text-white">Posts</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {state === 'loading'
            ? Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)
            : posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>

        <div className="mt-16 flex flex-col items-start gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-2xl text-white">Want a page like this?</h2>
            <p className="mt-1 text-white/55">Write a CTF write-up, a tutorial or a scam breakdown. Every published post adds to your writer page.</p>
          </div>
          <Link to="/blog/write" className="btn btn-lime shrink-0"><PenLine size={17} /> Write a post</Link>
        </div>
      </div>
    </div>
  );
}
