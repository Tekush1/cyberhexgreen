import { useEffect, useRef, useState } from 'react';

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
  /** Skip the reveal (e.g. when a parent already animates the mascot). */
  still?: boolean;
}

/** The CyberHx hoodie mascot. Images live in /public/mascots as transparent WebP.
    It reveals once, softly, the first time it scrolls into view. */
export const Mascot = ({ pose, className = '', alt = '', eager = false, still = false }: MascotProps) => {
  const ref = useRef<HTMLImageElement>(null);
  const [shown, setShown] = useState(still);

  useEffect(() => {
    if (still || shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still, shown]);

  return (
    <img
      ref={ref}
      src={`/mascots/${pose}.webp`}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`mascot-reveal ${shown ? 'is-in' : ''} pointer-events-none select-none drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)] ${className}`}
    />
  );
};

export default Mascot;
