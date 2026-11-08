import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { Mascot } from '../components/shared/Mascot';
import { isEmail, submitForm } from '../lib/forms';

/* /ambassadors: the CyberHx Global Student Ambassador Program. Open to students at any college or university, anywhere.
   Applications go to Supabase form_submissions (form = 'ambassador') -> Admin -> Inbox, plus an email to the team.
   Look: same ink + lime as /companies; the mascot plants the flag in the hero; a sample ambassador ID card is the
   one playful object on the page. */

const DOES: { title: string; text: string }[] = [
  { title: 'Build a campus crew', text: 'Gather students who want to learn security. Start a CyberHx circle, or bring your existing tech or security club along.' },
  { title: 'Bring teams to our CTFs', text: 'Get your campus onto the scoreboard at Null Origin, Pinaka and every CyberHx event, with your own referral link.' },
  { title: 'Run one event a term', text: 'A workshop, a talk or a mini CTF on the CyberHx platform. We give you the challenges, the slides and the support.' },
  { title: 'Be our voice on campus', text: 'Share events, write up what you solved, and tell us what students around you actually want to learn.' },
];

const GETS: { title: string; text: string }[] = [
  { title: 'Certificate and LinkedIn badge', text: 'An official CyberHx ambassador certificate, and a recommendation from the team when you finish a term with impact.' },
  { title: 'Pentest Lab access', text: 'Hands-on labs to sharpen your own skills while you lead others.' },
  { title: 'CAPT certification discount', text: 'A discounted CAPT voucher, and a free one for top ambassadors.' },
  { title: 'Early access to challenges', text: 'Play-test new CTF challenges before anyone else and meet the people who build them.' },
  { title: 'Mentorship from practitioners', text: 'Monthly calls with the CyberHx team on careers, CTFs and running a community.' },
  { title: 'A door to hiring partners', text: 'Top ambassadors are introduced first when companies come to CyberHx looking for talent.' },
];

const LEVELS: { name: string; when: string; unlocks: string[] }[] = [
  { name: 'Explorer', when: 'When you join', unlocks: ['Ambassador certificate', 'Onboarding kit and referral link', 'Ambassadors-only Discord'] },
  { name: 'Pathfinder', when: 'After your first campus event', unlocks: ['Pentest Lab access', 'CAPT discount voucher', 'Feature on CyberHx socials'] },
  { name: 'Commander', when: 'Top ambassadors each term', unlocks: ['Free CAPT voucher', 'CyberHx merch', 'Intro to hiring partners'] },
];

const STEPS = [
  { n: '01', title: 'Apply', text: 'Five minutes. Tell us about you, your campus and why you want to lead.' },
  { n: '02', title: 'Short call', text: 'A 15-minute video call with the CyberHx team, in your time zone.' },
  { n: '03', title: 'Onboard', text: 'Your kit: logo pack, a talk deck, a referral link and a mini CTF you can run.' },
  { n: '04', title: 'Lead', text: 'Run your first event, bring teams to our CTFs, and level up each term.' },
];

const FAQ = [
  { q: 'Who can apply?', a: 'Any student enrolled at a college or university, in any country, in any year and any branch. You don\'t need to be a CTF expert. You need to care about security and enjoy bringing people together.' },
  { q: 'How much time does it take?', a: 'About 2 to 4 hours a week, more in the weeks you run an event. It fits around classes and exams; tell us when you are busy and we plan around it.' },
  { q: 'Is it paid?', a: 'It is a volunteer role with real rewards: certification, lab access, mentorship, merch and introductions to hiring partners. The more your campus does, the more you unlock.' },
  { q: 'Can there be more than one ambassador at my college?', a: 'Yes. Large campuses can have a small team of ambassadors. If someone from your college is already in, you join them and run events together.' },
  { q: 'My college has no security club. Can I still apply?', a: 'Yes, and those campuses need it most. We help you start a CyberHx circle from zero, with a first event that is easy to run.' },
  { q: 'Is this only for students in India?', a: 'No. The program is global. We welcome ambassadors from every country; everything runs online, and our CTFs already draw players from 90+ countries.' },
];

