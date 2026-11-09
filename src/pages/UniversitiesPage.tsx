import { useState, useRef, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { Mascot } from '../components/shared/Mascot';
import { TrustedBySection } from '../components/sections/TrustedBySection';
import { ReviewsSection } from '../components/sections/ReviewsSection';
import { isEmail, submitForm } from '../lib/forms';

/* /universities: CyberHx for Colleges & Universities, anywhere in the world.
   Sells a year-round program, not one event: campus CTFs, Lab + certification for a batch, a yearly partnership,
   a report for the department after every event, and the CyberHx Campus League.
   Requests go to Supabase form_submissions (form = 'university') -> Admin -> Inbox, plus an email to the team.
   Look: same ink + lime as /companies and /ambassadors; the sample department report is the one playful object. */

const WAYS: { title: string; line: string; points: string[]; to?: string; cta?: string }[] = [
  {
    title: 'Campus CTF',
    line: 'One event for your fest, club or semester. We build it, host it and run it on the day.',
    points: ['Ready-made packages or your own mix', 'Online, on campus, or both', 'Your name and logo on the platform'],
    to: '/host-your-ctf',
    cta: 'Build your CTF',
  },
  {
    title: 'Lab + certification',
    line: 'Hands-on practice for a whole batch, ending in a credential they can show employers.',
    points: ['Pentest Lab seats for every student', 'CAPT and CPPT at academic batch pricing', 'Progress you can track per student'],
    to: '/certifications',
    cta: 'See the certifications',
  },
  {
    title: 'Year-long partnership',
    line: 'A cybersecurity program that runs all year, with one person from CyberHx looking after your campus.',
    points: ['A CTF every semester', 'Workshops and talks from practitioners', 'Student ambassadors and Campus League entry'],
  },
];

const STUDENTS: { title: string; text: string }[] = [
  { title: 'Real practice, not slides', text: 'Live targets, real tools, and challenges built by people who break things for a living.' },
  { title: 'A global scoreboard', text: 'They compete with players from 90+ countries and see exactly where they stand.' },
  { title: 'Certificates anyone can check', text: 'Event certificates for every player, and CAPT or CPPT for those who go further.' },
  { title: 'A path to hiring partners', text: 'Top performers are the people we introduce to companies that hire through CyberHx.' },
];

const DEPARTMENT: { title: string; text: string }[] = [
  { title: 'A report after every event', text: 'Who registered, who played, scores, solves by topic and certificates issued, ready for your records and accreditation reviews.' },
  { title: 'Zero setup', text: 'No servers, no challenge writing, no all-night support shifts. We run the platform and the help desk.' },
  { title: 'Challenges that match your syllabus', text: 'Tell us what you teach this semester, from web security to forensics, and we build challenges around it.' },
  { title: 'Your brand, worldwide', text: 'Your university\'s name on an event that players across the world can join and remember.' },
];

const STEPS = [
  { n: '01', title: 'Call', text: 'A 20-minute call to understand your students, calendar and goals.' },
  { n: '02', title: 'Plan', text: 'We propose an event or a year plan with a clear price. You approve it.' },
  { n: '03', title: 'Run', text: 'We build, host and run everything, with support live during the event.' },
  { n: '04', title: 'Report', text: 'You get the department report, and your students\' points go to the Campus League.' },
];

const LEAGUE: { title: string; text: string }[] = [
  { title: 'Every CTF counts', text: 'Each time your students play a CyberHx CTF, their points add up for your university.' },
  { title: 'Fair for every size', text: 'Only your top 10 players count, so a small department can beat a giant campus.' },
  { title: 'One season a year', text: 'The table resets every January. Season 1 starts in 2027.' },
  { title: 'Champions are named', text: 'The top universities get the title, a trophy, and a feature in front of our whole community.' },
];

const FAQ = [
  { q: 'Do you give an invoice?', a: 'Yes. You pay online through Razorpay, and every payment comes with a Razorpay invoice that your accounts team can file.' },
  { q: 'Is there academic pricing?', a: 'Yes. Universities and colleges get an academic discount on every CTF package, batch pricing for the Pentest Lab and certifications, and a yearly price for partnerships. Tell us your student numbers and we send a clear quote.' },
  { q: 'Online or on campus?', a: 'Both. Most events run online so anyone can join; we can also run a room on your campus with the same platform, or both at once.' },
  { q: 'What is in the department report?', a: 'Registrations, attendance, scores and ranks, solves by topic, and the certificates issued, as a spreadsheet plus a one-page summary you can share with your leadership.' },
  { q: 'Can we open the event to other colleges?', a: 'Yes. Keep it private to your students, open it to other institutions, or make it a global event under your name.' },
  { q: 'How do we join the Campus League?', a: 'Any university whose students play CyberHx CTFs is in. Partner universities get their own campus page on the league table.' },
  { q: 'What about student data?', a: 'We only collect what an event needs, use it to run the event and the report, and never sell it. See our privacy policy for the details.' },
];

const ROLES = ['Faculty / Head of department', 'Dean / Director', 'Training & placement', 'Club or fest lead', 'Student ambassador', 'Other'];
const SIZES = ['Under 100 students', '100 to 500', '500 to 2,000', 'Over 2,000'];
const WHEN = ['This month', 'In the next 3 months', 'Next semester', 'Just exploring'];
const INTERESTS = ['Campus CTF', 'Lab + certification', 'Year-long partnership', 'Campus League'];

const field =
  'w-full rounded-xl border border-white/[0.1] bg-[#070b16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-glow focus:ring-4 focus:ring-glow/10 aria-[invalid=true]:border-red-400/70';
const labelCls = 'mb-2 block text-sm font-medium text-white/80';
const eyebrow = 'font-mono text-[12px] uppercase tracking-[0.2em] text-lime';

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label} {hint && <span className="font-normal text-white/35">{hint}</span>}</label>
      {children}
      {error && <p className="mt-1.5 text-sm text-red-300">{error}</p>}
    </div>
  );
}

