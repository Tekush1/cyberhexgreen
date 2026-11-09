import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ExternalLink, ArrowRight } from 'lucide-react';
import { Mascot } from './shared/Mascot';

/* Site navigation. Five groups instead of a flat row of links, so a visitor can tell at a glance what
   CyberHx sells (Products), who it is for (Solutions), and where to play (Events). One primary action:
   Host a CTF. Desktop: hover or click to open a group; Escape or a click outside closes it.
   Mobile: a full-screen sheet with the same groups as accordions. */

interface Item {
  name: string;
  desc: string;
  to: string;           // internal path or https:// URL
  tag?: string;         // short note on the right, e.g. "from $89"
}
interface Group {
  key: string;
  label: string;
  items: Item[];
  /** Line under the panel; a hint on where to start. */
  foot?: { text: string; to: string };
  /** Panel layout: two columns, or a single list. */
  layout: 'cards' | 'list';
}

const GROUPS: Group[] = [
  {
    key: 'products',
    label: 'Products',
    layout: 'cards',
    items: [
      { name: 'Host a CTF', desc: 'Ready-made CTF packages, built and run for you', to: '/host-your-ctf', tag: 'from $89' },
      { name: 'Pentest Lab', desc: 'Hands-on hacking labs on real targets', to: 'https://pentestlab.cyberhx.com' },
      { name: 'Certifications', desc: 'CAPT and CPPT: practical pentest exams', to: '/certifications', tag: 'from $149' },
      { name: 'CTF Platform', desc: 'Play live challenges and climb the board', to: 'https://ctf.cyberhx.com' },
    ],
    foot: { text: 'See every price on one page', to: '/pricing' },
  },
  {
    key: 'solutions',
    label: 'Solutions',
    layout: 'cards',
    items: [
      { name: 'For Universities', desc: 'Campus CTFs, labs for a batch and the Campus League', to: '/universities' },
      { name: 'For Companies', desc: 'Hiring CTFs, verified talent and team training', to: '/companies' },
      { name: 'For Students', desc: 'Play our CTFs, get certified, join the community', to: '/events' },
      { name: 'Student Ambassadors', desc: 'Lead CyberHx on your campus, anywhere in the world', to: '/ambassadors' },
    ],
  },
  {
    key: 'resources',
    label: 'Resources',
    layout: 'list',
    items: [
      { name: 'Blog', desc: 'CTF write-ups, scam alerts and tutorials', to: '/blog' },
      { name: 'Reviews', desc: 'What players say about our events', to: '/reviews' },
      { name: 'Hall of Fame', desc: 'Researchers who reported bugs to us', to: '/hall-of-fame' },
      { name: 'Responsible disclosure', desc: 'How to report a vulnerability', to: '/responsible-disclosure' },
    ],
  },
  {
    key: 'company',
    label: 'Company',
    layout: 'list',
    items: [
      { name: 'About', desc: 'The team and the story', to: '/about' },
      { name: 'Partners', desc: 'Collaborate or sponsor', to: '/collaborations' },
      { name: 'Contact', desc: 'Questions, partnerships, careers', to: '/contact' },
    ],
  },
];

const isExternal = (to: string) => to.startsWith('http');
const inGroup = (g: Group, path: string) => g.items.some((i) => !isExternal(i.to) && (path === i.to || (i.to !== '/events' && path.startsWith(i.to + '/'))));

