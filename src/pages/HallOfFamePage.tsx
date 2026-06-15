import React from 'react';
import { Shield, Award, Star, ExternalLink, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HallOfFame } from '../components/HallOfFame';

/**
 * Security researcher acknowledgments.
 * Add entries here when a researcher reports a valid vulnerability.
 *
 * severity: 'critical' | 'high' | 'medium' | 'low'
 * reported: ISO date string
 * cve: optional CVE ID if assigned
 */
const securityResearchers: {
  name: string;
  alias?: string;
  profile?: string;
  finding: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reported: string;
  cve?: string;
}[] = [
  // ── Add entries as reports come in ──
  // {
  //   name: 'Jane Doe',
  //   alias: '0xjane',
  //   profile: 'https://github.com/janedoe',
  //   finding: 'Reflected XSS on /contact via subject parameter',
  //   severity: 'high',
  //   reported: '2026-06-01',
  // },
];

const severityBadge = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const HallOfFamePage = () => {
  return (
    <div className="min-h-screen bg-dark-300">

      {/* Hero */}
      <section className="relative py-24 border-b border-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-4 py-1.5 rounded-full mb-8"
          >
            <Award size={13} />
            Hall of Fame · CyberHx
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight"
          >
            Hall of{' '}
            <span className="gradient-text">Fame</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Recognising the researchers, contributors, and community members who make CyberHx safer and stronger.
          </motion.p>
        </div>
      </section>

      {/* Security Researcher Acknowledgments */}
      <section className="py-20 border-b border-gray-900">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Security researchers</h2>
              <p className="text-gray-500 text-sm">
                Individuals who responsibly disclosed vulnerabilities in our platform.
              </p>
            </div>
            <Link
              to="/responsible-disclosure"
              className="inline-flex items-center gap-2 border border-gray-700 text-gray-400 hover:text-primary hover:border-primary/40 transition-all px-4 py-2 rounded-lg text-sm flex-shrink-0"
            >
              <Shield size={14} />
              Disclosure policy
            </Link>
          </div>

          {securityResearchers.length === 0 ? (
            <div className="bg-dark-100 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
              <Star size={32} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-medium mb-1">No entries yet</p>
              <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
                Be the first to responsibly disclose a vulnerability and earn your place here.
              </p>
              <a
                href="mailto:security@cyberhx.com"
                className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/20 transition-all"
              >
                <Mail size={14} />
                Report a vulnerability
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 font-medium py-3 pr-6">Researcher</th>
                    <th className="text-left text-gray-500 font-medium py-3 pr-6">Finding</th>
                    <th className="text-left text-gray-500 font-medium py-3 pr-6">Severity</th>
                    <th className="text-left text-gray-500 font-medium py-3 pr-6">Reported</th>
                    <th className="text-left text-gray-500 font-medium py-3">CVE</th>
                  </tr>
                </thead>
                <tbody>
                  {securityResearchers.map((r, i) => (
                    <tr key={i} className="border-b border-gray-900 hover:bg-dark-100 transition-colors">
                      <td className="py-4 pr-6">
                        {r.profile ? (
                          <a
                            href={r.profile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-primary transition-colors inline-flex items-center gap-1.5"
                          >
                            {r.alias ? `${r.name} (${r.alias})` : r.name}
                            <ExternalLink size={11} className="text-gray-600" />
                          </a>
                        ) : (
                          <span className="text-white">{r.alias ? `${r.name} (${r.alias})` : r.name}</span>
                        )}
                      </td>
                      <td className="py-4 pr-6 text-gray-400">{r.finding}</td>
                      <td className="py-4 pr-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${severityBadge[r.severity]}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-gray-500 font-mono text-xs">{r.reported}</td>
                      <td className="py-4 text-gray-500 font-mono text-xs">{r.cve ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Existing HallOfFame team component */}
      <HallOfFame />

      {/* CTA */}
      <section className="py-16 border-t border-gray-900">
        <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center">
          <Shield size={28} className="text-primary mx-auto mb-4" />
          <h3 className="text-white text-xl font-bold mb-3">Want to be on this page?</h3>
          <p className="text-gray-500 text-sm mb-6">
            Find and responsibly disclose a security vulnerability in our platform and earn your place in the Hall of Fame.
          </p>
          <Link
            to="/responsible-disclosure"
            className="inline-flex items-center gap-2 bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all text-sm"
          >
            <Shield size={15} />
            Read disclosure policy
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HallOfFamePage;
