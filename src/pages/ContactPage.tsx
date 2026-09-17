import React from "react";

import {
  ArrowRight,
  Award,
  BarChart3,
  Check,
  Globe2,
  Megaphone,
  Server,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
  Building2,
  CalendarDays,
  Wallet,
  Monitor,
  MessageSquare,
} from "lucide-react";

const capabilities = [
  {
    icon: Server,
    title: "CTF Infrastructure",
    description:
      "Reliable infrastructure for hosting challenges, competition services and live CTF environments.",
  },
  {
    icon: Megaphone,
    title: "Event Promotion",
    description:
      "Put your event in front of the CyberHX cybersecurity community through our promotion network.",
  },
  {
    icon: Globe2,
    title: "International Reach",
    description:
      "Take your competition beyond your campus or local community and reach participants globally.",
  },
  {
    icon: Award,
    title: "Certification Management",
    description:
      "Streamline participation certificates and recognition for your event participants.",
  },
  {
    icon: Users,
    title: "Participant Management",
    description:
      "Manage registrations, teams and participants throughout your competition.",
  },
  {
    icon: Trophy,
    title: "Live Leaderboards",
    description:
      "Keep participants engaged with real-time scoring and competition rankings.",
  },
];

const eventTypes = [
  "Capture The Flag",
  "University CTFs",
  "Cybersecurity Competitions",
  "Community Events",
  "Hackathons",
  "Security Challenges",
];

const process = [
  {
    number: "01",
    title: "Tell us about your event",
    description:
      "Share your event idea, format, timeline and requirements with our team.",
  },
  {
    number: "02",
    title: "Build your event",
    description:
      "We help you prepare the platform, infrastructure and event experience.",
  },
  {
    number: "03",
    title: "Promote & launch",
    description:
      "Get your event in front of the CyberHX community and start registrations.",
  },
  {
    number: "04",
    title: "Run your competition",
    description:
      "Focus on your participants and challenges while CyberHX handles the platform.",
  },
];

