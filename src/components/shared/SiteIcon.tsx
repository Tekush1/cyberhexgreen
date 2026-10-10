
type IconName =
  | 'code'
  | 'lock-key'
  | 'code-light'
  | 'target'
  | 'padlock'
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
  | 'trophy'
  | 'hexagon';

const ICON_FILES: Record<IconName, string> = {
  code: 'icon-01.png',
  'lock-key': 'icon-02.png',
  'code-light': 'icon-03.png',
  target: 'icon-04.png',
  padlock: 'icon-05.png',
  swords: 'icon-06.png',
  user: 'icon-07.png',
  network: 'icon-08.png',
  gear: 'icon-09.png',
  shield: 'icon-10.png',
  'ctf-orange': 'icon-11.png',
  'ctf-green': 'icon-12.png',
  docker: 'icon-14.png',
  eyes: 'icon-15.png',
  ghost: 'icon-16.png',
  podium: 'icon-17.png',
  trophy: 'icon-18.png',
  hexagon: 'icon-19.png',
};

interface SiteIconProps {
  name: IconName;
  size?: number;
  alt?: string;
  className?: string;
}

export const SiteIcon = ({ name, size = 40, alt = '', className = '' }: SiteIconProps) => (
  <img
    src={`/icons/${ICON_FILES[name]}`}
    alt={alt}
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    className={`object-contain ${className}`}
    style={{ width: size, height: size }}
  />
);

export default SiteIcon;
