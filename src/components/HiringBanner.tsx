import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';

/* A small, dismissible hiring card. Desktop only, appears after a short delay,
   stays away on pages where it would cover working UI. */

const KEY = 'cyberhx-hiring-banner-dismissed';
const readDismissed = () => {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
};

export const HiringBanner = () => {
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 6000);
    return () => clearTimeout(t);
  }, [dismissed]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    try {
      localStorage.setItem(KEY, 'true');
    } catch {
      /* storage blocked */
    }
  };

  const hidden = ['/host-your-ctf', '/blog/write', '/blog/edit', '/admin', '/contact'].some((p) => pathname.startsWith(p));
  if (dismissed || hidden) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed bottom-6 right-6 z-40 hidden w-[19rem] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b1222]/95 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl md:block"
          aria-label="We're hiring"
        >
          <div className="h-1 w-full bg-gradient-to-r from-glow via-lime to-glow" aria-hidden="true" />
          <div className="flex gap-3 p-4">
            <img src="/mascots/laugh-point.webp" alt="" className="h-14 w-14 shrink-0 object-contain" loading="lazy" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">We're hiring</p>
              <p className="mt-0.5 text-[13px] leading-5 text-muted">Sales and relationship roles. Help colleges and companies run their CTFs.</p>
              <Link
                to="/contact?apply"
                onClick={() => setVisible(false)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lime hover:underline underline-offset-4"
              >
                Apply now <ArrowRight size={14} />
              </Link>
            </div>
            <button type="button" onClick={dismiss} aria-label="Dismiss hiring message" className="-mr-1 -mt-1 h-7 w-7 shrink-0 rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white">
              <X size={15} className="mx-auto" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default HiringBanner;
