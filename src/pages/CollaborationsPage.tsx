import React from 'react';
import { motion } from 'framer-motion';
import { Handshake, FileSignature, MapPin, Mail, Building2, ArrowUpRight } from 'lucide-react';

/**
 * Add a new entry here every time a partnership / MOU is signed.
 * status: 'signed' | 'in-progress'
 * type: free text, e.g. 'Outreach Partner', 'Knowledge Partner', 'Community Partner'
 */
const collaborations: {
  org: string;
  type: string;
  location: string;
  status: 'signed' | 'in-progress';
  date: string; // e.g. 'June 2026'
  description: string;
  link?: string;
}[] = [
  {
    org: 'IIT Indore E-Cell',
    type: 'Outreach Partner',
    location: 'Indore, India',
    status: 'signed',
    date: 'June 2026',
    description:
      'CyberHx has partnered with the Entrepreneurship Cell of IIT Indore as an outreach partner, with an MOU formally signed between both organisations. Together we will co-host cybersecurity awareness drives, CTFs, and workshops for the IIT Indore community.',
    link: 'https://ecell.iiti.ac.in',
  },
  // ── Add the next partnership here ──
  // {
  //   org: 'Organisation Name',
  //   type: 'Knowledge Partner',
  //   location: 'City, Country',
  //   status: 'signed',
  //   date: 'Month Year',
  //   description: 'Short description of the collaboration.',
  //   link: 'https://example.com',
  // },
];

const statusBadge = {
  signed: 'bg-primary/10 text-primary border-primary/20',
  'in-progress': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const statusLabel = {
  signed: 'MOU Signed',
  'in-progress': 'In Progress',
};

const CollaborationsPage = () => {
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
            <Handshake size={13} />
            Collaborations · CyberHx
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight"
          >
            Partners &{' '}
            <span className="gradient-text">collaborations</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            We're building cybersecurity outreach through partnerships with colleges, communities, and organisations across India — and this list keeps growing.
          </motion.p>
        </div>
      </section>

      {/* Collaborations list */}
      <section className="py-20 border-b border-gray-900">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">Our partners</h2>
            <p className="text-gray-500 text-sm">
              Organisations we've officially partnered with, including signed MOUs.
            </p>
          </div>

          {collaborations.length === 0 ? (
            <div className="bg-dark-100 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
              <Building2 size={32} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-medium mb-1">No partnerships yet</p>
              <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
                We're actively looking to collaborate. Reach out if you'd like to partner with us.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {collaborations.map((c, i) => (
                <motion.div
                  key={c.org}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-dark-100 border border-gray-900 rounded-2xl p-6 hover:border-primary/30 transition-colors flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-primary" />
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${statusBadge[c.status]}`}>
                      <FileSignature size={11} />
                      {statusLabel[c.status]}
                    </span>
                  </div>

                  <h3 className="text-white text-lg font-bold mb-1">{c.org}</h3>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-4">
                    <span className="text-primary font-medium">{c.type}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} /> {c.location}</span>
                    <span>{c.date}</span>
                  </div>

                  <p className="text-gray-400 text-sm leading-relaxed mb-5 flex-grow">
                    {c.description}
                  </p>

                  {c.link && (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors mt-auto"
                    >
                      Visit website
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA: Become a partner */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center">
          <Handshake size={28} className="text-primary mx-auto mb-4" />
          <h3 className="text-white text-xl font-bold mb-3">Want to collaborate with CyberHx?</h3>
          <p className="text-gray-500 text-sm mb-6">
            We partner with colleges, E-Cells, communities, and organisations for outreach, events, and cybersecurity awareness. Let's talk.
          </p>
          <a
            href="mailto:hello@cyberhx.com?subject=Partnership%20Inquiry"
            className="inline-flex items-center gap-2 bg-primary text-dark-300 font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all text-sm"
          >
            <Mail size={15} />
            Propose a collaboration
          </a>
        </div>
      </section>

    </div>
  );
};

export default CollaborationsPage;