const YEARS = ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Master\'s', 'PhD', 'Diploma'];
const LEVEL_OPTS = ['New to security', 'Played a few CTFs', 'Play CTFs regularly', 'I already run a club or community'];
const REACH = ['Under 50 students', '50 to 200', '200 to 1,000', 'Over 1,000'];

const field =
  'w-full rounded-xl border border-white/[0.1] bg-[#070b16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-glow focus:ring-4 focus:ring-glow/10 aria-[invalid=true]:border-red-400/70';
const labelCls = 'mb-2 block text-sm font-medium text-white/80';
const eyebrow = 'font-mono text-[12px] uppercase tracking-[0.2em] text-lime';

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {hint && <span className="font-normal text-white/35">{hint}</span>}
      </label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1.5 text-sm text-red-300">{error}</p>}
    </div>
  );
}

/** The sample ambassador ID: the one playful object on the page. Shows the applicant's own name and college as they type. */
function IdCard({ name, college, country }: { name: string; college: string; country: string }) {
  return (
    <div className="relative w-full max-w-[22rem] -rotate-2 rounded-[22px] bg-gradient-to-br from-lime/70 via-glow/40 to-lime/20 p-[1.5px] shadow-[0_40px_80px_-30px_rgba(198,241,53,0.35)]">
      <div className="relative overflow-hidden rounded-[21px] bg-[#0a1020] px-6 pb-6 pt-5">
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/[0.06]" />
        <div aria-hidden="true" className="absolute -right-4 -top-4 h-20 w-20 rounded-full border border-white/[0.06]" />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-lime">CyberHx · Global</span>
          <span className="rounded-full border border-lime/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-lime">Explorer</span>
        </div>
        <p className="font-display mt-5 text-[26px] leading-none text-white">Student<br />Ambassador</p>
        <dl className="mt-6 space-y-3 text-[13px]">
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Name</dt><dd className="mt-0.5 truncate text-white">{name.trim() || 'Your name'}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Campus</dt><dd className="mt-0.5 truncate text-white">{college.trim() || 'Your college or university'}</dd></div>
          <div className="flex gap-8">
            <div><dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Country</dt><dd className="mt-0.5 text-white">{country.trim() || 'Anywhere'}</dd></div>
            <div><dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Cohort</dt><dd className="mt-0.5 text-white">2027</dd></div>
          </div>
        </dl>
        <div aria-hidden="true" className="mt-6 flex items-end justify-between">
          <div className="flex h-7 items-end gap-[3px]">
            {[3, 7, 4, 7, 2, 6, 7, 3, 5, 7, 2, 4, 7, 6, 3, 7, 4, 2, 7, 5].map((h, i) => <span key={i} className="w-[2px] bg-white/40" style={{ height: `${h * 4}px` }} />)}
          </div>
          <span className="font-mono text-[10px] text-white/30">cyberhx.com/ambassadors</span>
        </div>
      </div>
    </div>
  );
}

const empty = { name: '', email: '', phone: '', country: '', college: '', city: '', year: '', level: '', reach: '', links: '', why: '', ideas: '', heard: '' };

