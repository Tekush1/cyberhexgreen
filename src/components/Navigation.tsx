import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ExternalLink } from 'lucide-react';
import { SiteIcon, type IconName } from './shared/SiteIcon';
import { Mascot } from './shared/Mascot';

const links = [
  { name: 'Events', to: '/gallery' },
  { name: 'Host a CTF', to: '/host-your-ctf' },
  { name: 'Blog', to: '/blog' },
  { name: 'About', to: '/about' },
  { name: 'Contact', to: '/contact' },
];

const platforms: { name: string; href: string; icon: IconName; desc: string }[] = [
  { name: 'Pentest Lab', href: 'https://pentestlab.cyberhx.com', icon: 'toolbox', desc: 'Hands-on hacking labs' },
  { name: 'CTF Platform', href: 'https://ctf.cyberhx.com', icon: 'ctf-green', desc: 'Play live challenges' },
];

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setPlatformsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setPlatformsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlatformsOpen(false);
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl px-3.5 py-2 text-[0.95rem] font-semibold transition-colors ${
      isActive ? 'text-lime' : 'text-white/75 hover:text-white'
    }`;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        isScrolled || isOpen ? 'border-b-2 border-line bg-ink/95 backdrop-blur-md' : 'border-b-2 border-transparent'
      }`}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center" aria-label="CyberHx home">
          <img
            src="https://i.ibb.co/pBpxn1Sj/Cyberhx-Neon-Swoosh-Logo.png"
            alt="CyberHx"
            className="h-10 w-auto object-contain sm:h-11"
          />
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {l.name}
            </NavLink>
          ))}

          <div className="relative" ref={dropRef}>
            <button
              type="button"
              onClick={() => setPlatformsOpen((v) => !v)}
              aria-expanded={platformsOpen}
              className="flex items-center gap-1 rounded-xl px-3.5 py-2 text-[0.95rem] font-semibold text-white/75 transition-colors hover:text-white"
            >
              Platforms
              <ChevronDown size={16} className={`transition-transform ${platformsOpen ? 'rotate-180' : ''}`} />
            </button>
            {platformsOpen && (
              <div className="sticker absolute right-0 top-full mt-3 w-72 p-2">
                {platforms.map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.05]"
                  >
                    <SiteIcon name={p.icon} size={52} alt="" />
                    <span className="flex-1">
                      <span className="flex items-center gap-1.5 font-semibold text-white">
                        {p.name} <ExternalLink size={13} className="text-white/40" />
                      </span>
                      <span className="text-sm text-muted">{p.desc}</span>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <Link to="/host-your-ctf#build" className="btn btn-lime ml-3 !min-h-[44px] !px-5 !text-sm">
            See pricing
          </Link>
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

      {/* Mobile sheet */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-ink lg:hidden">
          <div className="flex min-h-full flex-col px-5 pb-10 pt-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `font-display border-b-2 border-line py-4 text-3xl ${isActive ? 'text-lime' : 'text-white'}`
              }
            >
              Home
            </NavLink>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `font-display border-b-2 border-line py-4 text-3xl ${isActive ? 'text-lime' : 'text-white'}`
                }
              >
                {l.name}
              </NavLink>
            ))}

            <p className="mt-8 text-sm font-semibold text-muted">Our platforms</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {platforms.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sticker flex flex-col items-start gap-2 p-4"
                >
                  <SiteIcon name={p.icon} size={56} alt="" />
                  <span className="font-semibold text-white">{p.name}</span>
                </a>
              ))}
            </div>

            <div className="relative mt-auto pt-24">
              <Mascot pose="jump" alt="" className="absolute -top-2 right-2 w-32" />
              <Link to="/host-your-ctf#build" className="btn btn-lime w-full">
                See hosting pricing
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
