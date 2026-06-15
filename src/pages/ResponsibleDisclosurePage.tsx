import React, { useState } from 'react';
import { Shield, Mail, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, FileText, Eye, Lock, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const faqs = [
  {
    q: 'What vulnerabilities are in scope?',
    a: 'Web application vulnerabilities on cyberhx.com, ctf.cyberhx.com, and pentestlab.cyberhx.com — including XSS, CSRF, SQL injection, authentication bypasses, IDOR, RCE, and sensitive data exposure. Infrastructure-level issues (DNS misconfiguration, email security) are also in scope.',
  },
  {
    q: 'What is out of scope?',
    a: 'Denial-of-service attacks, social engineering, physical security attacks, vulnerabilities in third-party services we use (Supabase, Vercel, web3forms), brute-force attacks, and issues without a realistic security impact (e.g. missing HSTS on non-production subdomains).',
  },
  {
    q: 'Is there a bug bounty reward?',
    a: 'We are a community-run platform and do not currently offer monetary rewards. However, every valid report receives a public Hall of Fame acknowledgment, a CyberHx researcher certificate, and our genuine gratitude. We plan to introduce a formal bounty programme in the future.',
  },
  {
    q: 'How long until I get a response?',
    a: 'We acknowledge all reports within 72 hours. Triage and severity classification happen within 7 days. Critical and high-severity issues are prioritised for patching within 14 days. We commit to keeping you updated throughout the process.',
  },
  {
    q: 'Can I publicly disclose the vulnerability?',
    a: 'Please wait for our explicit written confirmation before any public disclosure. We follow a coordinated disclosure model — once the issue is patched and verified, we will coordinate with you on disclosure timing. We target a 90-day maximum before any researcher may disclose regardless of patch status.',
  },
  {
    q: 'Do you accept anonymous reports?',
    a: 'Yes. You may report without providing your identity. However, anonymous reporters cannot be listed in the Hall of Fame or receive a certificate. If you wish to remain anonymous but still receive acknowledgment, you may provide an alias.',
  },
];

const timeline = [
  { icon: <Mail size={18} />, label: 'Submit', desc: 'Send report to security@cyberhx.com', color: 'text-primary' },
  { icon: <Clock size={18} />, label: 'Acknowledge', desc: 'We reply within 72 hours', color: 'text-cyan-400' },
  { icon: <Eye size={18} />, label: 'Triage', desc: 'Severity assessed within 7 days', color: 'text-yellow-400' },
  { icon: <CheckCircle size={18} />, label: 'Patch', desc: 'Fix deployed, you are notified', color: 'text-primary' },
  { icon: <Award size={18} />, label: 'Credit', desc: 'Hall of Fame + certificate', color: 'text-cyan-400' },
];

const inScope = [
  'cyberhx.com — main website',
  'ctf.cyberhx.com — CTF platform',
  'pentestlab.cyberhx.com — Pentest lab',
  'Authentication & session management flaws',
  'Injection vulnerabilities (SQL, XSS, SSTI, etc.)',
  'Insecure direct object references (IDOR)',
  'Sensitive data exposure',
  'Security misconfigurations with real impact',
];

const outScope = [
  'Denial-of-service (DoS/DDoS) attacks',
  'Social engineering or phishing attempts',
  'Physical security attacks',
  'Third-party services (Vercel, Supabase)',
  'Brute-force without rate-limit bypass evidence',
  'Missing optional security headers with no exploit',
  'Self-XSS or issues requiring unlikely user action',
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-100 transition-colors"
        aria-expanded={open}
      >
        <span className="text-white font-medium text-sm pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="text-primary flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-gray-800 pt-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResponsibleDisclosurePage = () => {
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
            <Shield size={13} />
            Security Policy · RFC 9116 Compliant
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight"
          >
            Responsible{' '}
            <span className="gradient-text">Disclosure</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            CyberHx is built by the security community, for the security community. If you find a vulnerability in our platform, we want to hear from you — and we will treat your report with the seriousness it deserves.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href="mailto:security@cyberhx.com"
              className="inline-flex items-center justify-center gap-2 bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all text-sm"
            >
              <Mail size={16} />
              Report a Vulnerability
            </a>
            <Link
              to="/hall-of-fame"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 font-medium px-6 py-3 rounded-lg hover:border-primary/40 hover:text-white transition-all text-sm"
            >
              <Award size={16} />
              Hall of Fame
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-20">

        {/* Quick contact card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-100 border border-primary/20 rounded-2xl p-6 mb-16 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lock size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm mb-1">Encrypted reports welcome</p>
            <p className="text-gray-400 text-sm">
              Send your report to{' '}
              <a href="mailto:security@cyberhx.com" className="text-primary hover:underline underline-offset-2">
                security@cyberhx.com
              </a>
              . For sensitive findings, use our PGP key listed in{' '}
              <a
                href="/.well-known/security.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
              >
                security.txt <ExternalLink size={11} />
              </a>
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-medium">72h response</span>
          </div>
        </motion.div>

        {/* Disclosure Process Timeline */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-3">Disclosure process</h2>
          <p className="text-gray-500 text-sm mb-10">From your report to Hall of Fame acknowledgment — here is exactly what happens.</p>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 hidden sm:block" />
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
              {timeline.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center text-center relative"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-dark-100 border border-gray-800 flex items-center justify-center mb-3 ${step.color} relative z-10`}>
                    {step.icon}
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-dark-300 border border-gray-700 rounded-full text-xs text-gray-500 flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                  </div>
                  <p className="text-white text-sm font-semibold mb-1">{step.label}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Scope */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-3">Scope</h2>
          <p className="text-gray-500 text-sm mb-8">Only test against systems you have explicit permission to test. Our CTF challenges are always fair game.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-100 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <CheckCircle size={18} className="text-primary" />
                <h3 className="text-white font-semibold text-sm">In scope</h3>
              </div>
              <ul className="space-y-3">
                {inScope.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-dark-100 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <AlertTriangle size={18} className="text-accent-red" />
                <h3 className="text-white font-semibold text-sm">Out of scope</h3>
              </div>
              <ul className="space-y-3">
                {outScope.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-red mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Our commitments */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-3">Our commitments to you</h2>
          <p className="text-gray-500 text-sm mb-8">We treat every security researcher with respect. Here is what you can expect from us.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Safe harbour', desc: 'We will not pursue legal action against researchers who act in good faith and follow this policy.' },
              { title: 'Timely response', desc: 'Acknowledgment within 72 hours, triage within 7 days, patch notifications as soon as available.' },
              { title: 'Credit & recognition', desc: 'Every valid report earns a Hall of Fame listing and a CyberHx security researcher certificate.' },
              { title: 'Coordinated disclosure', desc: 'We follow a 90-day coordinated disclosure window. You may publish after the patch is live or 90 days, whichever comes first.' },
            ].map((item) => (
              <div key={item.title} className="bg-dark-100 border border-gray-800 rounded-xl p-5 hover:border-primary/20 transition-colors">
                <h4 className="text-white font-semibold text-sm mb-2">{item.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Report template */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-3">Report template</h2>
          <p className="text-gray-500 text-sm mb-6">Include as much detail as possible. A clear, reproducible report gets triaged and patched faster.</p>
          <div className="bg-dark-100 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText size={16} className="text-primary" />
              <span className="text-white text-sm font-semibold">Email template — security@cyberhx.com</span>
            </div>
            <pre className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
{`Subject: [Security Report] <Brief vulnerability title>

**Vulnerability type:** (e.g. XSS, SQL Injection, IDOR)
**Severity (your estimate):** Critical / High / Medium / Low
**Affected asset:** (URL or component)

**Description:**
A clear explanation of the vulnerability.

**Steps to reproduce:**
1. Go to ...
2. Do ...
3. Observe ...

**Impact:**
What can an attacker do with this vulnerability?

**Proof of Concept:**
(Screenshots, HTTP requests, or a minimal PoC — do NOT run
destructive tests or access other users' data)

**Suggested fix (optional):**
Any remediation ideas you have.

**Your name / alias (for Hall of Fame):**
**Contact (for follow-up):**`}
            </pre>
            <a
              href={`mailto:security@cyberhx.com?subject=[Security Report] &body=Vulnerability type:%0A%0ASeverity:%0A%0AAffected asset:%0A%0ADescription:%0A%0ASteps to reproduce:%0A1.%0A2.%0A3.%0A%0AImpact:%0A%0AProof of Concept:%0A%0AYour name / alias:`}
              className="mt-5 inline-flex items-center gap-2 bg-primary text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all text-sm"
            >
              <Mail size={15} />
              Open in email client
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-3">Frequently asked questions</h2>
          <p className="text-gray-500 text-sm mb-8">Everything researchers commonly ask about our disclosure process.</p>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} {...faq} />
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <div className="border border-gray-800 rounded-2xl p-8 text-center">
          <Shield size={32} className="text-primary mx-auto mb-4" />
          <h3 className="text-white text-xl font-bold mb-3">Found something?</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Do not hesitate to reach out. Good security research makes everyone safer — including us.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:security@cyberhx.com"
              className="inline-flex items-center justify-center gap-2 bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all text-sm"
            >
              <Mail size={15} />
              security@cyberhx.com
            </a>
            <a
              href="/.well-known/security.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 font-medium px-6 py-3 rounded-lg hover:border-primary/40 hover:text-white transition-all text-sm"
            >
              <ExternalLink size={15} />
              View security.txt
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResponsibleDisclosurePage;
