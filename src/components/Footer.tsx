import React from 'react';
import { Shield, Github, Linkedin, Twitter, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-200 border-t border-gray-900 mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2 group">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold">
                <span className="text-primary">Cyber</span>
                <span className="text-white">Hx</span>
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              Empowering India's next generation of cybersecurity professionals through hands-on labs and community.
            </p>
            <div className="flex space-x-4 pt-1">
              <a href="https://github.com/Tekush1" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/company/cyberhx" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://twitter.com/cyberhx" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Platforms</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="https://pentestlab.cyberhx.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  Pentest Lab
                </a>
              </li>
              <li>
                <a href="https://ctf.cyberhx.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  CTF Platform
                </a>
              </li>
              <li>
                <Link to="/blog" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  Blog & News
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:contact@cyberhx.com" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  contact@cyberhx.com
                </a>
              </li>
              <li>
                <a href="mailto:support@cyberhx.com" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  support@cyberhx.com
                </a>
              </li>
              <li>
                <a href="mailto:hr@cyberhx.com" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  hr@cyberhx.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                CyberHx, Bhopal, India
              </li>
            </ul>
          </div>

          {/* Leadership */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Leadership</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:ceo@cyberhx.com" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ceo@cyberhx.com
                </a>
              </li>
              <li>
                <a href="mailto:admin@cyberhx.com" className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  admin@cyberhx.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-900 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-600 gap-3">
          <p>&copy; {currentYear} CyberHx. All rights reserved.</p>
          <div className="flex space-x-5">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
