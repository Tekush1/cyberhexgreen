// Headline numbers shown on the home page and the events page.
// Taken from src/data/events.ts: Null Origin (6000+ hackers, 3500+ teams, ₹10L+)
// and ZeroDay Heist (1.4K+ players, ₹2.5L+). Update when a new event finishes.
export const stats = [
  { to: 7400, suffix: '+', label: 'hackers played' },
  { to: 3500, suffix: '+', label: 'teams on the board' },
  { to: 12.5, prefix: '₹', suffix: 'L+', decimals: 1, label: 'in rewards' },
  { to: 2, label: 'CTFtime events' },
];
