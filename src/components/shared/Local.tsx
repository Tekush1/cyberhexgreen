import { useLocalCurrency } from '../../lib/currency';

/** "≈ ₹7,850" next to a USD price, in the visitor's currency. Renders nothing for USD visitors or before rates load. */
export const Local = ({ usd, className = 'text-muted' }: { usd: number; className?: string }) => {
  const { fmt } = useLocalCurrency();
  const text = fmt(usd);
  if (!text) return null;
  return <span className={className}>≈ {text}</span>;
};

export default Local;
