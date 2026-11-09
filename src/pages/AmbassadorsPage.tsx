import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Download, Loader2 } from 'lucide-react';
import { Seo } from '../features/seo/Seo';
import { Mascot } from '../components/shared/Mascot';
import { isEmail, submitForm } from '../lib/forms';

/* /ambassadors: the CyberHx Global Campus Ambassador Program, open to students at any college or university.
   Applications go to form_submissions (form = 'ambassador') -> Admin -> Inbox, plus an email to the team.
   Look: the program's own poster ("APPLY NOW." outline + solid, mascot on a lime disc) carried into the site's
   dark theme; typography does the work, no icons. The poster files in /public/ambassadors are the share kit. */

const DOES: { title: string; text: string }[] = [
  { title: 'Build a campus crew', text: 'Gather the students who want to learn security. Start a CyberHx circle, or bring your existing club along.' },
  { title: 'Bring teams to our CTFs', text: 'Get your campus onto the scoreboard at every CyberHx event, with your own referral link.' },
  { title: 'Run one event a term', text: 'A workshop, a talk or a mini CTF on our platform. We give you the challenges, the slides and the support.' },
  { title: 'Be our voice on campus', text: 'Share events, publish what you solved, and tell us what students around you actually want to learn.' },
];

const GETS: { title: string; text: string }[] = [
  { title: 'A certificate and a recommendation', text: 'An official CyberHx ambassador certificate, and a recommendation from the team after a term with real impact.' },
  { title: 'Pentest Lab access', text: 'Hands-on labs to sharpen your own skills while you lead others.' },
  { title: 'A CAPT discount', text: 'A discounted CAPT voucher, and a free one for the top ambassadors each term.' },
  { title: 'First look at new challenges', text: 'Play-test CTF challenges before anyone else, with the people who build them.' },
  { title: 'Mentorship from practitioners', text: 'Monthly calls with the CyberHx team on careers, CTFs and running a community.' },
  { title: 'A door to hiring partners', text: 'Top ambassadors are introduced first when companies come to CyberHx looking for talent.' },
];

const LEVELS: { name: string; when: string; unlocks: string[] }[] = [
  { name: 'Explorer', when: 'When you join', unlocks: ['Ambassador certificate', 'Onboarding kit and referral link', 'A private channel with the CyberHx team'] },
  { name: 'Pathfinder', when: 'After your first campus event', unlocks: ['Pentest Lab access', 'CAPT discount voucher', 'A feature on CyberHx socials'] },
  { name: 'Commander', when: 'Top ambassadors each term', unlocks: ['Free CAPT voucher', 'CyberHx merch', 'Introductions to hiring partners'] },
];

const STEPS = [
  { title: 'Apply', text: 'Five minutes. Who you are, your campus, and why you want to lead.' },
  { title: 'A short call', text: 'Fifteen minutes with the CyberHx team, in your time zone.' },
  { title: 'Onboard', text: 'Your kit: logo pack, a talk deck, a referral link and a mini CTF you can run.' },
  { title: 'Lead', text: 'Run your first event, bring teams to our CTFs, and level up each term.' },
];

const KIT: { file: string; label: string; size: string; w: number; h: number }[] = [
  { file: 'poster-portrait.jpg', label: 'Instagram post', size: '1080 × 1350', w: 1080, h: 1350 },
  { file: 'poster-square.jpg', label: 'Square post', size: '1080 × 1080', w: 1080, h: 1080 },
  { file: 'banner-apply-now.jpg', label: 'LinkedIn banner', size: '1920 × 560', w: 1920, h: 560 },
  { file: 'banner-program.jpg', label: 'Group cover', size: '1920 × 560', w: 1920, h: 560 },
  { file: 'card-apply-now.jpg', label: 'WhatsApp card', size: '700 × 400', w: 700, h: 400 },
];

