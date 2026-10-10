import { Link } from 'react-router-dom';
import { Mascot } from '../shared/Mascot';
import { SiteIcon, type IconName } from '../shared/SiteIcon';
import { plans } from '../../data/hosting';
import { cppt } from '../../data/pentest';

const startingPrice = Math.min(...plans.map((p) => p.usd));

// The three things CyberHx offers, shown as one strip under the hero copy.
const offers: { icon: IconName; title: string; detail: string; to: string; external?: boolean }[] = [
  { icon: 'calendar-fire', title: 'Play our CTFs', detail: 'Open events for everyone', to: '/gallery' },
  { icon: 'ctf-green', title: 'Host your CTF', detail: `Plans from $${startingPrice}`, to: '/host-your-ctf#plans' },
  { icon: 'toolbox', title: 'Pentest Lab + CPPT', detail: `Certification for $${cppt.usd}`, to: cppt.href, external: true },
];

export const HeroSection = () => (
  <section className="relative overflow-hidden bg-ink pt-24 sm:pt-28">
    <div className="mx-auto grid max-w-7xl items-center gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-0 lg:px-8">
      {/* Copy */}
      <div className="relative z-10 order-2 lg:order-1">
        <h1 className="font-display text-[2.6rem] text-white sm:text-6xl lg:text-[4.4rem]">
          Hack our CTFs.
          <span className="mt-1 block text-glow">Host your own.</span>
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
          CyberHx runs capture-the-flag events for India's security crowd. We host complete CTFs for colleges and
          companies from ${startingPrice}, and train you on our Pentest Lab with the ${cppt.usd} CPPT certification.
        </p>

        <div className="mt-10 flex flex-col gap-5 sm:flex-row">
          <Link to="/host-your-ctf#plans" className="btn btn-red">
            See hosting prices
          </Link>
          <Link to="/gallery" className="btn btn-ghost">
            Play our CTFs
          </Link>
        </div>
      </div>

      {/* Mascot on a sticker disc */}
      <div className="relative order-1 mx-auto h-[22rem] w-full max-w-[26rem] sm:h-[28rem] sm:max-w-[32rem] lg:order-2 lg:h-[36rem] lg:max-w-none">
        <div className="absolute bottom-4 left-1/2 aspect-square w-[78%] -translate-x-1/2 rounded-full border-[3px] border-glow bg-panel shadow-[8px_8px_0_0_#0b3a4a]" />
        <div
          className="absolute bottom-[16%] left-1/2 aspect-square w-[58%] -translate-x-1/2 rounded-full border-2 border-dashed border-line"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <Mascot
            pose="flag"
            alt="CyberHx mascot holding a CTF flag"
            eager
            className="mascot-pop h-[21rem] w-auto sm:h-[27rem] lg:h-[34rem]"
          />
        </div>
        <SiteIcon
          name="trophy"
          size={72}
          alt=""
          className="float-y absolute left-[4%] top-[18%] hidden sm:block [--r:-10deg]"
        />
        <SiteIcon
          name="bug"
          size={56}
          alt=""
          className="float-y absolute bottom-[12%] right-[2%] [--r:12deg] [animation-delay:-2s]"
        />
        <SiteIcon
          name="shield"
          size={60}
          alt=""
          className="float-y absolute bottom-[30%] left-0 [--r:8deg] [animation-delay:-3.5s]"
        />
      </div>
    </div>

    {/* Offer strip */}
    <div className="mx-auto mt-14 max-w-7xl px-5 pb-16 sm:px-6 lg:mt-10 lg:px-8 lg:pb-24">
      <div className="sticker grid divide-y-2 divide-line overflow-hidden md:grid-cols-3 md:divide-x-2 md:divide-y-0">
        {offers.map((o) => {
          const inner = (
            <>
              <SiteIcon name={o.icon} size={64} alt="" />
              <span>
                <span className="font-display block text-xl text-white">{o.title}</span>
                <span className="mt-1 block text-muted">{o.detail}</span>
              </span>
            </>
          );
          const cls = 'flex items-center gap-4 p-5 transition-colors hover:bg-white/[0.04] sm:p-6';
          return o.external ? (
            <a key={o.title} href={o.to} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={o.title} to={o.to} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);
