import { Github, Linkedin, Twitter, Instagram, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Mascot } from './shared/Mascot';
import { SubscribeForm } from './shared/SubscribeForm';

const columns = [
  {
    title: 'Events',
    links: [
      { label: 'Browse events', to: '/gallery' },
      { label: 'Host a CTF', to: '/host-your-ctf' },
      { label: 'Hosting prices', to: '/host-your-ctf#packages' },
      { label: 'Hall of fame', to: '/hall-of-fame' },
    ],
  },
  {
    title: 'CyberHx',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Collaborations', to: '/collaborations' },
      { label: 'Contact', to: '/contact' },
    ],
  },
];

const emails = ['contact@cyberhx.com', 'support@cyberhx.com', 'hr@cyberhx.com', 'ceo@cyberhx.com'];

const socials = [
  { label: 'Instagram', href: 'https://instagram.com/zerodayheist', Icon: Instagram },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/cyberhx', Icon: Linkedin },
  { label: 'Twitter', href: 'https://twitter.com/cyberhx', Icon: Twitter },
  { label: 'GitHub', href: 'https://github.com/Tekush1', Icon: Github },
];

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-white/[0.06] bg-[#050812] pt-16 sm:pt-20">
      <div className="mx-auto max-w-7xl px-5 pb-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <p className="font-display max-w-xl text-3xl leading-[1.05] text-white sm:text-5xl">See you on the scoreboard.</p>
          <Mascot pose="jump" alt="" className="-mb-2 w-24 shrink-0 sm:w-32 lg:w-36" />
        </div>
        <div className="mt-10 grid gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-10">
          <div>
            <h4 className="font-display text-xl text-white sm:text-2xl">Never miss a CTF.</h4>
            <p className="mt-1.5 text-sm leading-6 text-muted">Get new events, registrations and results straight to your inbox.</p>
          </div>
          <SubscribeForm source="footer" />
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:mt-20 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" aria-label="CyberHx home" className="inline-block">
              <img src="/cyberhx-logo.png" alt="CyberHx" className="h-12 w-auto object-contain" />
            </Link>
            <p className="mt-5 max-w-xs leading-7 text-muted">
              Open CTFs for the global security community, and hosted CTFs for universities, companies and communities worldwide.
            </p>
            <div className="mt-6 flex gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:border-glow hover:text-white"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-lg text-white">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-muted transition-colors hover:text-lime">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 lg:col-span-1">
            <h4 className="font-display text-lg text-white">Write to us</h4>
            <ul className="mt-4 space-y-3">
              {emails.map((e) => (
                <li key={e}>
                  <a href={`mailto:${e}`} className="flex items-center gap-2 text-muted transition-colors hover:text-lime">
                    <Mail size={15} className="shrink-0 text-glow" />
                    {e}
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-2 text-muted">
                <MapPin size={15} className="shrink-0 text-glow" />
                Serving teams worldwide
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t-2 border-line pt-6 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} CyberHx</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/responsible-disclosure" className="hover:text-white">Report a bug</Link>
            <a href="/.well-known/security.txt" className="hover:text-white">security.txt</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
