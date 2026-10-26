import type { IconName } from './iconNames';
export type { IconName } from './iconNames';

interface SiteIconProps {
  name: IconName;
  size?: number;
  alt?: string;
  className?: string;
}

/**
 * Browsers keep /icons for 7 days (vercel.json). When an artwork file changes, bump its number
 * here so visitors get the new picture straight away instead of the cached one.
 */
const ART_VERSION: Partial<Record<IconName, number>> = {
  'hacker-team': 2, // shield badge painted out
};

/**
 * Illustrated PNG/WebP icon from /public/icons/web.
 * Rendered bare — no box or badge around it — so the artwork carries itself.
 */
export const SiteIcon = ({ name, size = 64, alt = '', className = '' }: SiteIconProps) => (
  <img
    src={`/icons/web/${name}.webp${ART_VERSION[name] ? `?v=${ART_VERSION[name]}` : ''}`}
    alt={alt}
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    draggable={false}
    className={`object-contain select-none shrink-0 ${className}`}
    style={{ width: size, height: size }}
  />
);

export default SiteIcon;