const FAQ = [
  { q: 'Who can apply?', a: 'Any student enrolled at a college or university, in any country, in any year and any branch. You don\'t need to be a CTF expert. You need to care about security and enjoy bringing people together.' },
  { q: 'How much time does it take?', a: 'About two to four hours a week, more in the weeks you run an event. It fits around classes and exams; tell us when you are busy and we plan around it.' },
  { q: 'Is it paid?', a: 'It is a volunteer role with real rewards: certification, lab access, mentorship, merch and introductions to hiring partners. The more your campus does, the more you unlock.' },
  { q: 'Can there be more than one ambassador at my college?', a: 'Yes. Large campuses can have a small team. If someone from your college is already in, you join them and run events together.' },
  { q: 'My college has no security club. Can I still apply?', a: 'Yes, and those campuses need it most. We help you start a CyberHx circle from zero, with a first event that is easy to run.' },
  { q: 'Can I apply from any country?', a: 'Yes. The program is global. Everything runs online, and our CTFs already draw players from 90+ countries.' },
];

const YEARS = ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Master\'s', 'PhD', 'Diploma'];
const LEVEL_OPTS = ['New to security', 'Played a few CTFs', 'Play CTFs regularly', 'I already run a club or community'];
const REACH = ['Under 50 students', '50 to 200', '200 to 1,000', 'Over 1,000'];

const field =
  'w-full rounded-xl border border-white/[0.1] bg-[#070b16] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-glow focus:ring-4 focus:ring-glow/10 aria-[invalid=true]:border-red-400/70';
const labelCls = 'mb-2 block text-sm font-medium text-white/80';

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label} {hint && <span className="font-normal text-white/35">{hint}</span>}</label>
      {children}
      {error && <p className="mt-1.5 text-sm text-red-300">{error}</p>}
    </div>
  );
}

/** The poster's headline: an outlined word over a solid one. */
function ApplyNow({ small = false }: { small?: boolean }) {
  return (
    <p aria-label="Apply now" className={`font-display leading-[0.86] ${small ? 'text-[4.5rem] sm:text-[6rem]' : 'text-[5.5rem] sm:text-[8rem] lg:text-[9.5rem]'}`}>
      <span aria-hidden="true" className="block text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.92)] sm:[-webkit-text-stroke:3px_rgba(255,255,255,0.92)]">APPLY</span>
      <span aria-hidden="true" className="block text-white">NOW.</span>
    </p>
  );
}

/** The mascot on the poster's lime disc. */
function Jump({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden="true" className="absolute left-1/2 top-[38%] h-[72%] w-[72%] -translate-x-1/2 rounded-full bg-lime shadow-[0_40px_120px_-30px_rgba(198,241,53,0.55)]" />
      <Mascot pose="jump" alt="The CyberHx mascot jumping" eager className="relative w-full" />
    </div>
  );
}

