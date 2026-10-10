import { Link } from 'react-router-dom';
import type { PostCard as Card } from './api';
import { formatDate } from './utils';

// Four on-brand gradients. A post with no uploaded cover still gets an
// intentional one, picked from its text so it stays the same every time.
const COVER_THEMES = [
  { from: '#0b2a3a', to: '#0a1020', glow: '#3bd3ff' },
  { from: '#17300f', to: '#0a1020', glow: '#c6f135' },
  { from: '#2a1838', to: '#0a1020', glow: '#a78bfa' },
  { from: '#3a2608', to: '#0a1020', glow: '#ffc93c' },
];
const pickTheme = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_THEMES[h % COVER_THEMES.length];
};

export const DefaultCover = ({ seed = '', label, className = '' }: { seed?: string; label?: string; className?: string }) => {
  const t = pickTheme(seed || label || 'cyberhx');
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} aria-hidden="true">
      {/* soft glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl" style={{ background: t.glow }} />
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '26px 26px' }}
      />
      {/* flag mark */}
      <svg viewBox="0 0 64 64" className="absolute left-5 top-1/2 h-20 w-20 -translate-y-1/2 opacity-90" fill="none">
        <path d="M18 8v48" stroke={t.glow} strokeWidth="4" strokeLinecap="round" />
        <path d="M18 12h30l-6 9 6 9H18z" fill={t.glow} opacity="0.9" />
      </svg>
      {label && (
        <span className="absolute bottom-4 right-5 max-w-[60%] text-right font-mono text-[11px] uppercase tracking-widest text-white/50">
          {label}
        </span>
      )}
    </div>
  );
};

export const Cover = ({ src, alt, seed, label, className = '' }: { src?: string; alt: string; seed?: string; label?: string; className?: string }) =>
  src ? (
    <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <DefaultCover seed={seed} label={label} className={className} />
  );

export const Byline = ({ post, small }: { post: Pick<Card, 'author_name' | 'author_avatar' | 'published_at' | 'read_time'>; small?: boolean }) => (
  <div className={`flex items-center gap-2.5 ${small ? 'text-xs' : 'text-sm'} text-muted`}>
    {post.author_avatar ? (
      <img src={post.author_avatar} alt="" className={`${small ? 'h-7 w-7' : 'h-9 w-9'} rounded-full border border-line object-cover`} />
    ) : (
      <span className={`${small ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'} flex items-center justify-center rounded-full bg-glow/15 font-bold text-glow`}>
        {post.author_name?.[0]?.toUpperCase() || 'C'}
      </span>
    )}
    <span className="min-w-0">
      <span className="block truncate font-semibold text-white/90">{post.author_name}</span>
      <span className="block">
        {formatDate(post.published_at)} · {post.read_time} min read
      </span>
    </span>
  </div>
);

export const PostCard = ({ post }: { post: Card }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-line bg-panel transition hover:-translate-y-1 hover:border-white/20"
  >
    <div className="aspect-[16/9] overflow-hidden border-b-2 border-line">
      <Cover src={post.cover_image} alt="" seed={post.slug} label={post.category} className="transition-transform duration-500 group-hover:scale-105" />
    </div>
    <div className="flex flex-1 flex-col p-5">
      <p className="text-xs font-semibold text-glow">{post.category}</p>
      <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-white group-hover:text-lime">{post.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{post.excerpt}</p>
      <div className="mt-auto pt-5">
        <Byline post={post} small />
      </div>
    </div>
  </Link>
);

export const CardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border-2 border-line bg-panel">
    <div className="aspect-[16/9] animate-pulse bg-white/[0.04]" />
    <div className="space-y-3 p-5">
      <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-5 w-4/5 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
    </div>
  </div>
);
