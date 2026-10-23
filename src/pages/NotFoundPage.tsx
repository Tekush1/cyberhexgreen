import { Link } from 'react-router-dom';
import { Mascot } from '../components/shared/Mascot';

const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-5 pb-24 pt-28 text-center">
    <Mascot pose="sad404" alt="Sad CyberHx mascot next to a 404 error" eager className="mascot-pop w-64 sm:w-80" />
    <h1 className="font-display mt-6 text-5xl text-white sm:text-7xl">This page doesn't exist.</h1>
    {/* Easter egg for CTF players: keep this line as it is */}
    <p className="mt-6 max-w-md font-mono text-white/45">1t!_c0ngr4t5 final part you are more than beginner</p>
    <div className="mt-10 flex flex-col gap-4 sm:flex-row">
      <Link to="/" className="btn btn-lime">Back to home</Link>
      <Link to="/events" className="btn btn-ghost">Browse events</Link>
    </div>
  </div>
);

export default NotFoundPage;
