import React from 'react';
import { Shield, Github, Linkedin, Twitter, Mail, MapPin, Phone, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-200 border-t border-gray-800 mt-auto relative overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,_#00000000_1px),_linear-gradient(90deg,_transparent_1px,_#00000000_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,_#000_70%,transparent_100%)] opacity-20" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2 group">
              <Shield className="w-6 h-6 text-cyberblue group-hover:animate-pulse" />
              <span className="text-xl font-bold">
                <span className="text-cyberblue">Cyber</span>
                <span className="text-white">Hx</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm">
              Elite cybersecurity community empowering the next generation of security experts.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-primary transition-colors flex items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/prizes" className="text-gray-400 hover:text-primary transition-colors flex items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                  Prizes
                </Link>
              </li>
              <li>
                <Link to="/themes" className="text-gray-400 hover:text-primary transition-colors flex items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                  Themes
                </Link>
              </li>
              <li>
                <Link to="/timeline" className="text-gray-400 hover:text-primary transition-colors flex items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                  Timeline
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-gray-400">
                <Mail className="w-4 h-4 text-primary mr-2" />
                mackystech@gmail.com
              </li>
              <li className="flex items-center text-gray-400">
                <Phone className="w-4 h-4 text-primary mr-2" />
                +91 8235910315
              </li>
              <li className="flex items-center text-gray-400">
                <MapPin className="w-4 h-4 text-primary mr-2" />
                Macky's tech, Bhopal 
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <div className="flex space-x-4">
              <a 
                href="https://github.com/team-evil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/team-evil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com/teamevil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <a
              href="https://tranquil-truffle-15401f.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center text-primary hover:text-secondary transition-colors"
            >
              <span className="mr-2">Learning Platform</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-400">
          <p>&copy; {currentYear} CyberHx. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};