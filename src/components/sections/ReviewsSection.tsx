import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ReviewCard } from '../../features/reviews/ReviewCard';
import { useReviews } from '../../features/reviews/useReviews';

/** Homepage: the rating and three player quotes, linking to /reviews. Hidden until there is something to show. */
export const ReviewsSection = () => {
  const { reviews, stats } = useReviews();
  if (!stats?.responses && !reviews.length) return null;
  const top = reviews.slice(0, 3);
  return (
    <section className="border-t border-white/[0.06] bg-ink py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">Reviews</p>
            <h2 className="font-display mt-3 max-w-2xl text-4xl leading-tight text-white sm:text-5xl">
              Don't take our word for it. <span className="text-white/45">Take theirs.</span>
            </h2>
          </div>
          {stats?.avg ? (
            <div className="lg:text-right">
              <p className="font-display text-6xl leading-none text-white">{stats.avg}<span className="text-2xl text-white/35"> / 5</span></p>
              <p className="mt-2 text-sm text-white/50">from {stats.responses.toLocaleString('en-IN')} players · {stats.more_pct}% want more</p>
            </div>
          ) : null}
        </div>
        {top.length > 0 && (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {top.map((r) => <ReviewCard key={r.id} r={r} />)}
          </div>
        )}
        <Link to="/reviews" className="btn btn-ghost mt-10 inline-flex">Read all reviews <ArrowRight size={17} /></Link>
      </div>
    </section>
  );
};

export default ReviewsSection;
