import React from 'react';
import { motion } from 'framer-motion';
import { Handshake, FileSignature, MapPin, Building2, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Keep this in sync with src/pages/CollaborationsPage.tsx.
 * Add a new entry here every time a partnership / MOU is signed.
 */
const collaborations: {
  org: string;
  type: string;
  location: string;
  date: string;
  description: string;
  link?: string;
}[] = [
  {
    org: 'IIT Indore E-Cell',
    type: 'Outreach Partner',
    location: 'Indore, India',
    date: 'June 2026',
    description:
      'Officially partnered with the Entrepreneurship Cell of IIT Indore as an outreach partner, with an MOU signed between both organisations.',
    link: 'https://ecell.iiti.ac.in',
  },
];

export const CollaborationsSection = () => {
  return (
    <div className="bg-dark-300 py-20 border-t border-gray-900">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-4 py-1.5 rounded-full mb-5"
          >
            <Handshake size={13} />
            Collaborations
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold gradient-text mb-3"
          >
            Partners we work with
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-base max-w-xl mx-auto"
          >
            We're building cybersecurity outreach through partnerships with colleges and communities — and this list keeps growing.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collaborations.map((c, index) => (
            <motion.div
              key={c.org}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="bg-dark-100 border border-gray-800 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-primary" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20 flex-shrink-0">
                  <FileSignature size={11} />
                  MOU Signed
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{c.org}</h3>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                <span className="text-primary font-medium">{c.type}</span>
                <span className="flex items-center gap-1"><MapPin size={11} /> {c.location}</span>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-grow">{c.description}</p>

              {c.link && (
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1 mt-auto"
                >
                  Visit website <ArrowUpRight size={14} />
                </a>
              )}
            </motion.div>
          ))}

          {/* Teaser card inviting more partners — remove once you have 3+ real partners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: collaborations.length * 0.08 }}
            className="border border-dashed border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center"
          >
            <Handshake size={22} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm mb-1">More partnerships coming soon</p>
            <Link
              to="/collaborations"
              className="text-primary text-xs font-medium hover:underline inline-flex items-center gap-1 mt-2"
            >
              View all collaborations <ArrowUpRight size={12} />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};