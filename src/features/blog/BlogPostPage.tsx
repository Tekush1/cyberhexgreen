import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Award, Calendar, Check, Eye, Globe, Heart, Link2, Linkedin, PenLine, ShieldCheck, Twitter } from 'lucide-react';
import { Mascot } from '../../components/shared/Mascot';
import { SubscribeForm } from '../../components/shared/SubscribeForm';
import { Markdown } from './Markdown';
import { addView, checkAdmin, explain, getAuthor, getPost, likePost, listAuthors, relatedPosts, type Author, type Post, type PostCard as Card } from './api';
import { Byline, Cover, Kicker, PostCard } from './PostCard';
import { Seo, breadcrumbLd, SITE } from '../seo/Seo';
import { authorLabel, compactNumber, excerptFrom, isAnonymous, prettyUrl, sameText, stripLeadingTitle, tocFrom } from './utils';
import { BlogCompanion } from './BlogCompanion';
import { eventBySlug, nextEvent } from '../../data/events';
import { certifications, pentestLabUrl } from '../../data/pentest';

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
  const [author, setAuthor] = useState<Author | null>(null);
  const [topWriter, setTopWriter] = useState(false);

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
        relatedPosts(p).then((r) => alive && setRelated(r)).catch(() => undefined);
        setAuthor(null);
        setTopWriter(false);
        if (p.author_slug && !isAnonymous(p.author_name)) {
          getAuthor(p.author_slug).then((a) => alive && setAuthor(a)).catch(() => undefined);
          listAuthors(3).then((top) => alive && setTopWriter(top.some((a) => a.slug === p.author_slug))).catch(() => undefined);
        }
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

  // The post body without a first line that only repeats the title.
  const body = useMemo(() => (post ? stripLeadingTitle(post.content, post.title) : ''), [post]);
  const toc = useMemo(() => tocFrom(body), [body]);

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
  const summary = post.excerpt && !sameText(post.excerpt, post.title) ? post.excerpt : excerptFrom(body, 200);
  const authorPath = post.author_slug && !isAnonymous(post.author_name) ? `/blog/author/${post.author_slug}` : '';
  const event = post.event_slug ? eventBySlug(post.event_slug) : undefined;
  const upcoming = nextEvent();
  const nextUp = event && event.status !== 'completed' ? event : upcoming;
  const cppt = certifications.find((c) => c.code === 'CPPT');
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: summary,
    image: [absImg || `${SITE}/og-image.png`],
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { '@type': 'Person', name: authorLabel(post.author_name), ...(authorPath ? { url: `${SITE}${authorPath}` } : {}) },
    publisher: { '@type': 'Organization', name: 'CyberHx', logo: { '@type': 'ImageObject', url: `${SITE}/og-image.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${post.slug}` },
    articleSection: post.category,
    keywords: (post.tags || []).join(', ') || undefined,
    wordCount: body.split(/\s+/).filter(Boolean).length,
    ...(event ? { about: { '@type': 'Event', name: event.title, url: `${SITE}/events/${event.slug}` } } : {}),
  };

  return (
    <div className="min-h-screen bg-ink pb-24 pt-16 text-white sm:pt-[72px]">
      <Seo
        title={`${post.title} · CyberHx Blog`}
        description={summary || `${post.title} — a ${post.category} post on the CyberHx cybersecurity blog.`}
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
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:opacity-80">
              <Kicker post={post} className="text-sm" />
            </Link>
            {event && (
              <Link to={`/events/${event.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-glow/30 bg-glow/[0.07] px-3 py-1 text-xs font-semibold text-glow transition hover:border-glow/60">
                <Calendar size={13} /> {event.title}
              </Link>
            )}
          </div>
          <h1 className="font-display mt-3 text-4xl leading-[1.08] text-white sm:text-5xl">{post.title}</h1>
          {post.excerpt && !sameText(post.excerpt, post.title) && <p className="mt-5 text-xl leading-8 text-white/55">{post.excerpt}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-4">
            {authorPath ? <Link to={authorPath} className="rounded-xl transition hover:opacity-80"><Byline post={post} /></Link> : <Byline post={post} />}
            <span className="flex items-center gap-1.5 text-sm text-white/50">
              <Eye size={15} /> {compactNumber(post.views)} views
            </span>
          </div>
        </header>

        {post.cover_image && (
          <div className="mx-auto mt-10 max-w-5xl px-5 sm:px-6">
            <div className="aspect-[2/1] overflow-hidden rounded-3xl border border-white/10 shadow-sm">
              <Cover src={post.cover_image} alt={post.title} eager seed={post.slug} label={post.category} />
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
            <Markdown tone="dark">{body}</Markdown>

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

            {/* About the writer */}
            <section aria-labelledby="writer-h" className="mt-8 flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 sm:flex-row sm:p-6">
              {post.author_avatar
                ? <img src={post.author_avatar} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
                : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-lime/20 text-2xl font-bold text-lime">{isAnonymous(post.author_name) ? '?' : post.author_name[0].toUpperCase()}</span>}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Written by</p>
                <h2 id="writer-h" className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
                  {authorPath ? <Link to={authorPath} className="hover:text-lime">{authorLabel(post.author_name)}</Link> : authorLabel(post.author_name)}
                  {topWriter && <span className="inline-flex items-center gap-1 rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-lime"><Award size={12} /> Top writer</span>}
                </h2>
                {(author?.role || post.author_role) && <p className="text-sm text-white/50">{author?.role || post.author_role}</p>}
                {(post.author_bio || author?.bio) && <p className="mt-3 leading-7 text-white/70">{post.author_bio || author?.bio}</p>}
                {isAnonymous(post.author_name) && <p className="mt-3 leading-7 text-white/60">A member of the CyberHx community who chose not to share their name.</p>}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  {(post.author_url || author?.url) && (
                    <a href={post.author_url || author!.url!} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 font-semibold text-glow hover:underline">
                      {/linkedin\.com/i.test(post.author_url || author?.url || '') ? <Linkedin size={15} /> : <Globe size={15} />}
                      {prettyUrl(post.author_url || author!.url!)}
                    </a>
                  )}
                  {authorPath && author && (
                    <Link to={authorPath} className="inline-flex items-center gap-1 font-semibold text-white/80 hover:text-white">
                      {author.posts > 1 ? `All ${author.posts} posts` : 'Writer page'} · {compactNumber(author.views)} reads <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </section>
          </div>
          <div className="hidden xl:block" />
        </div>
      </article>

      {/* What next: the event, the lab, the newsletter */}
      <section aria-labelledby="next-h" className="mx-auto mt-20 max-w-6xl px-5 sm:px-6">
        <h2 id="next-h" className="font-display text-2xl text-white">Liked this? Go hands-on.</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {nextUp && (
            <Link to={`/events/${nextUp.slug}`} className="group flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] transition hover:-translate-y-1 hover:border-white/15">
              <img src={nextUp.image} alt="" loading="lazy" className="aspect-[969/431] w-full object-cover" />
              <span className="flex flex-1 flex-col p-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-200">{nextUp.status === 'completed' ? 'Our last CTF' : nextUp.entry === 'Private' ? 'Coming up · private' : 'Next CTF'}</span>
                <span className="font-display mt-1.5 text-xl text-white group-hover:text-lime">{nextUp.title}</span>
                <span className="mt-1 text-sm text-white/50">{nextUp.date}{nextUp.entry && nextUp.entry !== 'Private' ? ` · ${nextUp.entry.toLowerCase()} entry` : ''}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-white/85">See the event <ArrowUpRight size={15} /></span>
              </span>
            </Link>
          )}
          <a href={pentestLabUrl} target="_blank" rel="noopener noreferrer" className="group flex flex-col rounded-3xl border border-white/[0.08] bg-[linear-gradient(160deg,#121a33,#0b1020_60%)] p-5 transition hover:-translate-y-1 hover:border-white/15">
            <ShieldCheck size={26} className="text-glow" />
            <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-glow">Pentest Lab</span>
            <span className="font-display mt-1.5 text-xl text-white group-hover:text-glow">Practise on real machines</span>
            <span className="mt-1 text-sm leading-6 text-white/55">Targets mapped to MITRE ATT&amp;CK, then earn CAPT or CPPT{cppt ? ` (from $${Math.min(...certifications.map((c) => c.usd))})` : ''}.</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-white/85">Open the lab <ArrowUpRight size={15} /></span>
          </a>
          <div className="flex flex-col rounded-3xl border border-lime/20 bg-lime/[0.04] p-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-lime">Newsletter</span>
            <span className="font-display mt-1.5 text-xl text-white">New posts and CTFs, in your inbox</span>
            <span className="mt-1 text-sm leading-6 text-white/55">Write-ups, scam alerts and event dates.</span>
            <div className="mt-auto pt-4"><SubscribeForm source="blog" /></div>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6">
          <h2 className="font-display text-2xl text-white">Keep reading</h2>
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