/** A sample of the report a department gets after an event. Clearly marked as an example. */
function SampleReport() {
  const topics: [string, number][] = [['Web', 82], ['Forensics', 64], ['Crypto', 47], ['Reverse engineering', 31], ['OSINT', 72]];
  return (
    <div className="w-full max-w-md rotate-1 rounded-[22px] bg-gradient-to-br from-lime/60 via-glow/30 to-lime/10 p-[1.5px] shadow-[0_40px_80px_-30px_rgba(198,241,53,0.3)]">
      <div className="rounded-[21px] bg-[#0a1020] p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-xl text-white">Event report</p>
          <p className="font-mono text-[11px] text-white/40">Example data</p>
        </div>
        <p className="mt-1 text-[13px] text-white/45">Your University · Campus CTF · 24 hours</p>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          {[['412', 'registered'], ['356', 'played'], ['298', 'certificates']].map(([v, k]) => (
            <div key={k} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3">
              <dd className="font-display text-2xl tabular-nums text-white">{v}</dd>
              <dt className="mt-0.5 text-[12px] text-white/45">{k}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[12px] text-white/45">Students who solved at least one challenge, by topic</p>
        <ul className="mt-3 space-y-2.5">
          {topics.map(([t, pct]) => (
            <li key={t} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-[13px]">
              <span className="truncate text-white/75">{t}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-lime/80" style={{ width: `${pct}%` }} /></span>
              <span className="text-right tabular-nums text-white/55">{pct}%</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4 text-[12px] text-white/45">
          <span>Spreadsheet + one-page summary</span>
          <span className="text-lime">+ Campus League points</span>
        </div>
      </div>
    </div>
  );
}

const empty = { name: '', email: '', role: '', institution: '', country: '', city: '', size: '', when: '', phone: '', message: '' };

export default function UniversitiesPage() {
  const reduce = useReducedMotion();
  const [f, setF] = useState(empty);
  const [wants, setWants] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState<number | null>(0);
  const honeypot = useRef<HTMLInputElement>(null);

  const on = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(({ [e.target.name]: _gone, ...rest }) => rest);
  };
  const toggle = (x: string) => setWants((w) => (w.includes(x) ? w.filter((y) => y !== x) : [...w, x]));

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.name.trim().length < 2) err.name = 'Add your name.';
    if (!isEmail(f.email)) err.email = 'Add an email we can reply to.';
    if (f.institution.trim().length < 2) err.institution = 'Add your college or university.';
    if (f.country.trim().length < 2) err.country = 'Add your country.';
    if (!f.role) err.role = 'Pick your role.';
    setErrors(err);
    if (Object.keys(err).length) {
      document.getElementById(`uni-${Object.keys(err)[0]}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    setFailed('');
    const res = await submitForm({
      subject: `University: ${f.institution.trim()} (${f.country.trim()}) · ${f.role}`,
      table: 'form_submissions',
      replyTo: f.email,
      honeypot: honeypot.current?.value,
      row: {
        form: 'university',
        name: f.name,
        email: f.email,
        phone: f.phone.slice(0, 40),
        subject: `University · ${f.institution.trim()} · ${f.country.trim()}`.slice(0, 300),
        message: (f.message.trim() || '(no message)').slice(0, 5000),
        page: '/universities',
        data: { institution: f.institution.trim(), role: f.role, country: f.country.trim(), city: f.city.trim(), students: f.size, timeline: f.when, interested_in: wants },
      },
      email: {
        name: f.name, email: f.email, phone: f.phone, role: f.role, institution: f.institution, country: f.country, city: f.city,
        students: f.size, timeline: f.when, interested_in: wants.join(', '), message: f.message,
      },
    });
    setBusy(false);
    if (res.ok) { setDone(true); document.getElementById('plan')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
    else setFailed('We could not send that. Check your connection, or email contact@cyberhx.com.');
  };

  const fade = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };
  const rise = (i = 0) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay: i * 0.08 } });

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="CyberHx for Universities — Campus CTFs, Labs & the Campus League"
        description="A year-round cybersecurity program for colleges and universities worldwide: campus CTFs we build and run, Pentest Lab and CAPT/CPPT for a whole batch, a report for your department after every event, and the CyberHx Campus League."
        path="/universities"
        keywords="ctf for universities, college ctf, campus ctf, university cybersecurity program, cyber security competition for students, ctf hosting for colleges"
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-16 pt-28 sm:pb-24 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-lime/[0.07] blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div className="min-w-0">
            <h1 className="font-display max-w-3xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Turn your campus into a <span className="text-white/45">cybersecurity training ground.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
              CyberHx for Colleges &amp; Universities: CTFs we build and run for your students, hands-on labs and certification for a whole batch, and a report for your department after every event. Anywhere in the world.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#plan" className="btn btn-lime">Plan your campus program <ArrowRight size={17} /></a>
              <Link to="/events" className="btn btn-ghost">See past events</Link>
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-sm justify-center">
            <Mascot pose="thumbs" alt="The CyberHx mascot giving a thumbs up" eager className="w-56 sm:w-72" />
          </div>
        </div>
        <dl className="relative mx-auto mt-14 grid max-w-7xl grid-cols-3 gap-4 px-5 sm:px-6 lg:px-8">
          {[['7,400+', 'learners in our community'], ['90+', 'countries play our CTFs'], ['6,000+', 'hackers at a single CTF']].map(([v, k]) => (
            <div key={k} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-5 sm:px-6">
              <dt className="sr-only">{k}</dt>
              <dd className="font-display text-3xl text-white sm:text-4xl">{v}</dd>
              <dd className="mt-1 text-[13px] text-white/45">{k}</dd>
            </div>
          ))}
        </dl>
      </section>

      <TrustedBySection compact />

      {/* Three ways */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className={eyebrow}>Three ways to work with us</p>
          <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Start with one event. <span className="text-white/45">Grow into a program.</span></h2>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {WAYS.map((w, i) => (
            <motion.article key={w.title} {...rise(i)} className={`flex flex-col rounded-[28px] border p-7 sm:p-8 ${i === 2 ? 'border-lime/35 bg-lime/[0.04]' : 'border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a]'}`}>
              <h3 className="font-display text-3xl">{w.title}</h3>
              <p className="mt-3 leading-7 text-white/60">{w.line}</p>
              <ul className="mt-6 space-y-2.5">
                {w.points.map((p) => <li key={p} className="flex items-start gap-3 text-[15px] text-white/80"><Check size={16} className="mt-1 shrink-0 text-lime" />{p}</li>)}
              </ul>
              <div className="mt-auto pt-8">
                {w.to ? <Link to={w.to} className="btn btn-ghost">{w.cta} <ArrowRight size={16} /></Link> : <a href="#plan" className="btn btn-lime">Talk to us <ArrowRight size={16} /></a>}
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Students / Department */}
      <section className="border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:px-8">
          {([['For your students', 'What they walk away with', STUDENTS], ['For your department', 'What you get, without the work', DEPARTMENT]] as const).map(([k, h, list]) => (
            <div key={k}>
              <p className={eyebrow}>{k}</p>
              <h2 className="font-display mt-3 text-3xl sm:text-4xl">{h}</h2>
              <div className="mt-8 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {list.map((x) => (
                  <div key={x.title} className="py-5">
                    <h3 className="text-lg font-semibold">{x.title}</h3>
                    <p className="mt-1.5 leading-7 text-white/55">{x.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Report */}
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.1fr] lg:px-8">
        <div>
          <p className={eyebrow}>The department report</p>
          <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Proof of what your students did.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">
            After every event you get a spreadsheet and a one-page summary: registrations, attendance, scores, solves by topic and certificates issued. Share it with leadership, file it for accreditation, or use it to plan next semester.
          </p>
        </div>
        <div className="flex justify-center lg:justify-end"><SampleReport /></div>
      </section>

      {/* Campus League */}
      <section className="border-y border-white/[0.06] bg-gradient-to-b from-[#0a1120] to-[#070b15]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid items-end gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className={eyebrow}>The CyberHx Campus League</p>
              <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">One table. <span className="text-white/45">Universities from every country.</span></h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
                A global ranking of universities by how their students perform across CyberHx CTFs. It gives your campus a reason to show up every semester, and your best students a stage.
              </p>
            </div>
            <Mascot pose="trophy" alt="" className="hidden w-44 justify-self-end lg:block" />
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LEAGUE.map((l, i) => (
              <motion.div key={l.title} {...rise(i)} className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6">
                <h3 className="font-display text-2xl">{l.title}</h3>
                <p className="mt-3 leading-7 text-white/55">{l.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Universities we've run CTFs with */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl">Universities that ran their CTF on CyberHx</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[
            { to: '/events/pinaka-ctf', logo: '/events/nfsu-logo.webp', name: 'National Forensic Sciences University', event: 'Pinaka CTF', text: 'An open CTF hosted by NFSU\'s Chennai campus, built and run on the CyberHx platform.' },
            { to: '/events/cyberheist', logo: '/events/thapar-logo.webp', name: 'Thapar Institute of Engineering & Technology', event: 'CyberHeist', text: 'A private CTF for Thapar students, organised by the Backslash club and run on CyberHx.' },
          ].map((u) => (
            <Link key={u.to} to={u.to} className="group flex items-start gap-5 rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 transition hover:border-white/20">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white p-2"><img src={u.logo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" /></span>
              <span className="min-w-0">
                <span className="block text-[13px] text-white/45">{u.name}</span>
                <span className="font-display mt-1 block text-2xl">{u.event}</span>
                <span className="mt-2 block leading-7 text-white/60">{u.text}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-lime">See the event <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works + pricing */}
      <section className="border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <p className={eyebrow}>How it works</p>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl">From first call to final report</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...rise(i)} className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6">
                <p className="font-mono text-sm text-lime">{s.n}</p>
                <h3 className="font-display mt-4 text-2xl">{s.title}</h3>
                <p className="mt-3 leading-7 text-white/55">{s.text}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 grid gap-6 rounded-[24px] border border-lime/25 bg-lime/[0.04] p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h3 className="font-display text-2xl">Academic pricing</h3>
              <p className="mt-2 leading-7 text-white/70">An academic discount on every CTF package, batch pricing for the Pentest Lab and certifications, and one yearly price for partnerships. Pay online through Razorpay and get an invoice for every payment.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/host-your-ctf" className="btn btn-ghost">See CTF packages</Link>
              <a href="#plan" className="btn btn-lime">Get a quote</a>
            </div>
          </div>
        </div>
      </section>

      <ReviewsSection />

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-6 sm:py-24">
        <h2 className="font-display text-3xl sm:text-4xl">Questions universities ask</h2>
        <div className="mt-8 divide-y divide-white/[0.07] rounded-[24px] border border-white/[0.08] bg-white/[0.02]">
          {FAQ.map((x, i) => (
            <div key={x.q}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                <span className="text-[16px] font-semibold">{x.q}</span>
                <span className={`text-xl text-lime transition-transform ${open === i ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
              </button>
              {open === i && <p className="-mt-1 px-6 pb-5 leading-7 text-white/60">{x.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Plan form */}
      <section id="plan" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-28 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-4xl sm:text-5xl">Plan your campus program</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-white/55">Tell us about your institution. We reply by email within two working days with ideas and a quote.</p>
        </div>
        <div className="mt-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-8">
          <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <div aria-live="polite">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" {...fade} className="py-10 text-center">
                  <Mascot pose="cheer" alt="" still className="mx-auto w-40" />
                  <h3 className="font-display mt-6 text-3xl">Thanks, we'll be in touch.</h3>
                  <p className="mx-auto mt-3 max-w-md leading-7 text-white/55">Someone from CyberHx will email you within two working days to set up a short call.</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link to="/host-your-ctf" className="btn btn-lime">Explore CTF packages</Link>
                    <button type="button" onClick={() => { setDone(false); setF(empty); setWants([]); }} className="btn btn-ghost">Send another</button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" {...fade} onSubmit={send} noValidate className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="uni-name" label="Your name" error={errors.name}>
                      <input id="uni-name" name="name" value={f.name} onChange={on} autoComplete="name" maxLength={150} className={field} aria-invalid={!!errors.name} />
                    </Field>
                    <Field id="uni-email" label="Work email" error={errors.email}>
                      <input id="uni-email" name="email" type="email" value={f.email} onChange={on} autoComplete="email" maxLength={200} className={field} aria-invalid={!!errors.email} />
                    </Field>
                    <Field id="uni-role" label="Your role" error={errors.role}>
                      <select id="uni-role" name="role" value={f.role} onChange={on} className={field} aria-invalid={!!errors.role}>
                        <option value="">Select</option>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field id="uni-institution" label="College or university" error={errors.institution}>
                      <input id="uni-institution" name="institution" value={f.institution} onChange={on} autoComplete="organization" maxLength={200} className={field} aria-invalid={!!errors.institution} />
                    </Field>
                    <Field id="uni-country" label="Country" error={errors.country}>
                      <input id="uni-country" name="country" value={f.country} onChange={on} autoComplete="country-name" maxLength={80} className={field} aria-invalid={!!errors.country} />
                    </Field>
                    <Field id="uni-city" label="City" hint="(optional)">
                      <input id="uni-city" name="city" value={f.city} onChange={on} autoComplete="address-level2" maxLength={100} className={field} />
                    </Field>
                    <Field id="uni-size" label="Students who'd take part" hint="(optional)">
                      <select id="uni-size" name="size" value={f.size} onChange={on} className={field}>
                        <option value="">Select</option>
                        {SIZES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field id="uni-when" label="When" hint="(optional)">
                      <select id="uni-when" name="when" value={f.when} onChange={on} className={field}>
                        <option value="">Select</option>
                        {WHEN.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                  </div>
                  <fieldset>
                    <legend className={labelCls}>Interested in <span className="font-normal text-white/35">(pick any)</span></legend>
                    <div className="flex flex-wrap gap-2.5">
                      {INTERESTS.map((x) => {
                        const on2 = wants.includes(x);
                        return (
                          <button key={x} type="button" aria-pressed={on2} onClick={() => toggle(x)}
                            className={`rounded-xl border px-4 py-2.5 text-[14px] transition ${on2 ? 'border-lime bg-lime/10 text-white' : 'border-white/[0.1] bg-[#070b16] text-white/70 hover:border-white/25'}`}>
                            {x}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <Field id="uni-phone" label="Phone or WhatsApp" hint="(optional)">
                    <input id="uni-phone" name="phone" type="tel" value={f.phone} onChange={on} autoComplete="tel" maxLength={40} className={field} />
                  </Field>
                  <Field id="uni-message" label="Anything we should know?" hint="(optional)">
                    <textarea id="uni-message" name="message" rows={4} value={f.message} onChange={on} maxLength={5000} placeholder="Your fest dates, the topics you teach, what you tried before…" className={`${field} resize-y leading-7`} />
                  </Field>
                  {failed && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{failed}</p>}
                  <div className="flex flex-wrap items-center gap-4">
                    <button type="submit" disabled={busy} className="btn btn-lime w-full disabled:opacity-60 sm:w-auto">
                      {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : <>Send <ArrowRight size={17} /></>}
                    </button>
                    <p className="text-sm text-white/40">See our <Link to="/privacy" className="underline underline-offset-4 hover:text-white/70">privacy policy</Link>.</p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
