import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { ReviewCard } from '../features/reviews/ReviewCard';
import { shortEvent, useReviews } from '../features/reviews/useReviews';
import { FeedbackCharts, summarize } from '../features/reviews/FeedbackCharts';

/* /reviews: what players said after our CTFs.
   Totals come from every feedback form (review_stats); quotes are the ones picked in Admin -> Feedback.
   Look: typography first, no icon art. */

export default function ReviewsPage() {
  const { reviews, stats, answers, loading, error } = useReviews(true);
  const [chartEvent, setChartEvent] = useState('');
  const [allChallenges, setAllChallenges] = useState(false);
  const [event, setEvent] = useState('All');
  const reduce = useReducedMotion();
  const rise = (i = 0) => (reduce ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.45, delay: Math.min(i, 6) * 0.05 } });

  const events = useMemo(() => ['All', ...new Set(reviews.map((r) => r.event_name).filter(Boolean))], [reviews]);
  const shown = event === 'All' ? reviews : reviews.filter((r) => r.event_name === event);
  const [lead, ...rest] = shown;

  // Event tabs for the charts: biggest event first.
  const evTabs = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    answers.forEach((r) => {
      const id = r.data?.event || 'other';
      const e = m.get(id) || { id, name: r.data?.event_name || 'Other', count: 0 };
      e.count++; m.set(id, e);
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [answers]);
  const chartEv = evTabs.find((e) => e.id === chartEvent) || evTabs[0];
  const chartRows = useMemo(() => (chartEv ? answers.filter((r) => (r.data?.event || 'other') === chartEv.id) : []), [answers, chartEv]);
  const summary = useMemo(() => summarize(chartRows), [chartRows]);

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="Reviews — What players say about CyberHx CTFs"
        description={stats ? `${stats.responses} players reviewed our CTFs: ${stats.avg}/5 average, and ${stats.more_pct}% want more events. Read what they said about Null Origin and Pinaka CTF.` : 'What players say about CyberHx CTFs: ratings and reviews from Null Origin and Pinaka CTF.'}
        path="/reviews"
        keywords="cyberhx reviews, ctf reviews, null origin ctf, pinaka ctf, cyberhx feedback"
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-14 pt-28 sm:pb-20 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[50rem] -translate-x-1/2 rounded-full bg-glow/[0.08] blur-[130px]" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0b1020] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Reviews · From the players
          </span>
          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <h1 className="font-display max-w-3xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Played by thousands. <span className="text-white/45">Judged by them.</span>
            </h1>
            <div className="lg:text-right">
              <p className="font-display text-7xl leading-none sm:text-8xl">
                {stats?.avg ?? '—'}<span className="text-3xl text-white/35 sm:text-4xl"> / 5</span>
              </p>
              <p className="mt-3 text-sm text-white/50">{stats ? `average from ${stats.responses.toLocaleString('en-IN')} player reviews` : loading ? 'Loading reviews…' : ''}</p>
            </div>
          </div>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-white/60">
            After every CTF we ask the people who played it. These are their ratings and their words, unedited.
          </p>

          {stats && (
            <dl className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                [`${stats.happy_pct ?? 0}%`, 'rated the CTF 4 or 5'],
                [`${stats.more_pct ?? 0}%`, 'want more CyberHx events'],
                [stats.responses.toLocaleString('en-IN'), 'reviews collected'],
                [String(stats.events.length), stats.events.length === 1 ? 'CTF reviewed' : 'CTFs reviewed'],
              ].map(([v, k]) => (
                <div key={k} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-5">
                  <dt className="sr-only">{k}</dt>
                  <dd className="font-display text-3xl text-white sm:text-4xl">{v}</dd>
                  <dd className="mt-1 text-[13px] text-white/45">{k}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Charts, one event at a time (same charts as Admin -> Feedback, anonymous answers only) */}
      {evTabs.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">Event by event</p>
              <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">The numbers.</h2>
            </div>
            <div role="tablist" aria-label="Event" className="flex max-w-full gap-0.5 overflow-x-auto rounded-[14px] border border-white/[0.08] bg-[#0b0f19] p-[3px]">
              {evTabs.map((e) => {
                const on = chartEv?.id === e.id;
                return (
                  <button key={e.id} role="tab" aria-selected={on} onClick={() => setChartEvent(e.id)}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[11px] px-3.5 py-1.5 text-[13.5px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/70 ${on ? 'bg-white/[0.16] text-white' : 'text-white/55 hover:text-white/85'}`}>
                    {e.name}
                    <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-white/50'}`}>{e.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-8 space-y-5">
            <FeedbackCharts shown={chartRows} s={summary} allChallenges={allChallenges} setAllChallenges={setAllChallenges} />
          </div>
        </section>
      )}

      {/* Quotes */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">In their words.</h2>
            {events.length > 2 && (
              <div role="tablist" aria-label="Filter by event" className="flex flex-wrap gap-2">
                {events.map((e) => (
                  <button key={e} role="tab" aria-selected={event === e} onClick={() => setEvent(e)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${event === e ? 'border-white/30 bg-white/[0.08] text-white' : 'border-white/[0.08] text-white/55 hover:text-white'}`}>
                    {e === 'All' ? 'All events' : shortEvent(e)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && <p className="mt-10 text-white/40">Loading reviews…</p>}
          {error && !reviews.length && <p className="mt-10 text-white/50">Reviews could not load right now. Please refresh the page.</p>}

          {lead && (
            <motion.div {...rise()} className="mt-10">
              <ReviewCard r={lead} size="lg" />
            </motion.div>
          )}
          {rest.length > 0 && (
            <div className="mt-4 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
              {rest.map((r, i) => (
                <motion.div key={r.id} {...rise(i)} className="break-inside-avoid">
                  <ReviewCard r={r} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Close */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">Your turn.</h2>
            <p className="mt-3 max-w-xl text-white/55">Play the next CyberHx CTF, or let us build one for your college, club or company.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/events" className="btn btn-lime">See upcoming CTFs <ArrowRight size={17} /></Link>
            <Link to="/host-your-ctf" className="btn btn-ghost">Host a CTF</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
