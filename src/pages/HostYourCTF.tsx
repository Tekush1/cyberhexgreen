import React from "react";

import {
  ArrowRight,
  Check,
  Plus,
  Layers,
  Building2,
  CalendarDays,
  Wallet,
  Monitor,
  MessageSquare,
  Palette,
} from "lucide-react";
import { SiteIcon, type IconName } from "../components/shared/SiteIcon";
import { Mascot } from "../components/shared/Mascot";
import { plans, pickAndChoose } from "../data/hosting";

/* =============================================================
   STORE DATA — edit prices / copy here, the page updates itself.
   Prices are in USD with an approximate INR value.
============================================================= */

// NOTE: add-on prices were not in the reference screenshots.
// Fill `price` in when you decide them; until then the card shows "Quoted per event".
const addOns: { id: string; icon: IconName; title: string; description: string; price: string }[] = [
  {
    id: "longer-events",
    icon: 'gauge',
    title: "Longer events",
    description: "Stretch hosting past the standard 8 hours, up to 24 hours, for weekend-style or multi-round CTFs.",
    price: "",
  },
  {
    id: "extra-challenges",
    icon: 'toolbox',
    title: "Extra challenges",
    description: "Need more depth? Add more custom-built challenges on top of any plan or pack.",
    price: "",
  },
  {
    id: "custom-website",
    icon: 'code-light',
    title: "3D event website",
    description: "A themed 3D landing site for your event, included in Max and available as an add-on.",
    price: "",
  },
  {
    id: "promotion",
    icon: 'satellite',
    title: "Promotion",
    description: "Put your event in front of the CyberHX community across our channels.",
    price: "",
  },
];

const challengeCategories: { icon: IconName; name: string }[] = [
  { icon: "code", name: "Web" },
  { icon: "shield", name: "Crypto" },
  { icon: "satellite", name: "OSINT" },
  { icon: "bug", name: "Pwn" },
  { icon: "eyes", name: "Forensics" },
  { icon: "ghost", name: "Steg" },
  { icon: "linux", name: "Boot2Root" },
  { icon: "network", name: "Chained" },
];

const dashboardFeatures: { icon: IconName; title: string; description: string }[] = [
  { icon: "gauge", title: "Live scoreboard", description: "Rankings update in real time as teams solve." },
  { icon: "hacker-team", title: "Teams & participants", description: "See registrations, teams and activity in one place." },
  { icon: "toolbox", title: "Challenge control", description: "Release, hide or review challenges while the event runs." },
  { icon: "podium", title: "Certificates", description: "Issue participation and winner certificates after the event." },
];

const process = [
  { number: "01", title: "Pick a plan", description: "Choose a plan, or buy only hosting or a challenge pack." },
  { number: "02", title: "Tell us your theme", description: "Share your event name, dates and the look you want." },
  { number: "03", title: "We build it", description: "We prepare the challenges, platform and scoreboard for your event." },
  { number: "04", title: "Run your CTF", description: "Go live, watch the board in the host dashboard, and hand out certificates." },
];

const accentStyles = {
  white: {
    ring: "border-white/10",
    price: "text-white",
    btn: "border border-white/15 text-white hover:bg-white/[0.06]",
    check: "text-lime-400",
  },
  lime: {
    ring: "border-lime-400/60 shadow-[0_0_60px_-20px_rgba(163,230,53,0.35)]",
    price: "text-lime-400",
    btn: "bg-lime-400 text-black hover:bg-lime-300",
    check: "text-lime-400",
  },
  cyan: {
    ring: "border-cyan-400/50",
    price: "text-cyan-400",
    btn: "bg-cyan-400 text-black hover:bg-cyan-300",
    check: "text-cyan-400",
  },
} as const;

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  organizationUrl: "",
  eventName: "",
  eventTheme: "",
  eventFormat: "",
  eventDate: "",
  participants: "",
  budget: "",
  requirements: "",
  message: "",
};

const inputCls =
  "w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-lime-400/40";
