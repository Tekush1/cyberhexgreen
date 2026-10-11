import { useId } from 'react';

export type CertBadgeTone = 'cyan' | 'lime';

const tones: Record<CertBadgeTone, { hi: string; mid: string; lo: string; ink: string; line: string }> = {
  cyan: { hi: '#7fe6ff', mid: '#1f9fc6', lo: '#0b3d55', ink: '#e8fbff', line: '#bff2ff' },
  lime: { hi: '#e2ff7a', mid: '#8fbf12', lo: '#2f4a05', ink: '#f6ffdc', line: '#efffb8' },
};

/** Line emblems, drawn by hand on a 48×48 grid. */
const Emblem = ({ kind, color }: { kind: 'target' | 'shield'; color: string }) =>
  kind === 'target' ? (
    <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="24" cy="24" r="13" />
      <circle cx="24" cy="24" r="6.5" opacity="0.7" />
      <circle cx="24" cy="24" r="1.8" fill={color} stroke="none" />
      <path d="M24 4v8M24 36v8M4 24h8M36 24h8" />
    </g>
  ) : (
    <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 4 40 10v12c0 10.5-6.8 18.6-16 22-9.2-3.4-16-11.5-16-22V10Z" />
      <path d="m16.5 19 6 5-6 5" />
      <path d="M26 30h7" />
    </g>
  );

/**
 * CyberHx certification badge, drawn entirely in SVG so it stays sharp at any size.
 * Hexagon with a tinted glass body, a dark code band and a line emblem.
 */
export const CertBadge = ({
  code,
  tone,
  emblem,
  className = '',
  title,
}: {
  code: string;
  tone: CertBadgeTone;
  emblem: 'target' | 'shield';
  className?: string;
  title?: string;
}) => {
  const id = useId().replace(/:/g, '');
  const t = tones[tone];
  const hex = 'M120 6 230 69.5v127L120 260 10 196.5v-127Z';
  const inner = 'M120 17 220.5 75v116L120 249 19.5 191V75Z';

  return (
    <svg viewBox="0 0 240 266" className={className} role="img" aria-label={title ?? `CyberHx ${code} badge`}>
      <defs>
        <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.hi} stopOpacity="0.95" />
          <stop offset="0.45" stopColor={t.mid} stopOpacity="0.9" />
          <stop offset="1" stopColor={t.lo} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`band-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1120" stopOpacity="0.92" />
          <stop offset="1" stopColor="#05080f" stopOpacity="0.92" />
        </linearGradient>
        <radialGradient id={`glare-${id}`} cx="0.3" cy="0.05" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`clip-${id}`}>
          <path d={inner} />
        </clipPath>
      </defs>

      {/* Body */}
      <path d={hex} fill={`url(#body-${id})`} stroke={t.lo} strokeWidth="10" strokeLinejoin="round" />
      <path d={hex} fill="none" stroke={`url(#rim-${id})`} strokeWidth="1.5" strokeLinejoin="round" />

      <g clipPath={`url(#clip-${id})`}>
        {/* Top plate */}
        <rect x="0" y="0" width="240" height="96" fill="#000" opacity="0.18" />
        {/* Faint grid */}
        <g stroke="#fff" strokeOpacity="0.07" strokeWidth="1">
          {[40, 70, 100, 130, 160, 190].map((x) => (
            <path key={x} d={`M${x} 160v100`} />
          ))}
          {[185, 210, 235].map((y) => (
            <path key={y} d={`M0 ${y}h240`} />
          ))}
        </g>
        {/* Code band */}
        <rect x="0" y="96" width="240" height="64" fill={`url(#band-${id})`} />
        <path d="M0 96h240M0 160h240" stroke="#fff" strokeOpacity="0.14" />
        {/* Glare */}
        <path d={inner} fill={`url(#glare-${id})`} />
        {/* Hover sheen (animated from CSS) */}
        <rect className="cb-sheen" x="-240" y="0" width="240" height="266" fill={`url(#sheen-${id})`} transform="skewX(-18)" />
      </g>
      <path d={inner} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1" />

      {/* Brand */}
      <g transform="translate(120 66)">
        <path d="M-50 -7 -44 0l-6 7" fill="none" stroke={t.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <text
          x="-38"
          y="5.5"
          fill={t.ink}
          style={{ font: '800 15px Archivo, sans-serif', fontStretch: '115%', letterSpacing: '0.04em' }}
        >
          CyberHx
        </text>
      </g>

      {/* Code */}
      <text
        x="120"
        y="143"
        textAnchor="middle"
        fill="#fff"
        style={{ font: '900 46px Archivo, sans-serif', fontStretch: '112%', letterSpacing: '0.02em' }}
      >
        {code}
      </text>

      {/* Emblem */}
      <g transform="translate(96 176)">
        <Emblem kind={emblem} color={t.line} />
      </g>
    </svg>
  );
};

export default CertBadge;
