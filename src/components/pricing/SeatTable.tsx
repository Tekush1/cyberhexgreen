import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLocalCurrency } from '../../lib/currency';
import { seatLists } from '../../data/seats';

/* Volume pricing as a plain table: seat range on the left, the price per seat on the right, one quiet note and
   one button underneath. Colleges see both packages side by side (Academy, Academy + CAPT); companies see one
   column. Rupees for visitors in India, dollars elsewhere. Prices come from data/seats.ts. */

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const usd = (n: number) => '$' + n.toLocaleString('en-US');

export function SeatTable({ audience }: { audience: 'academic' | 'company' }) {
  const { code } = useLocalCurrency();
  const cur = code === 'INR' ? 'inr' : 'usd';
  const fmt = cur === 'inr' ? inr : usd;

  const academic = audience === 'academic';
  const main = seatLists[academic ? 'academic' : 'company'];
  const capt = seatLists.academicCapt;
  const range = (min: number, max: number) => `${min}–${max}`;

  const cols = academic ? ['Students', 'Academy', 'Academy + CAPT'] : ['Team size', 'Per person'];
  const note = academic
    ? `Per student, per year. One free teacher seat for every ${main.freeSeats.per} students. Hosted campus CTFs included from 50 seats. No GST.`
    : `Per person, per year. One free manager seat for every ${main.freeSeats.per} people. Private team CTFs included from 25 seats. No GST.`;
  const quote = academic ? '/universities#plan' : '/companies#apply';

  return (
    <div className="mx-auto max-w-3xl">
      <table className="w-full border-collapse text-start">
        <caption className="sr-only">{academic ? 'Price per student seat by batch size' : 'Price per seat by team size'}</caption>
        <thead>
          <tr className="border-b border-white/15 text-[13px] uppercase tracking-[0.08em] text-white/45">
            {cols.map((c, i) => (
              <th key={c} scope="col" className={`py-3 font-medium ${i ? 'text-end' : 'text-start'}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {main.slabs.map((s, i) => (
            <tr key={s.name} className="border-b border-white/[0.07]">
              <th scope="row" className="py-4 pe-4 text-start font-normal">
                <span dir="ltr" className="text-[16px] text-white">{range(s.min, s.max)}</span>
                {s.recommended && <span className="ms-3 text-[13px] text-lime">Most chosen</span>}
              </th>
              <td className="py-4 text-end font-display text-lg text-white tabular-nums sm:text-xl">{fmt(s[cur])}</td>
              {academic && <td className="py-4 ps-4 text-end font-display text-lg text-white tabular-nums sm:text-xl">{fmt(capt.slabs[i][cur])}</td>}
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-4 pe-4 text-start font-normal text-[16px] text-white/60">{main.max}+</th>
            <td colSpan={academic ? 2 : 1} className="py-4 text-end text-[15px] text-white/60">Custom quote</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-5 text-[14px] leading-6 text-white/50">{note}</p>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link to={quote} className="btn btn-lime">Get a quote <ArrowRight size={16} /></Link>
        <p className="text-[14px] text-white/50">{main.terms[0]}.</p>
      </div>
    </div>
  );
}
