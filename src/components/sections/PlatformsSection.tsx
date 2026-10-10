import { Link } from 'react-router-dom';
import { SiteIcon, type IconName } from '../shared/SiteIcon';
import { Reveal } from '../shared/Reveal';

const items: { icon: IconName; title: string; text: string; href: string; cta: string; external?: boolean }[] = [
  {
    icon: 'ctf-green',
    title: 'CTF Platform',
    text: 'Practice challenges from beginner to hard, with hints and a scoreboard between events.',
    href: 'https://ctf.cyberhx.com',
    cta: 'Play a challenge',
    external: true,
  },
  {
    icon: 'code',
    title: 'Blog and write-ups',
    text: 'Challenge write-ups, scam breakdowns and tutorials from the CyberHx community.',
    href: '/blog',
    cta: 'Read the blog',
  },
  {
    icon: 'bug',
    title: 'Found a bug in our site?',
    text: 'Report it responsibly and get your name on our hall of fame.',
    href: '/responsible-disclosure',
    cta: 'Report a bug',
  },
  {
    icon: 'podium',
    title: 'Hall of fame',
    text: 'Researchers and players who made CyberHx better and safer.',
    href: '/hall-of-fame',
    cta: 'See the hall of fame',
  },
];

export const PlatformsSection = () => (
  <section className="border-t-2 border-line bg-ink py-20 sm:py-28">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <Reveal>
        <h2 className="font-display max-w-2xl text-4xl text-white sm:text-5xl">Practice between events</h2>
      </Reveal>
      <div className="mt-12 grid gap-x-14 sm:grid-cols-2">
        {items.map((it, i) => {
          const inner = (
            <>
              <SiteIcon name={it.icon} size={84} alt="" className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              <div>
                <h3 className="font-display text-2xl text-white">{it.title}</h3>
                <p className="mt-2 leading-7 text-muted">{it.text}</p>
                <span className="mt-3 inline-block font-semibold text-lime underline-offset-4 group-hover:underline">
                  {it.cta}
                </span>
              </div>
            </>
          );
          const cls = 'group flex flex-col items-start gap-4 border-b-2 border-line py-8 sm:flex-row sm:gap-6';
          return (
            <Reveal key={it.title} delay={(i % 2) * 0.1}>
              {it.external ? (
                <a href={it.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link to={it.href} className={cls}>
                  {inner}
                </Link>
              )}
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default PlatformsSection;