const selectCls =
  "w-full appearance-none rounded-xl border border-white/[0.09] bg-ink px-4 py-3.5 text-sm text-white outline-none transition focus:border-lime-400/40";
const labelCls =
  "mb-2 flex items-center gap-2 text-sm font-semibold text-white/60";

const subNav = [
  { href: "#plans", label: "Plans" },
  { href: "#pick-and-choose", label: "Pick and choose" },
  { href: "#add-ons", label: "Add-ons" },
  { href: "#host-dashboard", label: "Host dashboard" },
];

export default function HostYourCTF() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [hostForm, setHostForm] = React.useState(emptyForm);
  const [selection, setSelection] = React.useState("");
  const [selectedAddOns, setSelectedAddOns] = React.useState<string[]>([]);

  const handleHostChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setHostForm((prev) => ({ ...prev, [name]: value }));
  };

  const choose = (label: string) => {
    setSelection(label);
    document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleAddOn = (title: string) =>
    setSelectedAddOns((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]));

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
          subject: `CTF Hosting Request — ${hostForm.eventName} (${selection || "no plan selected"})`,
          selected_plan: selection || "Not selected",
          add_ons: selectedAddOns.join(", ") || "None",
          ...hostForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus("success");
        setHostForm(emptyForm);
        setSelection("");
        setSelectedAddOns([]);
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

    const h2 = "font-display mt-4 text-[2.1rem] sm:text-5xl";

  return (
    <div className="min-h-screen overflow-x-clip bg-ink pt-16 text-white sm:pt-[72px]">
      {/* Background */}
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

      {/* Sticky store sub-nav */}
      <div className="sticky top-16 z-40 border-b border-white/[0.07] bg-ink/85 backdrop-blur sm:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <span className="hidden text-sm font-semibold sm:block">CyberHX Store</span>
          <nav className="hide-scrollbar flex flex-1 items-center gap-1 overflow-x-auto sm:justify-center">
            {subNav.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/[0.05] hover:text-white sm:text-sm"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <a
            href="#get-started"
            className="shrink-0 rounded-full bg-lime-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-lime-300 sm:text-sm"
          >
            Host an event
          </a>
        </div>
      </div>

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-7 flex items-center gap-3">
                <img src="/mascots/store.webp" alt="" className="h-14 w-auto" />
                <span className="text-sm font-semibold text-white/70">The CyberHX store for CTF organizers</span>
              </div>

              <h1 className="font-display max-w-3xl text-[2.7rem] sm:text-6xl lg:text-[74px]">
                Host your CTF.
                <br />
                <span className="text-white/35">Let players climb the board.</span>
              </h1>

              <p className="mt-8 max-w-xl text-base leading-7 text-white/50 sm:text-lg">
                Pick a plan and tell us your theme. We build the challenges and host the event, with a live
                scoreboard for 8 hours, or up to 24.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#plans"
                  className="group inline-flex items-center gap-3 rounded-full bg-lime-400 px-7 py-4 text-sm font-semibold text-black transition hover:bg-lime-300"
                >
                  See plans
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="#add-ons"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-7 py-4 text-sm font-medium text-white/65 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                >
                  Extra hours and challenges
                </a>
              </div>

              <div className="mt-14 flex flex-wrap gap-x-10 gap-y-6 border-t border-white/[0.08] pt-7">
                {[
                  ["1M+", "Unique visitors"],
                  ["8–24h", "Hosted event"],
                  ["Live", "Scoreboard"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div className="font-display text-2xl">{v}</div>
                    <div className="mt-1 text-xs text-white/40">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoreboard visual */}
            <div className="relative">
              <Mascot
                pose="point"
                alt="CyberHx mascot pointing at you"
                eager
                className="mascot-pop relative z-10 -mb-14 ml-2 w-56 sm:w-64 lg:w-72"
              />
              <div className="sticker relative overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="ml-auto font-mono text-[10px] text-white/25">cyberhx / scoreboard</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between rounded-xl border border-lime-400/10 bg-lime-400/[0.04] p-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-white/30">Event status</div>
                      <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
                        LIVE · 05:42:10 left
                      </div>
                    </div>
                    <SiteIcon name="gauge" size={56} alt="" />
                  </div>

                  <div className="mt-4 space-y-2">
                    {[
                      ["1", "root_or_nothing", "4,820"],
                      ["2", "nullbyte", "4,310"],
                      ["3", "xor_squad", "3,975"],
                      ["4", "stack_smashers", "3,120"],
                      ["5", "0xdeadc0de", "2,860"],
                    ].map(([rank, team, pts], i) => (
                      <div
                        key={team}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                          i === 0 ? "border-lime-400/20 bg-lime-400/[0.04]" : "border-white/[0.05] bg-white/[0.015]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-xs ${i === 0 ? "text-lime-400" : "text-white/30"}`}>
                            #{rank}
                          </span>
                          <span className="text-xs text-white/70">{team}</span>
                        </div>
                        <span className="font-mono text-xs text-white/50">{pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHALLENGES WE BUILD */}
      <section className="border-y border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl">Challenges we build for your event</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {challengeCategories.map(({ icon, name }) => (
              <div
                key={name}
                className="flex flex-col items-center gap-3 px-2 py-4"
              >
                <SiteIcon name={icon} size={84} alt="" />
                <span className="text-sm font-semibold text-white/80">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="mx-auto max-w-7xl scroll-mt-32 px-6 py-24 lg:px-8">
        <div className="max-w-2xl">
          <h2 className={h2}>
            Pick a plan.
            <br />
            <span className="text-white/30">We handle the rest.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-8 lg:mt-28 lg:grid-cols-2">
          {plans.map((plan, i) => {
            const s = accentStyles[plan.accent];
            const wide = i === 2; // Max spans the full row
            return (
              <div
                key={plan.id}
                className={`sticker relative flex flex-col p-8 ${plan.featured ? "sticker-lime mt-20 lg:mt-0" : plan.accent === "cyan" ? "sticker-glow" : ""} ${
                  wide ? "lg:col-span-2" : ""
                }`}
              >
                {plan.featured && (
                  <Mascot
                    pose="thumbs"
                    alt=""
                    className="absolute -top-36 right-6 w-32 sm:-top-44 sm:w-40"
                  />
                )}
                <SiteIcon name={plan.icon} size={88} alt="" className="-ml-1" />
                <h3 className="font-display mt-5 text-2xl">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className={`font-display text-6xl ${s.price}`}>${plan.usd}</span>
                  <span className="text-sm text-white/40">about {plan.inr}</span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">{plan.blurb}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/80">
                      <Check size={16} className={`mt-0.5 shrink-0 ${s.check}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => choose(`${plan.name} plan ($${plan.usd})`)}
                  className={`btn mt-8 w-full ${plan.featured ? "btn-lime" : "btn-ghost"}`}
                >
                  Start with {plan.name}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* PICK AND CHOOSE */}
      <section id="pick-and-choose" className="scroll-mt-32 border-y border-white/[0.07] bg-white/[0.012]">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="max-w-2xl">
            <h2 className={h2}>Or buy only the part you need</h2>
            <p className="mt-4 text-sm leading-6 text-white/40 sm:text-base">
              Already have challenges? Buy hosting alone. Want challenges but run your own platform? Buy a pack.
            </p>
          </div>

          <div className="mt-12 border-t border-white/[0.08]">
            {pickAndChoose.map(({ id, icon, title, description, usd, inr }) => (
              <button
                key={id}
                type="button"
                onClick={() => choose(`${title} (${usd})`)}
                className="group flex w-full flex-col gap-5 border-b border-white/[0.08] py-7 text-left transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-2"
              >
                <div className="flex items-start gap-5">
                  <SiteIcon name={icon} size={72} alt="" />
                  <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-white/45">{description}</p>
                  </div>
                </div>
                <div className="pl-[92px] sm:pl-0 sm:text-right">
                  <div className="font-display text-4xl text-sun">{usd}</div>
                  <div className="text-xs text-white/40">{inr}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ADD-ONS */}
      <section id="add-ons" className="mx-auto max-w-7xl scroll-mt-32 px-6 py-24 lg:px-8">
        <div className="max-w-2xl">
          <h2 className={h2}>Need more time or more challenges?</h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {addOns.map(({ id, icon, title, description, price }) => {
            const on = selectedAddOns.includes(title);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleAddOn(title)}
                aria-pressed={on}
                className={`flex items-start gap-5 rounded-2xl border p-6 text-left transition ${
                  on
                    ? "border-lime-400/50 bg-lime-400/[0.05]"
                    : "border-white/[0.08] bg-white/[0.015] hover:border-white/20"
                }`}
              >
                <SiteIcon name={icon} size={64} alt="" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">{title}</h3>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        on ? "border-lime-400 bg-lime-400 text-black" : "border-white/20 text-transparent"
                      }`}
                    >
                      <Check size={13} />
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-white/45">{description}</p>
                  <p className="mt-3 text-xs text-white/35">{price || "Quoted per event"}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-5 text-xs text-white/30">Tap an add-on to include it in your request below.</p>
      </section>

      {/* HOST DASHBOARD */}
      <section id="host-dashboard" className="scroll-mt-32 border-y border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SiteIcon name="windows" size={96} alt="" className="mb-4" />
              <h2 className={h2}>
                Run the event
                <br />
                <span className="text-white/30">from one screen.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/45 sm:text-base">
                Every host gets a dashboard to watch the board, manage teams and wrap up with certificates.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
              {dashboardFeatures.map(({ icon, title, description }) => (
                <div key={title} className="bg-ink p-7 transition hover:bg-panel">
                  <SiteIcon name={icon} size={72} alt="" />
                  <h3 className="mt-5 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/40">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REACH */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <h2 className={h2}>Your event deserves an audience.</h2>
          </div>
          <div>
            <p className="text-base leading-8 text-white/45">
              CyberHX events attract a global cybersecurity audience, so your competition can reach well beyond
              your campus or community.
            </p>
            <div className="mt-8 border-l border-lime-400/30 pl-6">
              <div className="font-display text-6xl text-sun sm:text-7xl">1M+</div>
              <p className="mt-2 text-sm text-white/45">
                Unique visitors across CyberHX events
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="how-it-works" className="border-y border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <h2 className={h2}>From idea to live event.</h2>

          <div className="mt-14 grid border-y border-white/[0.08] lg:grid-cols-4">
            {process.map((step, index) => (
              <div
                key={step.number}
                className={`p-7 lg:p-8 ${
                  index !== process.length - 1 ? "border-b border-white/[0.08] lg:border-b-0 lg:border-r" : ""
                }`}
              >
                <span className="font-display text-3xl text-lime-400">{step.number}</span>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/35">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUEST FORM */}
      <section id="get-started" className="scroll-mt-28 px-6 py-24 lg:px-8">
        <div className="sticker relative mx-auto mt-24 max-w-5xl">
          <Mascot
            pose="cheer"
            alt=""
            className="absolute -top-40 right-4 w-36 sm:-top-48 sm:right-10 sm:w-48"
          />

          <div className="relative px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl sm:text-6xl">
                Tell us about
                <br />
                <span className="text-white/30">your event.</span>
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/40 sm:text-base">
                Share a few details about your organization and competition. Our team will review the requirements
                and get back to you.
              </p>
            </div>

            <form onSubmit={handleHostSubmit} className="mt-12">
              {/* Selection summary */}
              <div className="mb-8 rounded-2xl border border-white/[0.09] bg-white/[0.02] p-5">
                <label className={labelCls}>
                  <Layers size={13} />
                  Your selection
                </label>
                <select
                  value={selection}
                  onChange={(e) => setSelection(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Not sure yet, help me choose</option>
                  <optgroup label="Plans">
                    {plans.map((p) => (
                      <option key={p.id} value={`${p.name} plan ($${p.usd})`}>
                        {p.name} plan, ${p.usd}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Pick and choose">
                    {pickAndChoose.map((p) => (
                      <option key={p.id} value={`${p.title} (${p.usd})`}>
                        {p.title}, {p.usd}
                      </option>
                    ))}
                  </optgroup>
                  {selection &&
                    ![...plans.map((p) => `${p.name} plan ($${p.usd})`), ...pickAndChoose.map((p) => `${p.title} (${p.usd})`)].includes(
                      selection
                    ) && <option value={selection}>{selection}</option>}
                </select>

                <div className="mt-4 flex flex-wrap gap-2">
                  {addOns.map((a) => {
                    const on = selectedAddOns.includes(a.title);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAddOn(a.title)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                          on
                            ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                            : "border-white/10 text-white/45 hover:border-white/25"
                        }`}
                      >
                        {on ? <Check size={12} /> : <Plus size={12} />}
                        {a.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Your name *</label>
                  <input name="name" value={hostForm.name} onChange={handleHostChange} required placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Work email *</label>
                  <input type="email" name="email" value={hostForm.email} onChange={handleHostChange} required placeholder="you@organization.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone number</label>
                  <input type="tel" name="phone" value={hostForm.phone} onChange={handleHostChange} placeholder="+91 98765 43210" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Organization *</label>
                  <input name="organization" value={hostForm.organization} onChange={handleHostChange} required placeholder="College, company or community" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    <Building2 size={13} />
                    Organization website *
                  </label>
                  <input type="url" name="organizationUrl" value={hostForm.organizationUrl} onChange={handleHostChange} required placeholder="https://example.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Event name *</label>
                  <input name="eventName" value={hostForm.eventName} onChange={handleHostChange} required placeholder="e.g. Cyber Security CTF 2027" className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>
                    <Palette size={13} />
                    Event theme / look you want
                  </label>
                  <input name="eventTheme" value={hostForm.eventTheme} onChange={handleHostChange} placeholder="e.g. space heist, cyberpunk city, retro hacker terminal" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    <Monitor size={13} />
                    Event format *
                  </label>
                  <select name="eventFormat" value={hostForm.eventFormat} onChange={handleHostChange} required className={selectCls}>
                    <option value="">Select format</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    <CalendarDays size={13} />
                    Tentative event date
                  </label>
                  <input type="date" name="eventDate" value={hostForm.eventDate} onChange={handleHostChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Expected participants</label>
                  <select name="participants" value={hostForm.participants} onChange={handleHostChange} className={selectCls}>
                    <option value="">Select expected scale</option>
                    <option value="under-100">Under 100</option>
                    <option value="100-500">100 – 500</option>
                    <option value="500-1000">500 – 1,000</option>
                    <option value="1000-5000">1,000 – 5,000</option>
                    <option value="5000-plus">5,000+</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    <Wallet size={13} />
                    Organization budget
                  </label>
                  <select name="budget" value={hostForm.budget} onChange={handleHostChange} className={selectCls}>
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
                <label className={labelCls}>
                  <MessageSquare size={13} />
                  What do you need from CyberHX? *
                </label>
                <textarea
                  name="requirements"
                  value={hostForm.requirements}
                  onChange={handleHostChange}
                  required
                  rows={5}
                  placeholder="Challenge categories, event length, custom challenges, website look, certificates, promotion, technical support, etc."
                  className={`${inputCls} resize-none leading-6`}
                />
              </div>

              <div className="mt-6">
                <label className={labelCls}>Anything else we should know?</label>
                <textarea
                  name="message"
                  value={hostForm.message}
                  onChange={handleHostChange}
                  rows={4}
                  placeholder="Timeline, special requirements, sponsorship details, or any other context."
                  className={`${inputCls} resize-none leading-6`}
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
                  No payment is taken here. We review your request, confirm the details and share the next steps.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-lime-400 px-7 py-4 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? "Submitting..." : "Send Event Request"}
                  {!isSubmitting && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
