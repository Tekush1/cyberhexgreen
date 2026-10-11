import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Mascot } from '../shared/Mascot';

export const CallToActionSection = () => (
  <section className="border-t border-white/[0.06] bg-ink py-20 sm:py-28">
    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-lime/30 bg-gradient-to-br from-[#0f1a12] via-[#0b1220] to-[#08101e] px-6 pt-10 sm:px-12 sm:pt-14 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-8 lg:px-16 lg:pt-16">
        {/* light behind the mascot */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 right-[-6rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(198,241,53,0.18),transparent)] lg:right-[4%]"
        />
        <div className="pb-10 sm:pb-14 lg:pb-16">
          <h2 className="font-display max-w-[16ch] text-4xl leading-[1.05] text-white sm:text-5xl">Your fest needs a CTF.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            The team behind Null Origin and ZeroDay Heist builds the challenges, hosts the board and hands you the winners list.
            Tell us your date and we'll take it from there.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link to="/host-your-ctf#packages" className="btn btn-lime group">
              Build my CTF <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Talk to us first
            </Link>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <Mascot pose="trophy" alt="CyberHx mascot lifting a trophy" className="-mb-2 w-56 sm:w-64 lg:w-80" />
        </div>
      </div>
    </div>
  </section>
);

export default CallToActionSection;
