import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useLocalCurrency } from '../../lib/currency';
import { quoteSeats, seatLists, type SeatAudience } from '../../data/seats';

/* Seats by volume, as one card read top to bottom:
   Colleges buy Academy seats; companies buy Pentest Lab seats (data/seats.ts).
   1. one question (how many?), 2. the price ladder with your step lit, 3. one big number and what it includes,
   4. one button. Rupees for visitors in India, dollars elsewhere. The buy-up rule is shown as free seats.
   On phones a slim bar keeps the total and the button in reach once the card's own button scrolls away. */

const inrFmt = (n: number) => '₹' + n.toLocaleString('en-IN');
const usdFmt = (n: number) => '$' + n.toLocaleString('en-US');

const ACADEMIC = { question: 'How many students?', people: 'students', person: 'student', to: '/universities', presets: [10, 25, 64, 120, 250, 500], start: 64 };
const COPY: Record<SeatAudience, { question: string; people: string; person: string; to: string; presets: number[]; start: number }> = {
  academic: ACADEMIC,
  academicCapt: ACADEMIC,
  company: { question: 'How many people on the team?', people: 'people', person: 'person', to: '/companies', presets: [5, 10, 25, 50, 100, 250], start: 25 },
};

export const PACKAGE_LABEL: Record<SeatAudience, string> = { academic: 'Academy', academicCapt: 'Academy + CAPT', company: 'Team seats' };

