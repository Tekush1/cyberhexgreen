import { Link } from 'react-router-dom';
import { Mascot } from '../shared/Mascot';

export const CallToActionSection = () => (
  <section className="border-t-2 border-line bg-ink px-5 pb-24 pt-36 sm:px-6 sm:pt-44 lg:px-8">
    <div className="sticker sticker-lime relative mx-auto max-w-6xl overflow-visible px-6 py-12 sm:px-12 sm:py-16">
      <Mascot
        pose="trophy"
        alt="CyberHx mascot lifting a trophy"
        className="absolute -top-36 right-2 w-44 sm:-top-44 sm:right-8 sm:w-60 lg:-top-40 lg:right-12 lg:w-72"
      />
      <div className="max-w-2xl">
        <h2 className="font-display text-4xl text-white sm:text-6xl">Your fest needs a CTF.</h2>
        <p className="mt-5 text-lg leading-8 text-muted">
          The team behind Null Origin and ZeroDay Heist will build the challenges, host the board and hand you the
          winners list. Tell us your date and we'll take it from there.
        </p>
        <div className="mt-9 flex flex-col gap-4 sm:flex-row">
          <Link to="/host-your-ctf#get-started" className="btn btn-lime">
            Plan my CTF
          </Link>
          <Link to="/contact" className="btn btn-ghost">
            Talk to us first
          </Link>
        </div>
      </div>
    </div>
  </section>
);
