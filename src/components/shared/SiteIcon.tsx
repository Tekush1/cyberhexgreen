export type IconName =
  | 'code'
  | 'code-light'
  | 'target'
  | 'swords'
  | 'user'
  | 'network'
  | 'gear'
  | 'shield'
  | 'ctf-orange'
  | 'ctf-green'
  | 'docker'
  | 'eyes'
  | 'ghost'
  | 'podium'
  | 'podium-flat'
  | 'trophy'
  | 'hexagon'
  | 'lock-key'
  | 'padlock'
  | 'cloud'
  | 'bug'
  | 'windows'
  | 'linux'
  | 'exit'
  | 'bell'
  | 'bell-dot'
  | 'toolbox'
  | 'receipt'
  | 'gauge'
  | 'ring'
  | 'calendar-fire'
  | 'hacker-team'
  | 'hacker-climb'
  | 'satellite';

interface SiteIconProps {
  name: IconName;
  size?: number;
  alt?: string;
  className?: string;
}

/**
 * Illustrated PNG/WebP icon from /public/icons/web.
 * Rendered bare — no box or badge around it — so the artwork carries itself.
 */
export const SiteIcon = ({ name, size = 64, alt = '', className = '' }: SiteIconProps) => (
  <img
    src={`/icons/web/${name}.webp`}
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