/** The ambassador ID card beside the form, filled in live from the form. */
function IdCard({ name, college, country }: { name: string; college: string; country: string }) {
  return (
    <div className="relative w-full max-w-[22rem] -rotate-2 rounded-[22px] bg-gradient-to-br from-lime/70 via-glow/40 to-lime/20 p-[1.5px] shadow-[0_40px_80px_-30px_rgba(198,241,53,0.35)]">
      <div className="relative overflow-hidden rounded-[21px] bg-[#0a1020] px-6 pb-6 pt-5">
        <div className="flex items-center justify-between text-[12px] text-white/55">
          <span>CyberHx · Global</span>
          <span className="text-lime">Explorer</span>
        </div>
        <p className="font-display mt-5 text-[26px] leading-none text-white">Campus<br />Ambassador</p>
        <dl className="mt-6 space-y-3 text-[13px]">
          <div><dt className="text-[11px] text-white/35">Name</dt><dd className="mt-0.5 truncate text-white">{name.trim() || 'Your name'}</dd></div>
          <div><dt className="text-[11px] text-white/35">Campus</dt><dd className="mt-0.5 truncate text-white">{college.trim() || 'Your college or university'}</dd></div>
          <div className="flex gap-8">
            <div><dt className="text-[11px] text-white/35">Country</dt><dd className="mt-0.5 text-white">{country.trim() || 'Anywhere'}</dd></div>
            <div><dt className="text-[11px] text-white/35">Cohort</dt><dd className="mt-0.5 text-white">2027</dd></div>
          </div>
        </dl>
        <div aria-hidden="true" className="mt-6 flex items-end justify-between">
          <div className="flex h-7 items-end gap-[3px]">
            {[3, 7, 4, 7, 2, 6, 7, 3, 5, 7, 2, 4, 7, 6, 3, 7, 4, 2, 7, 5].map((h, i) => <span key={i} className="w-[2px] bg-white/40" style={{ height: `${h * 4}px` }} />)}
          </div>
          <span className="text-[11px] text-white/30">cyberhx.com/ambassadors</span>
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

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="CyberHx Global Campus Ambassador Program"
        description="Lead cybersecurity on your campus. CyberHx campus ambassadors build a crew, bring teams to our CTFs and run events, and get certification, Pentest Lab access, mentorship and introductions to hiring partners. Open to students worldwide."
        path="/ambassadors"
        image="https://cyberhx.com/ambassadors/card-apply-now.jpg"
        keywords="campus ambassador program, student ambassador cybersecurity, ctf club, cyberhx ambassador, college cyber community"
      />

      {/* Hero: the poster */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-14 pt-24 sm:pb-20 sm:pt-32">
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <p className="text-[15px] text-white/55">Global Campus Ambassador Program · Applications open worldwide</p>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="min-w-0">
              <h1 className="sr-only">Apply now: the CyberHx Global Campus Ambassador Program</h1>
              <ApplyNow />
              <p className="font-display mt-8 max-w-xl text-2xl leading-tight text-white sm:text-3xl">Lead cybersecurity on your campus.</p>
              <p className="mt-4 max-w-xl text-lg leading-8 text-white/60">
                Lead CTFs. Train in the Pentest Lab. Build the cyber community at your college, wherever in the world it is.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#apply" className="btn btn-lime">Apply now <ArrowRight size={17} /></a>
                <a href="#perks" className="btn btn-ghost">What you get</a>
              </div>
            </div>
            <Jump className="mx-auto w-64 sm:w-80 lg:w-[26rem]" />
          </div>
          <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-white/[0.08] pt-8">
            {[['7,400+', 'learners in the community'], ['90+', 'countries play our CTFs'], ['Any', 'college, year or branch']].map(([v, k]) => (
              <div key={k}>
                <dt className="sr-only">{k}</dt>
                <dd className="font-display text-3xl sm:text-4xl">{v}</dd>
                <dd className="mt-1 text-[13px] text-white/45 sm:text-[14px]">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The role */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-[15px] text-white/50">The role</p>
            <h2 className="font-display mt-3 text-4xl leading-[1.05] sm:text-5xl">You lead. <span className="text-white/45">We back you up.</span></h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-white/60">Four things every ambassador does, at their own pace, with the team behind them.</p>
          </div>
          <ol className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {DOES.map((d, i) => (
              <li key={d.title} className="grid gap-2 py-6 sm:grid-cols-[3rem_1fr] sm:gap-6">
                <span className="font-display text-xl text-lime">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-xl font-semibold">{d.title}</h3>
                  <p className="mt-2 leading-7 text-white/55">{d.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What you get */}
      <section id="perks" className="scroll-mt-24 border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.4fr] lg:px-8">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[15px] text-white/50">What you get</p>
            <h2 className="font-display mt-3 text-4xl leading-[1.05] sm:text-5xl">Lead others. <span className="text-white/45">Level yourself up.</span></h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-white/60">Everything here comes from what CyberHx already runs: the CTFs, the Pentest Lab, CAPT certification and our hiring partners.</p>
          </div>
          <div className="grid gap-x-10 sm:grid-cols-2">
            {GETS.map((g) => (
              <div key={g.title} className="border-t border-white/[0.08] py-6">
                <h3 className="text-lg font-semibold">{g.title}</h3>
                <p className="mt-2 leading-7 text-white/55">{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <p className="text-[15px] text-white/50">Three levels</p>
        <h2 className="font-display mt-3 max-w-3xl text-4xl leading-[1.05] sm:text-5xl">The more your campus does, the more you unlock.</h2>
        <ol className="mt-12 grid gap-10 border-t border-white/[0.08] pt-8 lg:grid-cols-3">
          {LEVELS.map((l, i) => (
            <li key={l.name}>
              <p className="text-[14px] text-white/45">Level {i + 1} · {l.when}</p>
              <h3 className={`font-display mt-2 text-4xl ${i === 2 ? 'text-lime' : ''}`}>{l.name}</h3>
              <ul className="mt-5 space-y-2.5 text-[15px] text-white/80">
                {l.unlocks.map((u) => <li key={u} className="flex items-start gap-3"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{u}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* How it works */}
      <section className="border-y border-white/[0.06] bg-gradient-to-b from-[#0a1120] to-[#070b15]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-[15px] text-white/50">How it works</p>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl">From application to your first event</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t border-white/[0.1] pt-5">
                <p className="text-[14px] text-white/45">Step {i + 1}</p>
                <h3 className="font-display mt-2 text-2xl">{s.title}</h3>
                <p className="mt-3 leading-7 text-white/55">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-12 max-w-2xl text-lg leading-8 text-white/70">
            <span className="font-semibold text-white">Your first mission:</span> bring your campus to our next global event, a 24-hour space security CTF in February 2027.
            <Link to="/events" className="ml-2 text-lime underline underline-offset-4">See our events</Link>
          </p>
        </div>
      </section>

      {/* Share kit */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-[15px] text-white/50">Spread the word</p>
            <h2 className="font-display mt-3 text-4xl leading-[1.05] sm:text-5xl">Know someone who should lead?</h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-white/60">Post the program in your class group, your club or your story. Every file is ready to share, no editing needed.</p>
            <ul className="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {KIT.map((k) => (
                <li key={k.file}>
                  <a href={`/ambassadors/${k.file}`} download className="group flex items-center justify-between gap-4 py-3.5 text-[15px]">
                    <span className="text-white">{k.label}</span>
                    <span className="flex items-center gap-3 text-white/45"><span className="tabular-nums">{k.size}</span><Download size={16} className="text-lime transition-transform group-hover:translate-y-0.5" /></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-[1.1fr_1fr] items-end gap-4">
            <img src="/ambassadors/poster-portrait.webp" alt="Poster: Apply now. Global Campus Ambassador Program." width={1080} height={1350} loading="lazy" className="w-full -rotate-1 rounded-2xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]" />
            <div className="grid gap-4">
              <img src="/ambassadors/card-apply-now.jpg" alt="" width={700} height={400} loading="lazy" className="w-full rotate-1 rounded-2xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]" />
              <img src="/ambassadors/banner-program.jpg" alt="" width={1920} height={560} loading="lazy" className="w-full rotate-2 rounded-2xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6 sm:pb-24">
        <h2 className="font-display text-3xl sm:text-4xl">Questions students ask</h2>
        <div className="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ.map((x, i) => (
            <div key={x.q}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
                <span className="text-[16px] font-semibold">{x.q}</span>
                <span className={`text-xl text-lime transition-transform ${open === i ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
              </button>
              {open === i && <p className="-mt-1 pb-5 leading-7 text-white/60">{x.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-28 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div className="lg:sticky lg:top-28">
            <ApplyNow small />
            <p className="mt-6 max-w-sm text-lg leading-8 text-white/60">Applications are reviewed on a rolling basis. A real person from CyberHx replies by email.</p>
            <div className="mt-10 hidden lg:block">
              <IdCard name={f.name} college={f.college} country={f.country} />
              <p className="mt-4 max-w-xs text-sm text-white/40">Your card fills in as you type. Ambassadors get the real one.</p>
            </div>
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
                        <input id="amb-phone" name="phone" type="tel" value={f.phone} onChange={on} autoComplete="tel" maxLength={40} className={field} />
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
