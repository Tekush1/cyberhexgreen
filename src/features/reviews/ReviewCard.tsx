import type { Review } from './useReviews';

/** One player quote: words first, then who said it. Typography only, no icons. */
export const ReviewCard = ({ r, size = 'md' }: { r: Review; size?: 'md' | 'lg' }) => (
  <figure className="break-inside-avoid rounded-[1.6rem] border border-white/[0.07] bg-white/[0.02] p-6 transition-colors hover:border-white/[0.14] sm:p-7">
    {r.rating ? (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime/80">
        {r.rating}/5 <span className="text-white/30">· rated the CTF</span>
      </p>
    ) : null}
    <blockquote className={`mt-4 text-white/90 ${size === 'lg' ? 'text-[22px] font-medium leading-[1.55] sm:text-[26px]' : 'text-[17px] leading-8'}`}>
      “{r.quote}”
    </blockquote>
    <figcaption className="mt-6 border-t border-white/[0.06] pt-4">
      <span className="block text-[15px] font-semibold text-white">{r.author || 'A player'}</span>
      <span className="mt-0.5 block text-[13px] text-white/45">
        {[r.team && r.team !== r.author ? `Team ${r.team}` : '', r.event_name].filter(Boolean).join(' · ')}
      </span>
    </figcaption>
  </figure>
);
