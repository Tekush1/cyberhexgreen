import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Mascot } from '../shared/Mascot';

/* Home: the Global Campus Ambassador Program, in the style of its poster: an outlined word over a solid one,
   the mascot on a lime disc. One link, to /ambassadors. */

export const AmbassadorSection = () => (
  <section aria-labelledby="amb-h" className="border-t border-white/[0.06] bg-[#070b15]">
    <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_1fr] lg:px-8">
      <div className="min-w-0">
        <p className="text-[15px] text-white/55">Global Campus Ambassador Program · Applications open worldwide</p>
        <p aria-hidden="true" className="font-display mt-5 text-[4.5rem] leading-[0.86] sm:text-[6.5rem]">
          <span className="block text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.9)]">APPLY</span>
          <span className="block text-white">NOW.</span>
        </p>
        <h2 id="amb-h" className="font-display mt-7 max-w-xl text-2xl leading-tight sm:text-3xl">Lead cybersecurity on your campus.</h2>
        <p className="mt-4 max-w-xl text-lg leading-8 text-white/60">
          Students at any college, anywhere: build a crew, bring your campus to our CTFs, and unlock certification, lab access and introductions to hiring partners.
        </p>
        <Link to="/ambassadors" className="btn btn-lime mt-8">Apply now <ArrowRight size={17} /></Link>
      </div>
      <div className="relative mx-auto w-64 sm:w-80">
        <div aria-hidden="true" className="absolute left-1/2 top-[38%] h-[72%] w-[72%] -translate-x-1/2 rounded-full bg-lime shadow-[0_40px_120px_-30px_rgba(198,241,53,0.5)]" />
        <Mascot pose="jump" alt="" className="relative w-full" />
      </div>
    </div>
  </section>
);

export default AmbassadorSection;
