import { plans, annualUsd } from '../data/plans';
import { quoteSeats, seatLists } from '../data/seats';

/** An opening line for the enquiry form from the link that brought the visitor:
 *  ?plan=campus&billing=annual → "Interested in the Campus plan, annual ($1,490 a year)."
 *  ?seats=64 on /universities → "Quote for 64 student seats (Department slab, $39 / ₹2,999 a seat)." */
export function planIntent(search: string, audience: 'academic' | 'company' = 'academic'): string {
  const q = new URLSearchParams(search);
  const seats = Number(q.get('seats'));
  if (seats) {
    const capt = audience === 'academic' && q.get('pkg') === 'capt';
    const list = seatLists[capt ? 'academicCapt' : audience];
    const usd = quoteSeats(list, seats, 'usd');
    const inr = quoteSeats(list, seats, 'inr');
    if (usd && inr) {
      return `Quote for ${seats} ${audience === 'academic' ? (capt ? 'Academy + CAPT student' : 'Academy student') : 'Pentest Lab team'} seats (${usd.slab.name} slab, $${usd.perSeat} / ₹${inr.perSeat.toLocaleString('en-IN')} a seat, a year).`;
    }
  }
  const id = q.get('plan');
  if (!id) return '';
  const plan = [...plans.institutions, ...plans.companies].find((p) => p.id === id);
  if (!plan) return '';
  const annual = q.get('billing') !== 'monthly';
  return `Interested in the ${plan.name} plan, ${annual ? `annual ($${annualUsd(plan).toLocaleString('en-US')} a year)` : `monthly ($${plan.monthlyUsd} a month)`}.`;
}