export default function HostYourCTF() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<"idle" | "success" | "error">("idle");

  const [hostForm, setHostForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    organizationUrl: "",
    eventName: "",
    eventFormat: "",
    eventDate: "",
    participants: "",
    budget: "",
    requirements: "",
    message: "",
  });

  const handleHostChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setHostForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "ae826816-f65e-4d6f-8491-3362df582e13",
          subject: `CTF Hosting Request — ${hostForm.eventName}`,
          ...hostForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus("success");
        setHostForm({
          name: "",
          email: "",
          phone: "",
          organization: "",
          organizationUrl: "",
          eventName: "",
          eventFormat: "",
          eventDate: "",
          participants: "",
          budget: "",
          requirements: "",
          message: "",
        });
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* =========================================================
          GLOBAL BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-300px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-lime-400/[0.055] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="relative">
        <div className="mx-auto flex min-h-[88vh] max-w-7xl items-center px-6 py-24 lg:px-8">
          <div className="grid w-full items-center gap-20 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Hero copy */}

            <div>
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.025] px-4 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />

                <span className="text-[11px] font-medium tracking-[0.2em] text-white/55">
                  HOST YOUR CTF
                </span>
              </div>

              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-[84px]">
                Your CTF.
                <br />
                <span className="text-white/35">Powered by CyberHX.</span>
              </h1>

              <p className="mt-8 max-w-xl text-base leading-7 text-white/45 sm:text-lg">
                Host, promote and manage your cybersecurity competition with
                CyberHX — from infrastructure and registrations to
                certifications and global reach.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#get-started"
                  className="group inline-flex items-center gap-3 rounded-full bg-lime-400 px-7 py-4 text-sm font-semibold text-black transition duration-200 hover:bg-lime-300"
                >
                  Host Your CTF

                  <ArrowRight
                    size={17}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </a>

                <a
                  href="#capabilities"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-7 py-4 text-sm font-medium text-white/65 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                >
                  Explore the platform
                </a>
              </div>

              {/* Hero metrics */}

              <div className="mt-16 flex flex-wrap gap-x-10 gap-y-6 border-t border-white/[0.08] pt-7">
                <div>
                  <div className="text-2xl font-semibold tracking-tight">
                    1M+
                  </div>

                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                    Unique Visitors
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-semibold tracking-tight">
                    Global
                  </div>

                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                    Community Reach
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-semibold tracking-tight">
                    End-to-End
                  </div>

                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                    Event Support
                  </div>
                </div>
              </div>
            </div>

            {/* Hero visual */}

            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-lime-400/[0.035] blur-3xl" />

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080808] shadow-2xl">
                {/* Terminal top */}

                <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />

                  <span className="ml-auto font-mono text-[10px] text-white/20">
                    cyberhx / event
                  </span>
                </div>

                <div className="p-7">
                  <div className="font-mono text-xs text-white/25">
                    $ cyberhx event status
                  </div>

                  <div className="mt-6 flex items-center justify-between rounded-xl border border-lime-400/10 bg-lime-400/[0.035] p-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                        Event status
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                        LIVE
                      </div>
                    </div>

                    <Zap size={18} className="text-lime-400" />
                  </div>

                  {/* Dashboard rows */}

                  <div className="mt-4 space-y-2">
                    {[
                      ["Infrastructure", "READY"],
                      ["Registrations", "CONNECTED"],
                      ["Leaderboard", "LIVE"],
                      ["Certificates", "READY"],
                      ["Promotion", "ACTIVE"],
                    ].map(([label, status]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.015] px-4 py-3"
                      >
                        <span className="text-xs text-white/45">
                          {label}
                        </span>

                        <span className="font-mono text-[9px] text-lime-400/70">
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/[0.05] p-4">
                      <div className="text-2xl font-semibold">1M+</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-white/25">
                        Reach
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.05] p-4">
                      <div className="text-2xl font-semibold">∞</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-white/25">
                        Possibilities
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          INTRO
      ========================================================= */}

      <section className="border-y border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] text-lime-400">
                MORE THAN A PLATFORM
              </p>

              <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
                Everything around your CTF.
              </h2>
            </div>

            <div className="flex items-end">
              <p className="max-w-xl text-base leading-7 text-white/40">
                CyberHX helps organizers go beyond simply hosting challenges.
                Build your event, reach participants, manage the competition
                and deliver recognition — all through one ecosystem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CAPABILITIES
      ========================================================= */}

      <section
        id="capabilities"
        className="mx-auto max-w-7xl px-6 py-28 lg:px-8"
      >
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium tracking-[0.2em] text-lime-400">
            WHAT YOU GET
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            One ecosystem.
            <br />
            <span className="text-white/30">Every essential.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group min-h-[270px] bg-[#060606] p-8 transition duration-300 hover:bg-[#0a0a0a] sm:p-9"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] text-white/20">
                    0{index + 1}
                  </span>

                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    className="text-white/20 transition duration-300 group-hover:text-lime-400"
                  />
                </div>

                <h3 className="mt-16 text-lg font-medium tracking-tight">
                  {item.title}
                </h3>

                <p className="mt-3 max-w-xs text-sm leading-6 text-white/35">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          REACH SECTION
      ========================================================= */}

      <section className="border-y border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
                <Globe2
                  size={21}
                  strokeWidth={1.5}
                  className="text-lime-400"
                />
              </div>

              <p className="text-[11px] font-medium tracking-[0.2em] text-lime-400">
                GLOBAL REACH
              </p>

              <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
                Your event deserves an audience.
              </h2>
            </div>

            <div>
              <p className="text-lg leading-8 text-white/45">
                CyberHX events attract a global cybersecurity audience, giving
                organizers an opportunity to take their competitions beyond
                their existing community.
              </p>

              <div className="mt-10 border-l border-lime-400/30 pl-6">
                <div className="text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
                  1M+
                </div>

                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/30">
                  Unique visitors across CyberHX events
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          EVENT TYPES
      ========================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium tracking-[0.2em] text-lime-400">
            FLEXIBLE BY DESIGN
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Built for cybersecurity events of all kinds.
          </h2>
        </div>

        <div className="mt-14 grid border-t border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {eventTypes.map((type, index) => (
            <div
              key={type}
              className="group flex items-center justify-between border-b border-white/[0.08] py-6 pr-5"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-white/20">
                  0{index + 1}
                </span>

                <span className="text-sm text-white/55 transition group-hover:text-white">
                  {type}
                </span>
              </div>

              <ArrowRight
                size={14}
                className="text-white/15 transition group-hover:translate-x-1 group-hover:text-lime-400"
              />
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          PROCESS
      ========================================================= */}

      <section
        id="how-it-works"
        className="border-y border-white/[0.07]"
      >
        <div className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.2em] text-lime-400">
              HOW IT WORKS
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              From idea to live event.
            </h2>
          </div>

          <div className="mt-16 grid border-y border-white/[0.08] lg:grid-cols-4">
            {process.map((step, index) => (
              <div
                key={step.number}
                className={`p-7 lg:p-8 ${
                  index !== process.length - 1
                    ? "border-b border-white/[0.08] lg:border-b-0 lg:border-r"
                    : ""
                }`}
              >
                <span className="font-mono text-xs text-lime-400">
                  {step.number}
                </span>

                <h3 className="mt-14 text-base font-medium">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/35">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          ORGANIZER PROMISE
      ========================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-lime-400">
              FOCUS ON THE EXPERIENCE
            </p>

            <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-6xl">
              You build the challenge.
              <br />
              <span className="text-white/30">
                We help power the event.
              </span>
            </h2>
          </div>

          <div className="space-y-5">
            {[
              "Infrastructure for your competition",
              "Promotion across the CyberHX ecosystem",
              "International participant reach",
              "Certification management",
              "Event and participant support",
            ].map((item) => (
              <div key={item} className="flex items-center gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-400/20 bg-lime-400/[0.05]">
                  <Check size={13} className="text-lime-400" />
                </div>

                <span className="text-sm text-white/55">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          HOST REQUEST FORM
      ========================================================= */}

      <section id="get-started" className="px-6 pb-24 lg:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#090909]">
          <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-lime-400/[0.055] blur-[130px]" />

          <div className="relative px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-lime-400/15 bg-lime-400/[0.04] px-4 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                <span className="text-[10px] font-medium tracking-[0.2em] text-lime-400">
                  HOST WITH CYBERHX
                </span>
              </div>

              <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">
                Tell us about
                <br />
                <span className="text-white/30">your event.</span>
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-white/40 sm:text-base">
                Share a few details about your organization and competition.
                Our team will review the requirements and get back to you.
              </p>
            </div>

            <form onSubmit={handleHostSubmit} className="mt-14">
              <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Your name *
                  </label>
                  <input
                    name="name"
                    value={hostForm.name}
                    onChange={handleHostChange}
                    required
                    placeholder="Full name"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Work email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={hostForm.email}
                    onChange={handleHostChange}
                    required
                    placeholder="you@organization.com"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={hostForm.phone}
                    onChange={handleHostChange}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Organization *
                  </label>
                  <input
                    name="organization"
                    value={hostForm.organization}
                    onChange={handleHostChange}
                    required
                    placeholder="College, company or community"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    <Building2 size={13} />
                    Organization website *
                  </label>
                  <input
                    type="url"
                    name="organizationUrl"
                    value={hostForm.organizationUrl}
                    onChange={handleHostChange}
                    required
                    placeholder="https://example.com"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Event name *
                  </label>
                  <input
                    name="eventName"
                    value={hostForm.eventName}
                    onChange={handleHostChange}
                    required
                    placeholder="e.g. Cyber Security CTF 2027"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    <Monitor size={13} />
                    Event format *
                  </label>
                  <select
                    name="eventFormat"
                    value={hostForm.eventFormat}
                    onChange={handleHostChange}
                    required
                    className="w-full appearance-none rounded-xl border border-white/[0.09] bg-[#0b0b0b] px-4 py-3.5 text-sm text-white outline-none transition focus:border-lime-400/40"
                  >
                    <option value="">Select format</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    <CalendarDays size={13} />
                    Tentative event date
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    value={hostForm.eventDate}
                    onChange={handleHostChange}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition focus:border-lime-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Expected participants
                  </label>
                  <select
                    name="participants"
                    value={hostForm.participants}
                    onChange={handleHostChange}
                    className="w-full appearance-none rounded-xl border border-white/[0.09] bg-[#0b0b0b] px-4 py-3.5 text-sm text-white outline-none transition focus:border-lime-400/40"
                  >
                    <option value="">Select expected scale</option>
                    <option value="under-100">Under 100</option>
                    <option value="100-500">100 – 500</option>
                    <option value="500-1000">500 – 1,000</option>
                    <option value="1000-5000">1,000 – 5,000</option>
                    <option value="5000-plus">5,000+</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                    <Wallet size={13} />
                    Organization budget
                  </label>
                  <select
                    name="budget"
                    value={hostForm.budget}
                    onChange={handleHostChange}
                    className="w-full appearance-none rounded-xl border border-white/[0.09] bg-[#0b0b0b] px-4 py-3.5 text-sm text-white outline-none transition focus:border-lime-400/40"
                  >
                    <option value="">Select budget range</option>
                    <option value="under-25k">Under ₹25,000</option>
                    <option value="25k-50k">₹25,000 – ₹50,000</option>
                    <option value="50k-1l">₹50,000 – ₹1,00,000</option>
                    <option value="1l-2.5l">₹1,00,000 – ₹2,50,000</option>
                    <option value="2.5l-plus">₹2,50,000+</option>
                    <option value="not-decided">Not decided yet</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                  <MessageSquare size={13} />
                  What do you need from CyberHX? *
                </label>
                <textarea
                  name="requirements"
                  value={hostForm.requirements}
                  onChange={handleHostChange}
                  required
                  rows={5}
                  placeholder="Tell us what you need — CTF infrastructure, challenge hosting, registrations, leaderboard, certificates, promotion, participant management, technical support, etc."
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Anything else we should know?
                </label>
                <textarea
                  name="message"
                  value={hostForm.message}
                  onChange={handleHostChange}
                  rows={4}
                  placeholder="Timeline, special requirements, challenge categories, sponsorship details, or any other context."
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40"
                />
              </div>

              {submitStatus === "success" && (
                <div className="mt-6 rounded-xl border border-lime-400/20 bg-lime-400/[0.05] px-4 py-3 text-sm text-lime-300">
                  Request submitted successfully. Our team will get back to you soon.
                </div>
              )}

              {submitStatus === "error" && (
                <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-sm text-red-300">
                  Something went wrong. Please try again or contact us directly.
                </div>
              )}

              <div className="mt-8 flex flex-col items-start justify-between gap-5 border-t border-white/[0.08] pt-7 sm:flex-row sm:items-center">
                <p className="max-w-md text-xs leading-5 text-white/25">
                  No file upload required. Just share the event details and your
                  requirements — we’ll take it from there.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-lime-400 px-7 py-4 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? "Submitting..." : "Send Event Request"}
                  {!isSubmitting && (
                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}