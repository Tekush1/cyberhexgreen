import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLocalCurrency } from '../../lib/currency';
import { quoteSeats, seatLists, type SeatAudience } from '../../data/seats';

/* Seats by volume: a calculator (how many people?) next to the six slabs. Prices in rupees for visitors in India,
   in dollars everywhere else. The buy-up rule is shown as free seats, never as a discount. */

const inrFmt = (n: number) => '₹' + n.toLocaleString('en-IN');
const usdFmt = (n: number) => '$' + n.toLocaleString('en-US');

const COPY: Record<SeatAudience, { title: string; lead: string; people: string; person: string; cta: string; to: string; presets: number[] }> = {
  academic: {
    title: 'Seats for every student.',
    lead: 'A year of the Lab, the CAPT course and the exam for each student. The bigger the batch, the less each seat costs.',
    people: 'students',
    person: 'student',
    cta: 'Get this quote',
    to: '/universities',
    presets: [10, 25, 64, 120, 250, 500],
  },
  company: {
    title: 'Seats for your team.',
    lead: 'A year of the Lab, the CAPT and CPPT courses and both exams for each person, with a skills report for the manager.',
    people: 'people',
    person: 'person',
    cta: 'Get this quote',
    to: '/companies',
    presets: [5, 10, 25, 50, 100, 250],
  },
};

export function SeatPricing({ audience }: { audience: SeatAudience }) {
  const list = seatLists[audience];
  const c = COPY[audience];
  const { code } = useLocalCurrency();
  const cur = code === 'INR' ? 'inr' : 'usd';
  const fmt = cur === 'inr' ? inrFmt : usdFmt;
  const [n, setN] = useState(audience === 'academic' ? 64 : 25);
  const id = useId();
  const clamp = (v: number) => Math.min(list.max, Math.max(list.min, Math.round(v) || list.min));
  const q = quoteSeats(list, clamp(n), cur)!;
  const next = list.slabs.find((s) => s.min > q.seats);
  const toNext = next ? next.min - n : 0;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">{c.title}</h2>
          <p className="mt-2 max-w-xl leading-7 text-white/60">{c.lead}</p>
        </div>
        <p className="text-[15px] text-white/50">{cur === 'inr' ? 'Prices for India, in rupees. No GST, no extra fees.' : 'Prices in US dollars. No taxes or extra fees added.'}</p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        {/* Calculator */}
        <div className="flex flex-col rounded-[28px] border border-lime/40 bg-gradient-to-b from-lime/[0.07] to-[#080d1a] p-7 sm:p-8">
          <label htmlFor={id} className="text-[15px] font-semibold text-white">How many {c.people}?</label>
          <div className="mt-4 flex items-center gap-4">
            <input
              id={id}
              type="range"
              min={list.min}
              max={list.max}
              value={clamp(n)}
              onChange={(e) => setN(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer accent-lime"
            />
            <input
              type="number"
              aria-label={`Number of ${c.people}`}
              min={list.min}
              max={list.max}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              onBlur={() => setN(clamp(n))}
              className="w-20 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-right font-semibold tabular-nums text-white outline-none focus:border-lime"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {c.presets.map((p) => (
              <button key={p} type="button" onClick={() => setN(p)} className={`text-sm tabular-nums transition ${clamp(n) === p ? 'font-semibold text-white' : 'text-white/45 hover:text-white'}`}>{p}</button>
            ))}
          </div>

          <p className="mt-8 text-[15px] text-white/55">{q.slab.name} · {fmt(q.perSeat)} per seat, per year</p>
          <p className="font-display mt-1 text-5xl tabular-nums sm:text-6xl">{fmt(q.total)}</p>
          <p className="mt-2 text-[15px] text-white/60">a year for {q.seats} seats · {fmt(q.perPersonMonth)} per {c.person} a month</p>

          <ul className="mt-6 space-y-2 text-[15px] text-white/85">
            {q.buyUp && <li className="font-semibold text-lime">{q.seats - n} extra seats free: {q.seats} seats cost less than {n} in the {list.slabs.find((s) => n >= s.min && n <= s.max)!.name} slab.</li>}
            <li>{q.freeSeats} free {list.freeSeats.label} {q.freeSeats === 1 ? 'seat' : 'seats'}</li>
            {q.slab.ctfs > 0 && (
              <li>
                {q.slab.ctfs === 1 ? `One ${list.ctf.one}` : `${q.slab.ctfs} ${list.ctf.many}`} a year, free
                <span className="text-white/50"> · worth {fmt(q.slab.ctfs * list.ctf[cur])}</span>
              </li>
            )}
            {q.slab.adds.filter((a) => !/CTF/.test(a)).map((a) => <li key={a}>{a}</li>)}
            {!q.buyUp && next && toNext > 0 && toNext <= 15 && (
              <li className="text-white/55">
                Add {toNext} more and every seat drops to {fmt(next[cur])}
                {next.ctfs > q.slab.ctfs ? `, with ${next.ctfs === 1 ? `a free ${list.ctf.one}` : `${next.ctfs} free ${list.ctf.many}`} a year` : ''}.
              </li>
            )}
          </ul>

          <div className="mt-auto pt-8">
            <Link to={`${c.to}?seats=${q.seats}#${audience === 'academic' ? 'plan' : 'apply'}`} className="btn btn-lime w-full">{c.cta} <ArrowRight size={16} /></Link>
            <ul className="mt-4 space-y-1 text-center text-[13px] text-white/55">
              {list.terms.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="mt-2 text-center text-[13px] text-white/40">More than {list.max}? We quote it, from {fmt(list.floor[cur])} a seat.</p>
          </div>
        </div>

        {/* Slabs */}
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4">
          <table className="w-full text-left">
            <caption className="sr-only">Price per seat by number of {c.people}</caption>
            <thead>
              <tr className="text-[13px] text-white/45">
                <th scope="col" className="px-3 py-3 font-medium">Slab</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">{c.people[0].toUpperCase() + c.people.slice(1)}</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Per seat, a year</th>
              </tr>
            </thead>
            <tbody>
              {list.slabs.map((s) => {
                const on = s.name === q.slab.name;
                return (
                  <tr key={s.name} onClick={() => setN(s.min)} className={`cursor-pointer border-t border-white/[0.07] transition-colors ${on ? 'bg-lime/[0.09]' : 'hover:bg-white/[0.03]'}`}>
                    <td className="px-3 py-3.5">
                      <span className={`font-semibold ${on ? 'text-white' : 'text-white/85'}`}>{s.name}</span>
                      {s.recommended && <span className="ml-2 text-[13px] text-lime">Recommended</span>}
                      <span className="block text-[13px] text-white/45">{s.fits}</span>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-white/70">{s.min}–{s.max}</td>
                    <td className="px-3 py-3.5 text-right">
                      <span className="font-display text-xl tabular-nums">{fmt(s[cur])}</span>
                      <span className="block text-[13px] tabular-nums text-white/45">{fmt(Math.round(s[cur] / 12))} a month</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-3 pb-2 pt-4 text-[13px] leading-6 text-white/50">
            {list.upgrade.label}: {fmt(list.upgrade[cur])} {audience === 'academic' ? 'a seat' : 'each'}. Each year starts when the seat is activated. Seats are named and can be moved once in the first 30 days.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SeatPricing;
