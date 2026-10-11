import { useEffect, useRef, type CSSProperties } from 'react';

/* Host Your CTF hero: the cart mascot on a glowing stage.
   Rolls in from the left with a neon trail and brakes, then floats on a spinning
   portal ring with aura, rising sparks, a holographic shine and a 3D tilt toward
   the cursor. Shares the portal/aura/spark styles with the home hero. */

const SPARKS = [
  { x: '16%', d: '0.4s', dur: '5.2s', drift: '-12px' },
  { x: '30%', d: '2s', dur: '4.6s', drift: '10px', lime: true },
  { x: '48%', d: '3.3s', dur: '5.8s', drift: '-8px' },
  { x: '63%', d: '1.1s', dur: '4.9s', drift: '12px' },
  { x: '77%', d: '2.6s', dur: '5.4s', drift: '-10px', lime: true },
  { x: '88%', d: '4.1s', dur: '4.4s', drift: '8px' },
];

const IMG = '/mascots/cart-hero.webp';

export const HeroCart = () => {
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = tiltRef.current;
        if (!el) return;
        const b = el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / (window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / (window.innerHeight / 2)));
        el.style.transform = `rotateY(${dx * 14}deg) rotateX(${-dy * 8}deg)`;
        el.style.setProperty('--px', `${dx * -14}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div className="cart-hero relative mx-auto w-full max-w-[27rem]" aria-hidden="true">
      {/* stage light from above */}
      <div className="cart-spot" />
      <div className="pointer-events-none absolute inset-0">
        <span className="hero-aura" />
        <span className="hero-aura hero-aura-lime" />
      </div>

      <div className="cart-enter relative">
        <div className="cart-trail">
          <i style={{ top: '40%', width: '70%' }} />
          <i style={{ top: '56%', width: '96%', animationDelay: '60ms' }} />
          <i style={{ top: '72%', width: '62%', animationDelay: '120ms' }} />
          <i style={{ top: '86%', width: '84%', animationDelay: '30ms' }} />
        </div>

        <div className="cart-stage">
          <span className="hero-portal-anchor !bottom-[2%] !w-[78%]">
            <span className="hero-portal" />
            <span className="hero-portal hero-portal-wave" />
            <span className="hero-portal hero-portal-wave [animation-delay:1.6s]" />
          </span>
          <div className="pointer-events-none absolute inset-0">
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className={`hero-spark ${s.lime ? 'is-lime' : ''}`}
                style={{ '--x': s.x, '--d': s.d, '--dur': s.dur, '--drift': s.drift } as CSSProperties}
              />
            ))}
          </div>

          <div ref={tiltRef} className="cart-tilt">
            <div className="cart-float relative">
              <img
                src={IMG}
                width={720}
                height={706}
                alt=""
                decoding="async"
                fetchPriority="high"
                draggable={false}
                className="cart-img relative block h-auto w-full select-none"
              />
              {/* holographic shine, clipped to the artwork */}
              <span className="cart-sheen" style={{ WebkitMaskImage: `url(${IMG})`, maskImage: `url(${IMG})` }}>
                <i />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* floating glass chips (true facts only) */}
      <div className="cart-chip left-[-6%] top-[12%]" style={{ animationDelay: '1.9s' }}>
        <span className="cart-chip-dot bg-lime" />
        25–40 challenges included
      </div>
      <div className="cart-chip right-[-6%] top-[66%]" style={{ animationDelay: '2.15s' }}>
        <span className="cart-chip-dot bg-glow" />
        Pay after we confirm
      </div>
    </div>
  );
};

export default HeroCart;
