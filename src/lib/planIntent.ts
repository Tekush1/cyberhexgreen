import { plans, annualUsd } from '../data/plans';

/** "Interested in the Campus plan, annual ($1,490 a year)." from ?plan=campus&billing=annual, or '' when absent. */
export function planIntent(search: string): string {
  const q = new URLSearchParams(search);
  const id = q.get('plan');
  if (!id) return '';
  const plan = [...plans.institutions, ...plans.companies].find((p) => p.id === id);
  if (!plan) return '';
  const annual = q.get('billing') !== 'monthly';
  return `Interested in the ${plan.name} plan, ${annual ? `annual ($${annualUsd(plan).toLocaleString('en-US')} a year)` : `monthly ($${plan.monthlyUsd} a month)`}.`;
}
