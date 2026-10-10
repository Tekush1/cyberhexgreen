import React from 'react';
import { Link } from 'react-router-dom';
import { SiteIcon } from '../components/shared/SiteIcon';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-4">
      <div className="flex justify-center mb-4"><SiteIcon name="ghost" size={120} alt="Ghost" /></div>
      <div className="font-mono">
        <p className="text-green-400 text-lg mb-2 opacity-70">ERROR 404</p>
        <h1 className="text-6xl font-bold text-green-400 mb-4" style={{ textShadow: '0 0 20px #00ff41' }}>
          PAGE NOT FOUND
        </h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          1t!_c0ngr4t5 final part you are more than beginner
          
        </p>
        <Link to="/" className="inline-block px-8 py-3 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-all duration-300 font-mono text-sm tracking-widest">
          ← RETURN HOME
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
