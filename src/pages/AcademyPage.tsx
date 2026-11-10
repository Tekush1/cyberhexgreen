import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Seo, breadcrumbLd, SITE } from '../features/seo/Seo';
import { SeatPricing } from '../components/pricing/SeatPricing';
import { Mascot } from '../components/shared/Mascot';
import { academyUrl, setupFeatures, studentFeatures, teacherFeatures, type AcademyFeature } from '../data/academy';
import { seatLists, type SeatAudience } from '../data/seats';

/* /academy — the CyberHx Academy, sold to colleges per student seat.
   Read top to bottom: what it is (one line), what teachers get, what students get, how a college starts,
   the price with the calculator, the questions, one button. Feature copy lives in data/academy.ts. */

const academic = seatLists.academic;
const cheapest = academic.slabs[academic.slabs.length - 1];

const FAQ = [
  { q: 'Who is the Academy for?', a: 'Colleges and universities that teach cybersecurity: a club, one section, a department or the whole institution. Teachers run classes, exams and the syllabus on it; students practise on it every day.' },
  { q: 'Is it the same as the Pentest Lab?', a: 'No. The Academy is where a college teaches: classes, daily labs, practice challenges, exams, syllabus, schedule and reports. The Pentest Lab is where a learner trains for the CAPT and CPPT certifications. Colleges can take the Academy + CAPT package, which adds a year of the Pentest Lab and the CAPT exam and certificate for every student.' },
  { q: 'Do teachers pay?', a: `No. Teacher seats are free: one for every ${academic.freeSeats.per} student seats, at least one and up to ${academic.freeSeats.cap}.` },
  { q: 'Can we try it first?', a: 'Start with a pilot of 10 to 24 seats for one section. If you move to 50 seats or more within 60 days, the whole pilot is credited.' },
  { q: 'Who can see our students?', a: 'Your college’s own challenges, exams and syllabus are only ever visible to your members. You can also mark your college private, which hides your students from other colleges on the boards.' },
  { q: 'What happens when the plan ends?', a: 'Nothing is lost. Teachers keep their dashboard and reports, and students keep their progress. New classes, exams and joins pause until the plan is renewed.' },
];

function Grid({ items, cols = 3 }: { items: AcademyFeature[]; cols?: 2 | 3 }) {
  return (
    <dl className={`grid gap-px overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : ''}`}>
      {items.map((f) => (
        <div key={f.title} className="bg-ink p-6 sm:p-7">
          <dt className="font-display text-xl text-white">{f.title}</dt>
          <dd className="mt-2 leading-7 text-white/60">{f.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AcademyPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [pkg, setPkg] = useState<SeatAudience>('academic');

  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo
        title="CyberHx Academy — Cybersecurity Teaching Platform for Colleges"
        description={`Classes, exams, syllabus, schedule, reports and leaderboards for your college, with daily labs and practice challenges for every student. From $${cheapest.usd} (₹${cheapest.inr.toLocaleString('en-IN')}) a student a year; teachers free.`}
        path="/academy"
        keywords="cybersecurity lms for colleges, ctf platform for universities, cybersecurity lab for students, teacher dashboard cybersecurity, college cybersecurity exams"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'CyberHx Academy',
            url: `${SITE}/academy`,
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            description: 'A cybersecurity teaching platform for colleges: classes, exams, syllabus, schedule, reports, leaderboards, daily labs and practice challenges.',
            offers: { '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: cheapest.usd, highPrice: academic.slabs[0].usd, offerCount: academic.slabs.length },
            provider: { '@type': 'Organization', name: 'CyberHx', url: SITE },
          },
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Academy', path: '/academy' }]),
        ]}
      />

      {/* What it is */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-16 pt-28 sm:pb-24 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-lime/[0.07] blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:px-8">
          <div className="min-w-0">
            <p className="text-[15px] text-white/55">CyberHx Academy · for colleges and universities</p>
            <h1 className="font-display mt-4 text-5xl leading-[1.0] sm:text-7xl">Teach security <span className="text-white/45">the way it is practised.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">
              One place for your college: teachers run classes, exams, the syllabus and reports; students practise on daily labs and real challenges, and climb the boards.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#pricing" className="btn btn-lime">Price your batch <ArrowRight size={17} /></a>
              <a href={academyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Open the Academy <ArrowUpRight size={17} /></a>
            </div>
            <p className="mt-5 text-[15px] text-white/50">From ₹{cheapest.inr.toLocaleString('en-IN')} (${cheapest.usd}) a student a year. Teachers free. No GST.</p>
          </div>
          <Mascot pose="thumbs" alt="" eager className="mx-auto w-56 sm:w-72" />
        </div>
      </section>

      {/* Teachers */}
      <section aria-labelledby="t-h" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="t-h" className="font-display text-4xl leading-tight sm:text-5xl">For teachers.</h2>
          <p className="max-w-md text-[15px] leading-7 text-white/50">Everything a department needs to run a cybersecurity course, in one dashboard.</p>
        </div>
        <div className="mt-10"><Grid items={teacherFeatures} /></div>
      </section>

      {/* Students */}
      <section aria-labelledby="s-h" className="border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="s-h" className="font-display text-4xl leading-tight sm:text-5xl">For students.</h2>
            <p className="max-w-md text-[15px] leading-7 text-white/50">A reason to log in every day, and a rank that shows it.</p>
          </div>
          <div className="mt-10"><Grid items={studentFeatures} /></div>
        </div>
      </section>

      {/* Setting up */}
      <section aria-labelledby="u-h" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <h2 id="u-h" className="font-display text-4xl leading-tight sm:text-5xl">Your college, set up in a day.</h2>
        <div className="mt-10"><Grid items={setupFeatures} /></div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Tell us your numbers', 'Students, teachers, and when your semester starts.'],
            ['We set up your college', 'Your name and logo, your plan, your head of department.'],
            ['Bring your students in', 'Import a spreadsheet, or share a class code.'],
            ['Teach', 'Publish the syllabus, set exams, read the reports.'],
          ].map(([h, t], i) => (
            <li key={h} className="border-t border-white/10 pt-5">
              <p className="font-display text-3xl text-lime">{i + 1}</p>
              <p className="mt-2 text-lg font-semibold">{h}</p>
              <p className="mt-1 leading-7 text-white/55">{t}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Price */}
      <section id="pricing" aria-labelledby="p-h" className="scroll-mt-24 border-y border-white/[0.06] bg-[#070b15]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h2 id="p-h" className="font-display text-4xl leading-tight sm:text-5xl">One price per student.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-white/60">The Academy on its own, or with the CAPT certification for every student. The bigger the batch, the less each seat costs; teachers are free.</p>
          </div>
          <div className="mt-10"><SeatPricing audience={pkg} packages={['academic', 'academicCapt']} onPackage={setPkg} /></div>
        </div>
      </section>

      {/* Questions */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-6 sm:py-24">
        <h2 className="font-display text-3xl sm:text-4xl">Questions colleges ask</h2>
        <div className="mt-6 divide-y divide-white/[0.07] rounded-[24px] border border-white/[0.08] bg-white/[0.02]">
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

      {/* Close */}
      <section className="mx-auto max-w-4xl px-5 pb-28 text-center sm:px-6">
        <h2 className="font-display text-4xl sm:text-5xl">Bring the Academy to your college.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-white/60">Tell us your numbers. We reply within two working days with a plan, a price and a date to start.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/universities#plan" className="btn btn-lime">Talk to us <ArrowRight size={16} /></Link>
          <a href={academyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Open the Academy <ArrowUpRight size={16} /></a>
        </div>
      </section>
    </div>
  );
}
