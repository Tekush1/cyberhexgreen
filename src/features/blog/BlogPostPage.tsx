import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Eye, Heart, Link2, Linkedin, PenLine, Twitter } from 'lucide-react';
import { Mascot } from '../../components/shared/Mascot';
import { Markdown } from './Markdown';
import { addView, checkAdmin, explain, getPost, likePost, relatedPosts, type Post, type PostCard as Card } from './api';
import { Byline, Cover, PostCard } from './PostCard';
import { Seo, breadcrumbLd, SITE } from '../seo/Seo';
import { compactNumber, tocFrom } from './utils';
import { BlogCompanion } from './BlogCompanion';

const likedKey = (id: string) => `cyberhx-liked:${id}`;
const safeGet = (k: string, store: Storage = localStorage) => {
  try {
    return store.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string | null, store: Storage = localStorage) => {
  try {
    if (v === null) store.removeItem(k);
    else store.setItem(k, v);
  } catch {
    /* ignore */
  }
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.1-1.2-.2-.2-.5-.3Z" />
  </svg>
);

export default function BlogPostPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Card[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin().then(setIsAdmin);
  }, []);

  useEffect(() => {
    let alive = true;
    setState('loading');
    window.scrollTo(0, 0);
    getPost(slug)
      .then((p) => {
        if (!alive) return;
        if (!p) {
          setState('missing');
          return;
        }
        setPost(p);
        setLikes(p.likes);
        setLiked(safeGet(likedKey(p.id)) === '1');
        setState('ready');
        relatedPosts(p).then((r) => alive && setRelated(r));
        // Count one view per post per browser session.
        const seen = `cyberhx-viewed:${p.id}`;
        if (!safeGet(seen, sessionStorage)) {
          safeSet(seen, '1', sessionStorage);
          addView(p.id);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setError(explain(e));
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [slug]);


  // Reading progress.
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('post-body');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setProgress(Math.min(1, Math.max(0, -r.top / Math.max(1, total))));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [post]);

  const toc = useMemo(() => (post ? tocFrom(post.content) : []), [post]);

  // Highlight the section being read.
  useEffect(() => {
    if (toc.length < 2) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActiveId(vis[0].target.id);
      },
      { rootMargin: '-110px 0px -70% 0px' },
    );
    toc.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [toc]);

  const toggleLike = async () => {
    if (!post) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    safeSet(likedKey(post.id), next ? '1' : null);
    try {
      const n = await likePost(post.id, next ? 1 : -1);
      if (n !== null) setLikes(n);
    } catch {
      // Roll back if the server refused.
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
      safeSet(likedKey(post.id), next ? null : '1');
    }
  };

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const companion = (
    <BlogCompanion
      signals={{ mode: 'post', state, liked, copied, progress: Math.round(progress * 100), minutes: post?.read_time || undefined }}
    />
  );

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-ink pt-32">
        {companion}
        <div className="mx-auto max-w-3xl space-y-4 px-5">
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-12 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-12 w-2/3 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-8 aspect-[2/1] animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (state !== 'ready' || !post) {
    return (
      <div className="min-h-screen bg-ink px-5 pb-24 pt-32 text-center text-white">
        <Mascot pose="crying" alt="" eager className="mx-auto w-40" />
        <h1 className="font-display mt-6 text-3xl">{state === 'missing' ? 'Post not found' : "This post couldn't load"}</h1>
        <p className="mx-auto mt-3 max-w-md text-white/55">
          {state === 'missing' ? 'It may have been moved or unpublished.' : error}
        </p>
        <Link to="/blog" className="btn btn-lime mt-8">Back to the blog</Link>
      </div>
    );
  }

  const share = [
    { label: 'Share on X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`, icon: <Twitter size={17} /> },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, icon: <Linkedin size={17} /> },
    { label: 'Share on WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`, icon: <WhatsAppIcon /> },
  ];

  const absImg = post.cover_image && /^https?:\/\//.test(post.cover_image) ? post.cover_image : undefined;
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: [absImg || `${SITE}/og-image.png`],
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { '@type': 'Person', name: post.author_name },
    publisher: { '@type': 'Organization', name: 'CyberHx', logo: { '@type': 'ImageObject', url: `${SITE}/og-image.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${post.slug}` },
    articleSection: post.category,
    keywords: (post.tags || []).join(', ') || undefined,
    wordCount: post.content.split(/\s+/).filter(Boolean).length,
  };

  return (
    <div className="min-h-screen bg-ink pb-24 pt-16 text-white sm:pt-[72px]">
      <Seo
        title={`${post.title} · CyberHx Blog`}
        description={post.excerpt || `${post.title} — a ${post.category} post on the CyberHx cybersecurity blog.`}
        path={`/blog/${post.slug}`}
        image={absImg}
        type="article"
        keywords={(post.tags || []).join(', ')}
        jsonLd={[articleLd, breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }])]}
      />
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-16 z-40 h-0.5 sm:top-[72px]" aria-hidden="true">
        <div className="h-full bg-lime transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      <article>
        <header className="mx-auto max-w-3xl px-5 pt-12 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/blog" className="flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white">
              <ArrowLeft size={16} /> All posts
            </Link>
            {isAdmin && (
              <Link to={`/blog/edit/${post.id}`} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-white/30">
                <PenLine size={15} /> Edit
              </Link>
            )}
          </div>
          <Link to={`/blog?category=${encodeURIComponent(post.category)}`} className="mt-8 inline-block text-sm font-semibold uppercase tracking-wide text-lime hover:underline">
            {post.category}
          </Link>
          <h1 className="font-display mt-3 text-4xl leading-[1.08] text-white sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mt-5 text-xl leading-8 text-white/55">{post.excerpt}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-4">
            <Byline post={post} />
            <span className="flex items-center gap-1.5 text-sm text-white/50">
              <Eye size={15} /> {compactNumber(post.views)} views
            </span>
          </div>
        </header>

        {post.cover_image && (
          <div className="mx-auto mt-10 max-w-5xl px-5 sm:px-6">
            <div className="aspect-[2/1] overflow-hidden rounded-3xl border border-white/10 shadow-sm">
              <Cover src={post.cover_image} alt="" seed={post.slug} label={post.category} />
            </div>
          </div>
        )}

        <div className="mx-auto mt-6 grid max-w-6xl gap-10 px-5 sm:px-6 xl:grid-cols-[220px_minmax(0,48rem)_220px]">
          {/* Contents */}
          <nav className="hidden xl:block" aria-label="On this page">
            {toc.length >= 2 && (
              <div className="sticky top-32 pt-10">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">On this page</p>
                <ul className="mt-3 space-y-2 border-l border-white/10 text-sm">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className={`-ml-px block border-l-2 py-0.5 transition ${t.level === 3 ? 'pl-6' : 'pl-3.5'} ${
                          activeId === t.id ? 'border-lime font-semibold text-white' : 'border-transparent text-white/50 hover:text-white'
                        }`}
                      >
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>

          <div id="post-body" className="min-w-0">
            <Markdown tone="dark">{post.content}</Markdown>

            {post.tags?.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white/65 transition hover:border-white/25 hover:text-white">
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            {/* Like + share */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0b1020] p-4">
              <button
                type="button"
                onClick={toggleLike}
                aria-pressed={liked}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  liked ? 'border-red-400/50 bg-red-500/10 text-red-300' : 'border-white/12 bg-white/[0.04] text-white/85 hover:border-red-400/50'
                }`}
              >
                <Heart size={17} className={liked ? 'fill-current' : ''} /> {liked ? 'Liked' : 'Like'} · {compactNumber(likes)}
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={copy} className="flex h-10 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 text-sm font-semibold text-white transition hover:border-white/30">
                  {copied ? <Check size={16} className="text-lime" /> : <Link2 size={16} />} {copied ? 'Copied' : 'Copy link'}
                </button>
                {share.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/70 transition hover:border-white/30 hover:text-white">
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden xl:block" />
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6">
          <h2 className="font-display text-2xl text-white">More in {post.category}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}

      {/* Write CTA */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6">
        <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[28px] bg-ink p-7 sm:flex-row sm:items-center sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime/20 blur-[90px]" />
          <div className="relative flex-1">
            <h2 className="font-display text-2xl text-white sm:text-3xl">Have something to share?</h2>
            <p className="mt-2 max-w-lg text-white/60">Write a CTF write-up, a tutorial or a scam breakdown. Images upload as you paste them.</p>
          </div>
          <Link to="/blog/write" className="btn btn-lime relative self-start sm:self-auto">
            <PenLine size={17} /> Write a post
          </Link>
        </div>
      </section>
      {companion}
    </div>
  );
}