export function SeatPricing({ audience, packages, onPackage }: {
  audience: SeatAudience;
  /** Packages to switch between above the question (same audience of people, different seat). */
  packages?: SeatAudience[];
  onPackage?: (p: SeatAudience) => void;
}) {
  const list = seatLists[audience];
  const c = COPY[audience];
  const { code } = useLocalCurrency();
  const cur = code === 'INR' ? 'inr' : 'usd';
  const fmt = cur === 'inr' ? inrFmt : usdFmt;
  const [n, setN] = useState(c.start);
  const id = useId();
  const clamp = (v: number) => Math.min(list.max, Math.max(list.min, Math.round(v) || list.min));
  const q = quoteSeats(list, clamp(n), cur)!;
  const next = list.slabs.find((s) => s.min > q.seats);
  const toNext = next ? next.min - clamp(n) : 0;
  const from = list.slabs.find((s) => clamp(n) >= s.min && clamp(n) <= s.max)!;
  const href = `${c.to}?seats=${q.seats}${audience === 'academicCapt' ? '&pkg=capt' : ''}#${audience === 'company' ? 'apply' : 'plan'}`;

  // Phones: show the sticky bar only while the card is on screen but its own button is not.
  const card = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLAnchorElement>(null);
  const [bar, setBar] = useState(false);
  useEffect(() => {
    if (!card.current || !cta.current || typeof IntersectionObserver === 'undefined') return;
    let cardIn = false;
    let ctaIn = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === card.current) cardIn = e.isIntersecting;
        if (e.target === cta.current) ctaIn = e.isIntersecting;
      }
      setBar(cardIn && !ctaIn);
    });
    io.observe(card.current);
    io.observe(cta.current);
    return () => io.disconnect();
  }, []);

  const includes = [
    `${q.freeSeats} free ${list.freeSeats.label} ${q.freeSeats === 1 ? 'seat' : 'seats'}`,
    ...(q.slab.ctfs > 0 ? [`${q.slab.ctfs === 1 ? `One ${list.ctf.one}` : `${q.slab.ctfs} ${list.ctf.many}`} a year, free — worth ${fmt(q.slab.ctfs * list.ctf[cur])}`] : []),
    ...q.slab.adds.filter((a) => !/CTF/.test(a)),
  ];

  return (
    <div ref={card} className="rounded-[32px] border border-lime/35 bg-gradient-to-b from-lime/[0.06] via-[#0a1020] to-[#080d1a] p-6 sm:p-10">
      {packages && packages.length > 1 && (
        <div role="radiogroup" aria-label="Package" className="mb-8 inline-flex max-w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] p-1.5">
          {packages.map((pk) => (
            <button key={pk} type="button" role="radio" aria-checked={audience === pk} onClick={() => onPackage?.(pk)}
              className={`rounded-xl px-4 py-2 text-[15px] font-semibold transition-colors ${audience === pk ? 'bg-white text-ink' : 'text-white/65 hover:text-white'}`}>
              {PACKAGE_LABEL[pk]}
            </button>
          ))}
        </div>
      )}

      {/* 1 · The question */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label htmlFor={id} className="font-display text-2xl sm:text-3xl">{c.question}</label>
          <div className="mt-5 flex items-center gap-4">
            <input id={id} type="range" min={list.min} max={list.max} value={clamp(n)} onChange={(e) => setN(Number(e.target.value))} className="h-2 flex-1 cursor-pointer accent-lime" />
            <input
              type="number"
              aria-label={`Number of ${c.people}`}
              min={list.min}
              max={list.max}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              onBlur={() => setN(clamp(n))}
              className="w-24 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-right text-lg font-semibold tabular-nums text-white outline-none focus:border-lime"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Common sizes">
          {c.presets.map((p) => (
            <button key={p} type="button" onClick={() => setN(p)} className={`rounded-full px-3.5 py-1.5 text-sm tabular-nums transition ${clamp(n) === p ? 'bg-white font-semibold text-ink' : 'bg-white/[0.06] text-white/60 hover:text-white'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* 2 · The ladder: every step visible, yours lit */}
      <ol className="mt-8 grid grid-cols-3 gap-1.5 sm:grid-cols-6" aria-label="Price per seat by size">
        {list.slabs.map((s) => {
          const on = s.name === q.slab.name;
          return (
            <li key={s.name}>
              <button
                type="button"
                onClick={() => setN(s.min)}
                aria-current={on ? 'true' : undefined}
                className={`w-full rounded-2xl px-3 py-3 text-left transition-colors ${on ? 'bg-lime text-ink' : 'bg-white/[0.04] text-white hover:bg-white/[0.08]'}`}
              >
                <span className={`block text-[12px] ${on ? 'text-ink/70' : 'text-white/45'}`}>{s.min}–{s.max}</span>
                <span className="block font-display text-lg tabular-nums leading-tight">{fmt(s[cur])}</span>
                <span className={`block text-[12px] ${on ? 'text-ink/70' : 'text-white/45'}`}>{s.recommended ? `${s.name} · popular` : s.name}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[13px] text-white/40">Per seat, per year. {cur === 'inr' ? 'No GST, no extra fees.' : 'No taxes or extra fees added.'}</p>

      {/* 3 · The answer and the button, on one line; 4 · what it includes, underneath */}
      <div className="mt-8 border-t border-white/[0.08] pt-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[15px] text-white/55">{q.seats} seats × {fmt(q.perSeat)}</p>
            <p className="font-display mt-1 text-5xl tabular-nums sm:text-6xl">{fmt(q.total)}</p>
            <p className="mt-2 text-lg text-white/70">a year · <span className="text-white">{fmt(q.perPersonMonth)} per {c.person} a month</span></p>
          </div>
          <div className="lg:w-80">
            <Link ref={cta} to={href} className="btn btn-lime w-full">Get this quote <ArrowRight size={16} /></Link>
            <p className="mt-2 text-center text-[13px] text-white/50">{list.terms[0]}.</p>
          </div>
        </div>
        {q.buyUp && <p className="mt-4 font-semibold text-lime">You get {q.seats - clamp(n)} extra seats free: {q.seats} seats cost less than {clamp(n)} at the {from.name} price.</p>}
        {!q.buyUp && next && toNext > 0 && toNext <= 15 && (
          <p className="mt-4 text-[15px] text-white/55">
            Add {toNext} more and every seat drops to {fmt(next[cur])}
            {next.ctfs > q.slab.ctfs ? `, with ${next.ctfs === 1 ? `a free ${list.ctf.one}` : `${next.ctfs} free ${list.ctf.many}`}` : ''}.
          </p>
        )}
        <ul className="mt-6 grid gap-x-6 gap-y-2 rounded-2xl bg-white/[0.03] p-5 sm:grid-cols-2">
          {includes.map((x) => (
            <li key={x} className="flex items-start gap-2.5 text-[15px] leading-6 text-white/85"><Check size={17} className="mt-0.5 shrink-0 text-lime" />{x}</li>
          ))}
        </ul>
      </div>

      <details className="group mt-8 border-t border-white/[0.08] pt-5 text-[14px] text-white/55">
        <summary className="cursor-pointer list-none font-semibold text-white/70 hover:text-white">
          <span className="group-open:hidden">What is in a seat, and the fine print +</span>
          <span className="hidden group-open:inline">What is in a seat, and the fine print −</span>
        </summary>
        <ul className="mt-3 space-y-1.5 leading-6">
          <li>{list.seat}</li>
          {list.terms.slice(1).map((t) => <li key={t}>{t}.</li>)}
          <li>{list.upgrade.label}: {'text' in list.upgrade ? list.upgrade.text : `${fmt(list.upgrade[cur])} each`}.</li>
          <li>Each seat's year starts when it is activated. Seats are named and can be moved once in the first 30 days.</li>
          <li>More than {list.max}? We quote it, from {fmt(list.floor[cur])} a seat.</li>
        </ul>
      </details>

      {/* Phones: the total and the button stay in reach */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 px-5 py-3 backdrop-blur transition-transform lg:hidden ${bar ? 'translate-y-0' : 'translate-y-full'}`} aria-hidden={!bar}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-xl tabular-nums leading-tight">{fmt(q.total)}<span className="font-sans text-sm font-normal text-white/50"> / year</span></p>
            <p className="truncate text-[12px] text-white/50">{q.seats} seats · {fmt(q.perPersonMonth)} per {c.person} a month</p>
          </div>
          <Link to={href} tabIndex={bar ? 0 : -1} className="btn btn-lime !min-h-[44px] shrink-0 !px-4 !text-sm">Get quote <ArrowRight size={15} /></Link>
        </div>
      </div>
    </div>
  );
}

export default SeatPricing;
