import { Link } from 'react-router-dom';
import { SiteIcon } from '../../components/shared/SiteIcon';
import type { PostCard as Card } from './api';
import { formatDate } from './utils';

export const Cover = ({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) =>
  src ? (
    <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#14304a,#0d1428_60%)] ${className}`}>
      <SiteIcon name="code" size={64} alt="" className="opacity-80" />
    </div>
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
      <Cover src={post.cover_image} alt="" className="transition-transform duration-500 group-hover:scale-105" />
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
