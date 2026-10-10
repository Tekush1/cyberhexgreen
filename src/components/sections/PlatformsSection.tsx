import { Link } from 'react-router-dom';
import { SiteIcon, type IconName } from '../shared/SiteIcon';

const items: { icon: IconName; title: string; text: string; href: string; external?: boolean }[] = [
  { icon: 'ctf-green', title: 'CTF Platform', text: 'Practice challenges with hints and a scoreboard.', href: 'https://ctf.cyberhx.com', external: true },
  { icon: 'code', title: 'Blog', text: 'Write-ups, scam breakdowns and tutorials.', href: '/blog' },
  { icon: 'bug', title: 'Report a bug', text: 'Found one in our site? Tell us responsibly.', href: '/responsible-disclosure' },
  { icon: 'podium', title: 'Hall of fame', text: 'People who made CyberHx safer.', href: '/hall-of-fame' },
];

export const PlatformsSection = () => (
  <section className="border-t-2 border-line bg-ink py-16 sm:py-20">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl text-white sm:text-4xl">Between events</h2>
      <div className="mt-8 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => {
          const inner = (
            <>
              <SiteIcon name={it.icon} size={56} alt="" className="shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              <span>
                <span className="block font-semibold text-white group-hover:text-lime">{it.title}</span>
                <span className="mt-0.5 block text-sm leading-5 text-muted">{it.text}</span>
              </span>
            </>
          );
          const cls = 'group flex items-center gap-4 rounded-xl py-3';
          return it.external ? (
            <a key={it.title} href={it.href} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={it.title} to={it.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

export default PlatformsSection;
