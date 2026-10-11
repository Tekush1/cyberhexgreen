import { useEffect, useRef, useState } from 'react';
import { SiteIcon, type IconName } from './SiteIcon';

/* The store mascot: pushes a CTF cart in from the left, brakes, and stays.
   - variant "hero": big, in the hero's right column.
   - variant "dock": small, fixed bottom-right while the hero is off screen
     (and always on phones, so the packages stay near the top).
   Pass `drop` with a new id each time something is bought: the item falls
   into the cart and the cart flashes. Motion is CSS transform/opacity only,
   and everything stops for people who ask for reduced motion. */

export type CartDrop = { id: number; icon: IconName } | null;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const StoreMascot = ({
  variant,
  drop,
  visible = true,
  raised = false,
}: {
  variant: 'hero' | 'dock';
  drop: CartDrop;
  visible?: boolean;
  raised?: boolean;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState(false);
  const [mounted, setMounted] = useState(variant === 'hero' || visible);

  // The dock enters the first time it is needed, then just fades in and out.
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  // Idea 6: lean toward the cursor, and glow harder over a Buy button.
  useEffect(() => {
    if (reducedMotion() || !window.matchMedia?.('(pointer: fine)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = tiltRef.current;
        const box = rootRef.current?.getBoundingClientRect();
        if (!el || !box) return;
        const dx = Math.max(-1, Math.min(1, (e.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2)));
        el.style.transform = `translate3d(${dx * 8}px, ${dy * 4}px, 0) rotate(${dx * 4}deg)`;
      });
    };
    const onOver = (e: PointerEvent) => setHot(!!(e.target as Element | null)?.closest?.('[data-buy]'));
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
    };
  }, []);

  // Idea 3: the cart bumps when something lands in it.
  useEffect(() => {
    if (!drop || reducedMotion()) return;
    const t = setTimeout(() => {
      cartRef.current?.animate(
        [
          { transform: 'translateY(0) rotate(0)' },
          { transform: 'translateY(5px) rotate(-1.5deg)' },
          { transform: 'translateY(-3px) rotate(1deg)' },
          { transform: 'translateY(0) rotate(0)' },
        ],
        { duration: 420, easing: 'ease-out' },
      );
    }, 380);
    return () => clearTimeout(t);
  }, [drop]);

  if (!mounted) return null;

  const isDock = variant === 'dock';
  const wrap = isDock
    ? `sm-dock fixed right-3 z-40 w-24 sm:right-5 sm:w-32 lg:w-40 ${raised ? 'bottom-24 lg:bottom-5' : 'bottom-4 sm:bottom-5'} ${
        visible ? '' : 'is-hidden'
      }`
    : 'relative mx-auto w-full max-w-[22rem]';

  return (
    <div ref={rootRef} className={wrap} data-hot={hot || undefined} aria-hidden="true">
      {/* Idea 5: an honest live badge, no made-up orders */}
      {isDock ? (
        <span className="sm-badge absolute -top-2 left-0 z-10 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime" />
          </span>
          Live
        </span>
      ) : (
        <div className="sm-badge absolute -top-4 left-0 z-10 rounded-2xl px-3.5 py-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lime">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
            </span>
            Live · Orders open
          </div>
          <div className="mt-0.5 text-[11px] text-white/70">Most picked: Pro</div>
        </div>
      )}

      <div className="sm-ground" />
      <div className="sm-mover">
        {/* Idea 2: neon speed lines behind the cart while it rolls in */}
        <div className="sm-trail">
          <i style={{ top: '38%', width: '70%' }} />
          <i style={{ top: '52%', width: '95%', animationDelay: '60ms' }} />
          <i style={{ top: '66%', width: '60%', animationDelay: '120ms' }} />
          <i style={{ top: '80%', width: '85%', animationDelay: '30ms' }} />
        </div>
        <div ref={tiltRef} className="sm-tilt">
          <div className="sm-walk">
            <div className="sm-bob">
              <div ref={cartRef} className="relative">
                <div className="sm-aura" />
                <img
                  src={isDock ? '/mascots/cart-sm.webp' : '/mascots/cart.webp'}
                  width={isDock ? 320 : 640}
                  height={isDock ? 314 : 628}
                  alt=""
                  decoding="async"
                  loading={isDock ? 'lazy' : 'eager'}
                  fetchPriority={isDock ? 'auto' : 'high'}
                  draggable={false}
                  className="sm-img relative block h-auto w-full select-none"
                />
                {drop && (
                  <span key={drop.id} className="sm-drop">
                    <SiteIcon name={drop.icon} size={isDock ? 26 : 44} alt="" />
                  </span>
                )}
                {drop && <span key={`f${drop.id}`} className="sm-flash" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreMascot;