export default function AmbassadorsPage() {
  const reduce = useReducedMotion();
  const [f, setF] = useState(empty);
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

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.name.trim().length < 2) err.name = 'Add your name.';
    if (!isEmail(f.email)) err.email = 'Add an email we can reply to.';
    if (f.college.trim().length < 2) err.college = 'Add your college or university.';
    if (f.country.trim().length < 2) err.country = 'Add the country you study in.';
    if (!f.year) err.year = 'Pick your year.';
    if (f.why.trim().length < 40) err.why = 'Tell us a little more: at least a couple of sentences.';
    setErrors(err);
    if (Object.keys(err).length) {
      document.getElementById(`amb-${Object.keys(err)[0]}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    setFailed('');
    const res = await submitForm({
      subject: `Ambassador: ${f.name.trim()} · ${f.college.trim()} (${f.country.trim()})`,
      table: 'form_submissions',
      replyTo: f.email,
      honeypot: honeypot.current?.value,
      row: {
        form: 'ambassador',
        name: f.name,
        email: f.email,
        phone: f.phone.slice(0, 40),
        subject: `Ambassador · ${f.college.trim()} · ${f.country.trim()}`.slice(0, 300),
        message: f.why.slice(0, 5000),
        page: '/ambassadors',
        data: {
          college: f.college.trim(), city: f.city.trim(), country: f.country.trim(), year: f.year, experience: f.level,
          can_reach: f.reach, links: f.links.trim().slice(0, 500), ideas: f.ideas.trim().slice(0, 3000), heard_from: f.heard.trim().slice(0, 200),
        },
      },
      email: {
        name: f.name, email: f.email, phone: f.phone, college: f.college, city: f.city, country: f.country, year: f.year,
        experience: f.level, can_reach: f.reach, links: f.links, why: f.why, ideas: f.ideas, heard_from: f.heard,
      },
    });
    setBusy(false);
    if (res.ok) { setDone(true); document.getElementById('apply')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
    else setFailed('We could not send that. Check your connection, or email contact@cyberhx.com.');
  };

  const fade = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };
  const rise = (i = 0) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay: i * 0.08 } });

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="CyberHx Global Student Ambassador Program"
        description="Lead cybersecurity on your campus. CyberHx student ambassadors build campus crews, bring teams to our CTFs and run events, and get certification, Pentest Lab access, mentorship and introductions to hiring partners. Open to students worldwide."
        path="/ambassadors"
        keywords="campus ambassador, student ambassador program, cybersecurity ambassador, ctf club, cyberhx ambassador"
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-16 pt-28 sm:pb-24 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-lime/[0.07] blur-[130px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-24 hidden h-[34rem] w-[34rem] rounded-full border border-white/[0.04] lg:block" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-44 hidden h-[24rem] w-[24rem] rounded-full border border-white/[0.05] lg:block" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0b1020] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> Global Student Ambassador Program · Applications open
            </span>
            <h1 className="font-display mt-6 max-w-3xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Plant the flag <span className="text-white/45">on your campus.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
              Become a CyberHx Student Ambassador. Build a security crew at your college, bring your campus onto the scoreboard of our global CTFs, and grow into a leader the industry notices, wherever in the world you study.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#apply" className="btn btn-lime">Apply to be an ambassador <ArrowRight size={17} /></a>
              <a href="#perks" className="btn btn-ghost">What you get</a>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-md items-end justify-center">
            <Mascot pose="flag" alt="The CyberHx mascot holding a flag" eager className="relative z-10 w-56 sm:w-72 lg:w-80" />
          </div>
        </div>
        <dl className="relative mx-auto mt-14 grid max-w-7xl grid-cols-3 gap-4 px-5 sm:px-6 lg:px-8">
          {[
            ['7,400+', 'learners in the community'],
            ['90+', 'countries play our CTFs'],
            ['Any', 'college, any year, any branch'],
          ].map(([v, k]) => (
            <div key={k} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-5 sm:px-6">
              <dt className="sr-only">{k}</dt>
              <dd className="font-display text-3xl text-white sm:text-4xl">{v}</dd>
              <dd className="mt-1 text-[13px] text-white/45">{k}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* What ambassadors do */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className={eyebrow}>The role</p>
          <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">You lead. <span className="text-white/45">We back you up.</span></h2>
          <p className="mt-4 text-lg leading-8 text-white/55">Four things every CyberHx ambassador does, at their own pace, with the team behind them.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DOES.map((d, i) => (
            <motion.article key={d.title} {...rise(i)} className="flex flex-col rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-7">
              <span className="block h-px w-10 bg-lime" />
              <h3 className="font-display mt-6 text-2xl leading-tight">{d.title}</h3>
              <p className="mt-3 leading-7 text-white/55">{d.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section id="perks" className="scroll-mt-24 border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.6fr] lg:px-8">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className={eyebrow}>What you get</p>
            <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Lead others. <span className="text-white/45">Level yourself up.</span></h2>
            <p className="mt-5 text-lg leading-8 text-white/60">Everything here is built from what CyberHx already runs: the CTFs, the Pentest Lab, CAPT certification and our hiring partners.</p>
            <Mascot pose="trophy" alt="" className="mt-10 hidden w-44 lg:block" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {GETS.map((g, i) => (
              <motion.div key={g.title} {...rise(i)} className="rounded-[24px] border border-white/[0.08] bg-[#0b1020]/70 p-6">
                <p className="font-mono text-sm text-lime">0{i + 1}</p>
                <h3 className="mt-4 text-lg font-semibold">{g.title}</h3>
                <p className="mt-2 leading-7 text-white/55">{g.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className={eyebrow}>Three levels</p>
          <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">The more your campus does, the more you unlock.</h2>
        </div>
        <ol className="relative mt-12 grid gap-5 lg:grid-cols-3">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[2.15rem] hidden h-px bg-gradient-to-r from-lime/10 via-lime/60 to-lime/10 lg:block" />
          {LEVELS.map((l, i) => (
            <motion.li key={l.name} {...rise(i)} className={`relative rounded-[28px] border p-7 ${i === 2 ? 'border-lime/40 bg-lime/[0.05]' : 'border-white/[0.08] bg-white/[0.02]'}`}>
              <span className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm ${i === 2 ? 'border-lime bg-lime text-ink' : 'border-lime/50 bg-ink text-lime'}`}>{i + 1}</span>
              <h3 className="font-display mt-5 text-3xl">{l.name}</h3>
              <p className="mt-1 text-[15px] text-white/50">{l.when}</p>
              <ul className="mt-6 space-y-2.5">
                {l.unlocks.map((u) => (
                  <li key={u} className="flex items-start gap-3 text-[15px] text-white/80"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{u}</li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* How it works */}
      <section className="border-y border-white/[0.06] bg-gradient-to-b from-[#0a1120] to-[#070b15]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <p className={eyebrow}>How it works</p>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl">From application to your first event</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...rise(i)} className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6">
                <p className="font-mono text-sm text-lime">{s.n}</p>
                <h3 className="font-display mt-4 text-2xl">{s.title}</h3>
                <p className="mt-3 leading-7 text-white/55">{s.text}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start gap-4 rounded-[24px] border border-lime/25 bg-lime/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl leading-7 text-white/75">
              <span className="font-semibold text-white">First mission:</span> ambassadors bring their campus teams to our next big event, a 24-hour space security CTF planned for February 2027.
            </p>
            <Link to="/events" className="btn btn-ghost shrink-0">See our events</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-6 sm:py-24">
        <h2 className="font-display text-3xl sm:text-4xl">Questions students ask</h2>
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

      {/* Apply */}
      <section id="apply" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-28 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-4xl sm:text-5xl">Apply to be an ambassador</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-white/55">Applications are reviewed on a rolling basis. A real person from CyberHx replies by email.</p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div className="flex flex-col items-center gap-6 lg:sticky lg:top-28">
            <IdCard name={f.name} college={f.college} country={f.country} />
            <p className="max-w-xs text-center text-sm text-white/40">Your card fills in as you type. Ambassadors get the real one.</p>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0c1324] to-[#080d1a] p-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] sm:p-8">
            <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <div aria-live="polite">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div key="done" {...fade} className="py-10 text-center">
                    <Mascot pose="cheer" alt="" still className="mx-auto w-40" />
                    <h3 className="font-display mt-6 text-3xl">Application received.</h3>
                    <p className="mx-auto mt-3 max-w-md leading-7 text-white/55">Thank you, {f.name.trim().split(/\s+/)[0] || 'explorer'}. We'll email you to set up a short call. Meanwhile, follow us on Instagram for the next CTF.</p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <a href="https://instagram.com/cyberhx__" target="_blank" rel="noopener noreferrer" className="btn btn-lime">Follow @cyberhx__</a>
                      <button type="button" onClick={() => { setDone(false); setF(empty); }} className="btn btn-ghost">Apply for someone else</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form key="form" {...fade} onSubmit={send} noValidate className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="amb-name" label="Full name" error={errors.name}>
                        <input id="amb-name" name="name" value={f.name} onChange={on} autoComplete="name" maxLength={150} className={field} aria-invalid={!!errors.name} />
                      </Field>
                      <Field id="amb-email" label="Email" error={errors.email}>
                        <input id="amb-email" name="email" type="email" value={f.email} onChange={on} autoComplete="email" maxLength={200} className={field} aria-invalid={!!errors.email} />
                      </Field>
                      <Field id="amb-college" label="College or university" error={errors.college}>
                        <input id="amb-college" name="college" value={f.college} onChange={on} autoComplete="organization" maxLength={200} className={field} aria-invalid={!!errors.college} />
                      </Field>
                      <Field id="amb-year" label="Year of study" error={errors.year}>
                        <select id="amb-year" name="year" value={f.year} onChange={on} className={field} aria-invalid={!!errors.year}>
                          <option value="">Select</option>
                          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </Field>
                      <Field id="amb-city" label="City" hint="(optional)">
                        <input id="amb-city" name="city" value={f.city} onChange={on} autoComplete="address-level2" maxLength={100} className={field} />
                      </Field>
                      <Field id="amb-country" label="Country" error={errors.country}>
                        <input id="amb-country" name="country" value={f.country} onChange={on} autoComplete="country-name" maxLength={80} className={field} aria-invalid={!!errors.country} />
                      </Field>
                      <Field id="amb-phone" label="WhatsApp or phone" hint="(optional)">
                        <input id="amb-phone" name="phone" type="tel" value={f.phone} onChange={on} autoComplete="tel" maxLength={40} placeholder="+91 …" className={field} />
                      </Field>
                      <Field id="amb-links" label="LinkedIn, GitHub or CTFtime" hint="(optional)">
                        <input id="amb-links" name="links" value={f.links} onChange={on} maxLength={500} placeholder="linkedin.com/in/…" className={field} />
                      </Field>
                      <Field id="amb-level" label="Your security experience" hint="(optional)">
                        <select id="amb-level" name="level" value={f.level} onChange={on} className={field}>
                          <option value="">Select</option>
                          {LEVEL_OPTS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </Field>
                      <Field id="amb-reach" label="Students you can reach" hint="(optional)">
                        <select id="amb-reach" name="reach" value={f.reach} onChange={on} className={field}>
                          <option value="">Select</option>
                          {REACH.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field id="amb-why" label="Why do you want to be a CyberHx ambassador?" error={errors.why}>
                      <textarea id="amb-why" name="why" rows={4} value={f.why} onChange={on} maxLength={5000} placeholder="What you'd like to build on your campus, and why you're the person to do it." className={`${field} resize-y leading-7`} aria-invalid={!!errors.why} />
                    </Field>
                    <Field id="amb-ideas" label="An event you'd love to run" hint="(optional)">
                      <textarea id="amb-ideas" name="ideas" rows={3} value={f.ideas} onChange={on} maxLength={3000} placeholder="A web hacking workshop, a freshers' mini CTF…" className={`${field} resize-y leading-7`} />
                    </Field>
                    <Field id="amb-heard" label="How did you hear about us?" hint="(optional)">
                      <input id="amb-heard" name="heard" value={f.heard} onChange={on} maxLength={200} placeholder="Instagram, a friend, a CTF…" className={field} />
                    </Field>

                    {failed && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{failed}</p>}
                    <div className="flex flex-wrap items-center gap-4">
                      <button type="submit" disabled={busy} className="btn btn-lime w-full disabled:opacity-60 sm:w-auto">
                        {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : <>Send application <ArrowRight size={17} /></>}
                      </button>
                      <p className="text-sm text-white/40">By applying you agree to our <Link to="/privacy" className="underline underline-offset-4 hover:text-white/70">privacy policy</Link>.</p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
