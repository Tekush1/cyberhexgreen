import React, { useEffect, useRef, useState } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const LAST_UPDATED = '16 June 2026';
const EFFECTIVE_DATE = '16 June 2026';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of terms',
    content: `By accessing or using CyberHx ("Platform") — including cyberhx.com, ctf.cyberhx.com, and pentestlab.cyberhx.com — you agree to be bound by these Terms of Service ("Terms").

If you do not agree to these Terms, do not use the Platform. We may update these Terms at any time; continued use after changes constitutes acceptance.

CyberHx is operated by the CyberHx team, based in Bhopal, Madhya Pradesh, India.`,
  },
  {
    id: 'eligibility',
    title: '2. Eligibility',
    content: `You must be at least 13 years of age to use the Platform. If you are between 13 and 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.

By creating an account, you represent that all information you provide is accurate, complete, and current.`,
  },
  {
    id: 'accounts',
    title: '3. Accounts',
    content: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.

You must notify us immediately at support@cyberhx.com if you suspect unauthorised access to your account.

We reserve the right to suspend or terminate accounts that violate these Terms, engage in abusive behaviour, or are inactive for an extended period.

One person may not maintain more than one account for the purpose of gaining unfair advantage in competitions.`,
  },
  {
    id: 'ctf-rules',
    title: '4. CTF and competition rules',
    content: `CTF (Capture The Flag) competitions on the Platform are governed by the following rules, in addition to any event-specific rules posted at the time of the event:

Permitted conduct:
— Solving challenges using any legal means within the challenge environment
— Collaborating with your registered team members
— Using publicly available tools, scripts, and references

Prohibited conduct:
— Attacking the scoring infrastructure, other teams' systems, or any system outside the designated challenge environment
— Sharing flags, solutions, or write-ups during an active competition without organisers' permission
— Creating or using multiple accounts to gain competitive advantage
— Denial-of-service attacks against challenge servers or the Platform
— Any activity that disrupts other participants' ability to compete

Violations may result in disqualification, score nullification, and permanent account suspension. CyberHx's decision on competition matters is final.`,
  },
  {
    id: 'pentest-lab',
    title: '5. Pentest lab usage',
    content: `The Pentest Lab (pentestlab.cyberhx.com) provides intentionally vulnerable environments for educational purposes.

You may only perform penetration testing activities against systems within your assigned lab environment. Attempting to pivot, escape, or attack infrastructure outside your assigned scope is strictly prohibited.

Skills developed on the Platform must be used legally and ethically. CyberHx is not responsible for any misuse of skills or techniques learned on the Platform.

Lab environments are shared resources. Do not perform actions that degrade the experience for other users, such as consuming excessive compute resources or corrupting shared state.`,
  },
  {
    id: 'acceptable-use',
    title: '6. Acceptable use',
    content: `You agree not to use the Platform to:

— Engage in any illegal activity under applicable Indian law or the laws of your jurisdiction
— Distribute malware, ransomware, or any software designed to cause harm
— Harass, threaten, or abuse other users or Platform staff
— Post or transmit content that is defamatory, obscene, or violates third-party intellectual property rights
— Attempt to gain unauthorised access to any system, account, or data not explicitly within your authorised scope
— Use automated scraping, crawling, or data harvesting tools against the Platform without written permission
— Impersonate CyberHx staff or other users

We reserve the right to remove any content and suspend any account that violates these rules.`,
  },
  {
    id: 'intellectual-property',
    title: '7. Intellectual property',
    content: `CyberHx content — The Platform's design, branding, challenge content, blog posts authored by CyberHx, and software are owned by or licensed to CyberHx. You may not reproduce, distribute, or create derivative works without written permission.

Your content — By submitting content to the Platform (e.g. blog posts, CTF write-ups after event conclusion, forum posts), you grant CyberHx a non-exclusive, royalty-free licence to display and distribute that content on the Platform.

Open source — Portions of the Platform's code may be released under open-source licences. Where this applies, the applicable licence terms govern.`,
  },
  {
    id: 'disclaimers',
    title: '8. Disclaimers',
    content: `The Platform is provided "as is" and "as available" without warranties of any kind, express or implied.

CyberHx does not warrant that:
— The Platform will be available at all times or free of errors
— Challenge content is completely accurate or up to date
— Results of using the Platform will meet your expectations

Cybersecurity training involves learning about attack techniques. CyberHx provides this education for defensive and professional development purposes only. We are not liable for any misuse of information or techniques provided on the Platform.`,
  },
  {
    id: 'liability',
    title: '9. Limitation of liability',
    content: `To the maximum extent permitted by applicable law, CyberHx and its team members shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.

Our total liability to you for any claim arising from these Terms or your use of the Platform shall not exceed the amount you paid us in the 12 months preceding the claim. As the Platform is currently free to use, this limit is INR 0.

Some jurisdictions do not allow limitations on implied warranties or liability, so some of the above may not apply to you.`,
  },
  {
    id: 'termination',
    title: '10. Termination',
    content: `You may stop using the Platform at any time. You may request account deletion by contacting contact@cyberhx.com.

We may suspend or terminate your access at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.

Upon termination, your right to use the Platform ceases immediately. Provisions of these Terms that by their nature should survive termination will survive, including intellectual property, disclaimers, and limitation of liability.`,
  },
  {
    id: 'governing-law',
    title: '11. Governing law',
    content: `These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts in Bhopal, Madhya Pradesh, India.

If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.`,
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: `For questions about these Terms of Service, contact us at:

Email: contact@cyberhx.com
Legal matters: admin@cyberhx.com
Address: CyberHx, Bhopal, Madhya Pradesh, India

For security vulnerability reports, see our Responsible Disclosure policy at cyberhx.com/responsible-disclosure.`,
  },
];

const TermsOfServicePage = () => {
  const [activeId, setActiveId] = useState('acceptance');
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
            <FileText size={13} />
            Legal · Terms of Service
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
          >
            Terms of Service
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
              These Terms apply to cyberhx.com, ctf.cyberhx.com, and pentestlab.cyberhx.com.
              See also our{' '}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>{' '}
              and{' '}
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

export default TermsOfServicePage;