/** One entry in a dropdown or the mobile sheet. Internal paths use the router; platforms open in a new tab. */
function ItemLink({ item, onPick }: { item: Item; onPick?: () => void }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold text-white">
          <span className="truncate">{item.name}</span>
          {isExternal(item.to) && <ExternalLink size={13} className="shrink-0 text-white/40" />}
          {item.tag && <span className="ml-auto shrink-0 font-mono text-[11px] text-lime">{item.tag}</span>}
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-white/50">{item.desc}</span>
      </span>
    </>
  );
  const cls = `flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors hover:bg-white/[0.05] focus:outline-none focus-visible:bg-white/[0.06]`;
  return isExternal(item.to) ? (
    <a href={item.to} target="_blank" rel="noopener noreferrer" className={cls} onClick={onPick}>{inner}</a>
  ) : (
    <Link to={item.to} className={cls} onClick={onPick}>{inner}</Link>
  );
}

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);          // mobile sheet
  const [open, setOpen] = useState<string | null>(null); // desktop group key
  const [mobileOpen, setMobileOpen] = useState<string | null>('products');
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const barRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setOpen(null);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(null); setIsOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Hover opens at once and closes after a short grace, so moving the mouse across the bar doesn't flicker.
  const hoverOpen = useCallback((key: string) => { window.clearTimeout(closeTimer.current); setOpen(key); }, []);
  const hoverClose = useCallback(() => { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(null), 140); }, []);

  const topCls = (active: boolean, expanded = false) =>
    `flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-[0.95rem] font-semibold transition-colors xl:px-3.5 ${
      active ? 'text-lime' : expanded ? 'text-white' : 'text-white/75 hover:text-white'
    }`;

  const groupButton = (g: Group) => (
    <div key={g.key} className="relative" onMouseEnter={() => hoverOpen(g.key)}>
      <button
        type="button"
        onClick={() => setOpen(open === g.key ? null : g.key)}
        aria-expanded={open === g.key}
        aria-haspopup="true"
        className={topCls(inGroup(g, location.pathname), open === g.key)}
      >
        {g.label}
        <ChevronDown size={15} className={`transition-transform ${open === g.key ? 'rotate-180' : ''}`} />
      </button>
      {open === g.key && <Panel group={g} />}
    </div>
  );

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
          isScrolled || isOpen || open ? 'border-b-2 border-line bg-ink/95 backdrop-blur-md' : 'border-b-2 border-transparent'
        }`}
        aria-label="Main navigation"
      >
        <div ref={barRef} className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center" aria-label="CyberHx home">
            <img src="https://i.ibb.co/pBpxn1Sj/Cyberhx-Neon-Swoosh-Logo.png" alt="CyberHx" className="h-10 w-auto object-contain sm:h-11" />
          </Link>

          {/* Desktop */}
          <div className="hidden items-center gap-0.5 lg:flex" onMouseLeave={hoverClose}>
            {GROUPS.slice(0, 2).map(groupButton)}

            <NavLink to="/events" className={({ isActive }) => topCls(isActive || location.pathname.startsWith('/events/'))} onMouseEnter={hoverClose}>
              Events
            </NavLink>

            {GROUPS.slice(2).map(groupButton)}

            <div className="ml-3 flex items-center gap-2" onMouseEnter={hoverClose}>
              <Link to="/pricing" className="btn btn-ghost !hidden !min-h-[44px] !px-4 !text-sm xl:!inline-flex">
                Pricing
              </Link>
              <Link to="/host-your-ctf" className="btn btn-lime !min-h-[44px] !px-5 !text-sm">
                Host a CTF
              </Link>
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-line text-white lg:hidden"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto bg-ink sm:top-[72px] lg:hidden">
          <div className="flex min-h-full flex-col px-5 pb-10 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/host-your-ctf" className="btn btn-lime !min-h-[48px] !px-3 !text-[15px]">Host a CTF</Link>
              <Link to="/pricing" className="btn btn-ghost !min-h-[48px] !px-3 !text-[15px]">Pricing</Link>
            </div>

            <NavLink
              to="/events"
              className={({ isActive }) => `font-display mt-4 flex items-center justify-between border-b-2 border-line py-4 text-3xl ${isActive ? 'text-lime' : 'text-white'}`}
            >
              Events <ArrowRight size={22} className="text-white/40" />
            </NavLink>

            {GROUPS.map((g) => {
              const expanded = mobileOpen === g.key;
              const active = inGroup(g, location.pathname);
              return (
                <div key={g.key} className="border-b-2 border-line">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(expanded ? null : g.key)}
                    aria-expanded={expanded}
                    className={`font-display flex w-full items-center justify-between py-4 text-left text-3xl ${active ? 'text-lime' : 'text-white'}`}
                  >
                    {g.label}
                    <ChevronDown size={24} className={`text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && (
                    <div className="-mx-3.5 grid gap-0.5 pb-3">
                      {g.items.map((it) => <ItemLink key={it.to} item={it} onPick={() => setIsOpen(false)} />)}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="relative mt-auto pt-24">
              <Mascot pose="jump" alt="" className="absolute -top-2 right-2 w-32" />
              <p className="text-sm text-white/45">Questions? <Link to="/contact" className="text-white underline underline-offset-4">Talk to us</Link></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/** The open dropdown under a group label. */
function Panel({ group }: { group: Group }) {
  const cards = group.layout === 'cards';
  return (
    <div
      role="menu"
      className={`sticker absolute left-1/2 top-full mt-3 -translate-x-1/2 p-2 ${cards ? 'w-[34rem]' : 'w-72'}`}
    >
      <div className={cards ? 'grid grid-cols-2 gap-0.5' : 'grid gap-0.5'}>
        {group.items.map((it) => <ItemLink key={it.to} item={it} />)}
      </div>
      {group.foot && (
        <Link to={group.foot.to} className="mt-1 flex items-center justify-between gap-3 rounded-2xl border-t border-white/[0.07] px-3 py-3 text-[13px] text-white/60 transition-colors hover:text-white">
          {group.foot.text} <ArrowRight size={14} className="shrink-0 text-lime" />
        </Link>
      )}
    </div>
  );
}

export default Navigation;
