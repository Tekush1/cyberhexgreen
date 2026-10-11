import { useEffect, useRef, useState, type CSSProperties } from 'react';

/* The shop mascot: one character in one spot that acts out the purchase.
   The page decides which frame to show; this component handles the 3D stage,
   the frame-to-frame transition, the speech bubble, the trolley counter and
   the confetti. Motion is transform/opacity only and stops for reduced motion. */

export type ShopFrame = 'idle' | 'arrive' | 'add-1' | 'add-2' | 'bill' | 'success' | 'sad';

const FRAMES: ShopFrame[] = ['idle', 'arrive', 'add-1', 'add-2', 'bill', 'success', 'sad'];
const src = (f: ShopFrame) => `/mascots/shop/${f}.webp`;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const ShopMascot = ({
  frame,
  bubble,
  count = 0,
  celebrate = 0,
  beside = false,
  hidden = false,
  raised = false,
}: {
  frame: ShopFrame;
  /** Text for the speech bubble; change it (or `frame`) to show it again. */
  bubble?: string;
  /** Items in the trolley; shows a counter badge when above zero. */
  count?: number;
  /** Bump to fire a confetti burst. */
  celebrate?: number;
  /** Desktop: move next to the open checkout drawer. */
  beside?: boolean;
  hidden?: boolean;
  /** Lift above the mobile build bar. */
  raised?: boolean;
}) => {
  const tiltRef = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState(false);
  const [shown, setShown] = useState<{ cur: ShopFrame; prev: ShopFrame | null; n: number }>({ cur: frame, prev: null, n: 0 });
  const [bubbleOn, setBubbleOn] = useState(false);

  // Frame change: keep the old frame underneath for a crossfade.
  useEffect(() => {
    setShown((s) => (s.cur === frame ? s : { cur: frame, prev: s.cur, n: s.n + 1 }));
  }, [frame]);

  // Load the other frames once the first one is on screen.
  useEffect(() => {
    const go = () => FRAMES.forEach((f) => { const i = new Image(); i.decoding = 'async'; i.src = src(f); });
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const t = window.setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(go) : go()), 1200);
    return () => window.clearTimeout(t);
  }, []);

  // Speech bubble: show on every new message, hide after a while.
  useEffect(() => {
    if (!bubble) {
      setBubbleOn(false);
      return;
    }
    setBubbleOn(true);
    const sticky = frame === 'bill';
    if (sticky) return;
    const t = window.setTimeout(() => setBubbleOn(false), 4200);
    return () => window.clearTimeout(t);
  }, [bubble, frame]);

  // 3D tilt toward the cursor, brighter glow over a Buy button.
  useEffect(() => {
    if (reducedMotion() || !window.matchMedia?.('(pointer: fine)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = tiltRef.current;
        if (!el) return;
        const box = el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2)));
        el.style.transform = `rotateY(${dx * 16}deg) rotateX(${-dy * 10}deg)`;
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

  // Beside the checkout drawer on desktop; out of the way on smaller screens,
  // where the drawer is (nearly) full width.
  const pos = beside
    ? 'lg:right-[calc(28rem+1.25rem)] max-lg:pointer-events-none max-lg:opacity-0'
    : 'lg:right-6';

  return (
    <div
      className={`shop-mascot fixed z-[61] right-2 w-28 sm:right-4 sm:w-40 lg:w-56 ${raised ? 'bottom-[5.5rem] lg:bottom-4' : 'bottom-3 lg:bottom-4'} ${pos} ${
        hidden ? 'is-hidden' : ''
      }`}
      data-hot={hot || undefined}
      data-frame={shown.cur}
      aria-hidden="true"
    >
      {/* speech bubble */}
      {bubble && (
        <div key={`${bubble}|${shown.n}`} className={`shop-bubble ${bubbleOn ? 'is-on' : ''}`}>
          {bubble}
        </div>
      )}

      <div className="shop-enter">
        <div className="shop-trail">
          <i style={{ top: '40%', width: '70%' }} />
          <i style={{ top: '56%', width: '95%', animationDelay: '60ms' }} />
          <i style={{ top: '72%', width: '60%', animationDelay: '120ms' }} />
        </div>
        <div className="shop-stage">
          {/* hologram platform */}
          <div className="shop-platform">
            <span className="shop-ring" />
            <span className="shop-ring shop-ring-2" />
            <span className="shop-beam" />
          </div>
          <div ref={tiltRef} className="shop-tilt">
            <div className="shop-float">
              <div className="shop-aura" />
              <div className="relative aspect-[480/476] w-full">
                {shown.prev && (
                  <img key={`p${shown.n}`} src={src(shown.prev)} alt="" className="shop-frame shop-frame-out" draggable={false} />
                )}
                <img
                  key={`c${shown.n}`}
                  src={src(shown.cur)}
                  width={480}
                  height={476}
                  alt=""
                  decoding="async"
                  fetchPriority={shown.n === 0 ? 'high' : 'auto'}
                  draggable={false}
                  className={`shop-frame ${shown.n > 0 ? 'shop-frame-in' : ''}`}
                />
              </div>
              {count > 0 && (
                <span key={count} className="shop-count">
                  {count}
                </span>
              )}
              {celebrate > 0 && (
                <div key={celebrate} className="shop-confetti">
                  {Array.from({ length: 16 }, (_, i) => (
                    <i key={i} style={{ '--a': `${(i / 16) * 360}deg`, '--d': `${70 + (i % 4) * 18}px` } as CSSProperties} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <span className="shop-live">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime" />
        </span>
        Live · Orders open
      </span>
    </div>
  );
};

export default ShopMascot;
