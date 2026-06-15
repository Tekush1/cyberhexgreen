import React, { useEffect, useRef, useState } from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const LAST_UPDATED = '16 June 2026';
const EFFECTIVE_DATE = '16 June 2026';

const sections = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `CyberHx ("we", "us", or "our") operates cyberhx.com, ctf.cyberhx.com, and pentestlab.cyberhx.com (collectively, the "Platform"). This Privacy Policy explains what personal data we collect, how we use it, and your rights regarding that data.

By using the Platform, you agree to the practices described in this policy. If you do not agree, please discontinue use of the Platform.`,
  },
  {
    id: 'data-collected',
    title: '2. Data we collect',
    content: `We collect only the data necessary to operate the Platform:

Account & registration data — When you register, we collect your name, email address, and a hashed password. For CTF event participation, we may also collect your college or institution name.

Usage data — We collect standard server logs including IP address, browser type, pages visited, and timestamps. This data is used for security monitoring and platform improvement.

Contact form submissions — When you use our contact or internship forms, we receive your name, email address, and message content. This data is transmitted through web3forms and is not stored on our own servers beyond email delivery.

Event participation data — CTF challenge submissions, scores, and solve timestamps are stored to maintain leaderboards and issue certificates.

Voluntarily provided data — Profile photos, GitHub/LinkedIn/social links, and bio information that you choose to provide publicly on your profile.`,
  },
  {
    id: 'data-use',
    title: '3. How we use your data',
    content: `We use collected data for the following purposes:

— To create and manage your account and authenticate your identity
— To operate CTF competitions, maintain scoreboards, and issue certificates
— To respond to contact form submissions and support requests
— To send transactional emails (e.g. registration confirmation, event updates)
— To detect and prevent abuse, fraud, and security threats
— To improve the Platform based on aggregate usage patterns
— To comply with legal obligations

We do not use your data for advertising, and we do not sell your data to any third party.`,
  },
  {
    id: 'data-sharing',
    title: '4. Data sharing',
    content: `We do not sell, rent, or trade your personal information. We may share data only in the following limited circumstances:

Service providers — We use Supabase (database hosting) and Vercel (platform hosting). These providers process data on our behalf under their own privacy policies and data processing agreements.

Public leaderboards — CTF scores, usernames, and team names are displayed publicly on competition leaderboards. If you participate, your username and score will be visible to other participants.

Hall of Fame — With your explicit consent, your name or alias may be listed on our Hall of Fame page if you are a top contributor or a credited security researcher.

Legal requirements — We may disclose data if required by applicable law, court order, or to protect the rights, property, or safety of CyberHx, our users, or the public.`,
  },
  {
    id: 'cookies',
    title: '5. Cookies and tracking',
    content: `The Platform uses minimal cookies:

Essential cookies — Session cookies required for authentication and platform functionality. These cannot be disabled without breaking core features.

Analytics — We do not currently use third-party analytics services that set tracking cookies. If we introduce analytics in the future, this policy will be updated with opt-out instructions.

We do not use advertising cookies, cross-site tracking pixels, or fingerprinting techniques.`,
  },
  {
    id: 'data-retention',
    title: '6. Data retention',
    content: `We retain your personal data for as long as your account is active or as needed to provide the Platform.

Account data is retained until you request deletion. CTF participation records (scores, solve times) may be retained indefinitely in anonymised or pseudonymous form for historical leaderboard accuracy.

Contact form submissions are retained in our email inbox for up to 12 months, then deleted.

Server logs are retained for up to 90 days for security purposes.`,
  },
  {
    id: 'security',
    title: '7. Security',
    content: `We implement industry-standard security measures to protect your data:

— HTTPS encryption for all data in transit
— Bcrypt password hashing (passwords are never stored in plain text)
— Row-level security on our Supabase database
— Security headers including HSTS, X-Frame-Options, and Content-Security-Policy
— Regular security reviews of our codebase

No system is completely secure. If you discover a security vulnerability, please report it to security@cyberhx.com following our Responsible Disclosure policy.`,
  },
  {
    id: 'your-rights',
    title: '8. Your rights',
    content: `You have the following rights regarding your personal data:

Access — You may request a copy of the personal data we hold about you.

Correction — You may request correction of inaccurate or incomplete data.

Deletion — You may request deletion of your account and associated personal data. Note that anonymised CTF competition records may be retained.

Portability — You may request your data in a machine-readable format.

Objection — You may object to processing of your data for purposes other than those strictly necessary for the Platform to function.

To exercise any of these rights, contact us at contact@cyberhx.com. We will respond within 30 days.`,
  },
  {
    id: 'children',
    title: '9. Children\'s privacy',
    content: `The Platform is intended for users aged 13 and above. We do not knowingly collect personal data from children under 13. If you believe we have inadvertently collected data from a child under 13, please contact us immediately at contact@cyberhx.com and we will delete that data promptly.

For users aged 13–18, we recommend parental awareness of Platform participation.`,
  },
  {
    id: 'changes',
    title: '10. Changes to this policy',
    content: `We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page and, for material changes, notify registered users by email.

Your continued use of the Platform after any changes constitutes acceptance of the updated policy.`,
  },
  {
    id: 'contact',
    title: '11. Contact',
    content: `For any questions, concerns, or rights requests regarding this Privacy Policy, contact us at:

Email: contact@cyberhx.com
Security issues: security@cyberhx.com
Address: CyberHx, Bhopal, Madhya Pradesh, India`,
  },
];

const PrivacyPolicyPage = () => {
  const [activeId, setActiveId] = useState('overview');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-dark-300">
      {/* Hero */}
      <section className="relative py-20 border-b border-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-4 py-1.5 rounded-full mb-6"
          >
            <Shield size={13} />
            Legal · Privacy Policy
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
          >
            Privacy Policy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-sm"
          >
            Last updated: <span className="text-gray-400">{LAST_UPDATED}</span>
            &nbsp;·&nbsp;
            Effective: <span className="text-gray-400">{EFFECTIVE_DATE}</span>
          </motion.p>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
        <div className="flex gap-16">

          {/* Sticky TOC — desktop */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition-all ${
                      activeId === s.id
                        ? 'text-primary bg-primary/10'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {activeId === s.id && <ChevronRight size={10} className="flex-shrink-0" />}
                    <span>{s.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="space-y-12">
              {sections.map((s, i) => (
                <motion.section
                  key={s.id}
                  id={s.id}
                  ref={(el) => { sectionRefs.current[s.id] = el; }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-lg font-semibold text-white mb-4 pb-3 border-b border-gray-900">
                    {s.title}
                  </h2>
                  <div className="space-y-3">
                    {s.content.split('\n\n').map((para, j) => (
                      <p key={j} className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>

            <div className="mt-16 pt-8 border-t border-gray-900 text-xs text-gray-600">
              This policy applies to cyberhx.com, ctf.cyberhx.com, and pentestlab.cyberhx.com.
              For security concerns, see our{' '}
              <a href="/responsible-disclosure" className="text-primary hover:underline">
                Responsible Disclosure policy
              </a>.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
