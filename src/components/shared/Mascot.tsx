export type MascotPose =
  | 'cheer'
  | 'thumbs'
  | 'laugh-point'
  | 'flag'
  | 'point'
  | 'jump'
  | 'trophy'
  | 'confused'
  | 'sad404'
  | 'detective'
  | 'blogging'
  | 'crying'
  | 'love';

interface MascotProps {
  pose: MascotPose;
  /** Tailwind classes for size and position, e.g. "w-48 md:w-72 absolute -top-24 right-4" */
  className?: string;
  alt?: string;
  eager?: boolean;
}

/** The CyberHx hoodie mascot. Images live in /public/mascots as transparent WebP. */
export const Mascot = ({ pose, className = '', alt = '', eager = false }: MascotProps) => (
  <img
    src={`/mascots/${pose}.webp`}
    alt={alt}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    draggable={false}
    className={`pointer-events-none select-none h-auto drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)] ${className}`}
  />
);

export default Mascot;
