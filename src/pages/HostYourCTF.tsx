import React from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, RotateCcw, X } from "lucide-react";
import { SiteIcon, type IconName } from "../components/shared/SiteIcon";
import { Mascot } from "../components/shared/Mascot";
import { plans, builderCategories, builderPricing, type Tier } from "../data/hosting";

/* =============================================================
   HOST YOUR CTF — build your CTF like a PC.
   Prices live in src/data/hosting.ts (builderCategories, builderPricing).
   Checkout places the order via Web3Forms; payment is collected
   afterwards with a link sent to the buyer.
============================================================= */

const P = builderPricing;
const key = (cat: string, tier: Tier) => `${cat}:${tier}`;

const tierStyle: Record<Tier, string> = {
  easy: "text-lime border-lime/40 bg-lime/10",
  medium: "text-glow border-glow/40 bg-glow/10",
  hard: "text-sun border-sun/40 bg-sun/10",
  insane: "text-red-400 border-red-400/40 bg-red-400/10",
};
const tierBar: Record<Tier, string> = {
  easy: "bg-lime",
  medium: "bg-glow",
  hard: "bg-sun",
  insane: "bg-red-400",
};

type Build = { qty: Record<string, number>; hours: number; website3d: boolean; custom: boolean };
const emptyBuild: Build = { qty: {}, hours: P.hosting.hours, website3d: false, custom: false };

const presets: { id: string; name: string; who: string; build: Build }[] = [
  {
    id: "campus",
    name: "Campus starter",
    who: "First CTF for a college club",
    build: {
      ...emptyBuild,
      qty: { "web:medium": 5, "osint:medium": 3, "crypto:medium": 3, "steg:easy": 3, "mobile:easy": 2 },
    },
  },
  {
    id: "competitive",
    name: "Competitive",
    who: "Fest CTF with a real leaderboard fight",
    build: {
      ...emptyBuild,
      qty: {
        "web:medium": 8,
        "osint:medium": 4,
        "crypto:medium": 3,
        "crypto:hard": 2,
        "reverse:hard": 3,
        "steg:hard": 2,
        "mobile:medium": 2,
        "boot2root:hard": 1,
      },
    },
  },
  {
    id: "hardcore",
    name: "Hardcore",
    who: "Experienced teams, 12-hour grind",
    build: {
      ...emptyBuild,
      hours: 12,
      qty: {
        "web:medium": 10,
        "crypto:hard": 4,
        "reverse:hard": 3,
        "reverse:insane": 3,
        "boot2root:hard": 3,
        "mobile:hard": 3,
        "osint:medium": 2,
      },
    },
  },
];

type Line = { label: string; usd: number | null; icon?: IconName };
type Order = { title: string; lines: Line[]; total: number; quoted: boolean };

const BUILD_KEY = "cyberhx-ctf-build";
const loadBuild = (): Build => {
  try {
    const raw = localStorage.getItem(BUILD_KEY);
    return raw ? { ...emptyBuild, ...(JSON.parse(raw) as Build) } : emptyBuild;
  } catch {
    return emptyBuild;
  }
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  eventName: "",
  eventDate: "",
  eventFormat: "",
  participants: "",
  eventTheme: "",
  message: "",
};

const dashboardFeatures: { icon: IconName; title: string; description: string }[] = [
  { icon: "gauge", title: "Live scoreboard", description: "Rankings update in real time as teams solve." },
  { icon: "hacker-team" as IconName, title: "Teams and players", description: "Registrations, teams and activity in one place." },
  { icon: "toolbox", title: "Challenge control", description: "Release, hide or review challenges during the event." },
  { icon: "podium", title: "Certificates", description: "Issue participation and winner certificates afterwards." },
];

const steps = [
  { n: "01", title: "Build it", text: "Pick challenge types, difficulty and event length." },
  { n: "02", title: "Check out", text: "Tell us your event name, date and theme." },
  { n: "03", title: "Pay and confirm", text: "We email a payment link and lock your date." },
  { n: "04", title: "Go live", text: "We build every challenge, you run it from the dashboard." },
];

const inputCls =
  "w-full rounded-lg border border-line bg-ink px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-lime";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";

function Stepper({
  value,
  onDec,
  onInc,
  label,
  decDisabled,
  incDisabled,
}: {
  value: number | string;
  onDec: () => void;
  onInc: () => void;
  label: string;
  decDisabled?: boolean;
  incDisabled?: boolean;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border-2 border-line">
      <button
        type="button"
        onClick={onDec}
        disabled={decDisabled}
        aria-label={`Fewer ${label}`}
        className="flex h-9 w-9 items-center justify-center text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-25"
      >
        <Minus size={15} />
      </button>
      <span className="w-10 text-center font-mono text-sm tabular-nums">{value}</span>
      <button
        type="button"
        onClick={onInc}
        disabled={incDisabled}
        aria-label={`More ${label}`}
        className="flex h-9 w-9 items-center justify-center text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-25"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

export default function HostYourCTF() {
  const [build, setBuild] = React.useState<Build>(loadBuild);
  const [order, setOrder] = React.useState<Order | null>(null);
  const [drawer, setDrawer] = React.useState<"closed" | "checkout" | "done">("closed");
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [orderId, setOrderId] = React.useState("");

  React.useEffect(() => {
    try {
      localStorage.setItem(BUILD_KEY, JSON.stringify(build));
    } catch {
      /* storage unavailable; the build still works for this visit */
    }
  }, [build]);

  React.useEffect(() => {
    document.body.style.overflow = drawer === "closed" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  /* ---------- build maths ---------- */
  const challengeLines = builderCategories.flatMap((c) =>
    c.tiers
      .map((t) => ({ cat: c, ...t, n: build.qty[key(c.id, t.tier)] ?? 0 }))
      .filter((l) => l.n > 0)
  );
  const challengeCount = challengeLines.reduce((s, l) => s + l.n, 0);
  const challengeUsd = challengeLines.reduce((s, l) => s + l.n * l.usd, 0);
  const extraHours = build.hours - P.hosting.hours;
  const hoursUsd = extraHours * P.extraHourUsd;
  const total = P.hosting.usd + hoursUsd + challengeUsd + (build.website3d ? P.website3dUsd : 0);
  const categoriesUsed = new Set(challengeLines.map((l) => l.cat.id)).size;

  const tierCounts = (["easy", "medium", "hard", "insane"] as Tier[]).map((t) => ({
    tier: t,
    n: challengeLines.filter((l) => l.tier === t).reduce((s, l) => s + l.n, 0),
  }));

  const setQty = (id: string, tier: Tier, next: number) =>
    setBuild((b) => ({ ...b, qty: { ...b.qty, [key(id, tier)]: Math.max(0, Math.min(50, next)) } }));

  const inc = (id: string, tier: Tier, min = 1) => {
    const cur = build.qty[key(id, tier)] ?? 0;
    setQty(id, tier, cur === 0 ? min : cur + 1);
  };
  const dec = (id: string, tier: Tier, min = 1) => {
    const cur = build.qty[key(id, tier)] ?? 0;
    setQty(id, tier, cur <= min ? 0 : cur - 1);
  };

  const buildOrder = (): Order => ({
    title: "Custom CTF build",
    lines: [
      { label: `Hosting + scoreboard (${P.hosting.hours}h)`, usd: P.hosting.usd, icon: "cloud" },
      ...(extraHours > 0 ? [{ label: `Extra hours × ${extraHours}`, usd: hoursUsd, icon: "gauge" as IconName }] : []),
      ...challengeLines.map((l) => ({
        label: `${l.cat.name} · ${l.tier} × ${l.n}`,
        usd: l.n * l.usd,
        icon: l.cat.icon,
      })),
      ...(build.website3d ? [{ label: "3D event website", usd: P.website3dUsd, icon: "code-light" as IconName }] : []),
      ...(build.custom ? [{ label: "Custom challenges", usd: null, icon: "swords" as IconName }] : []),
    ],
    total,
    quoted: build.custom,
  });

  const checkoutBuild = () => {
    setOrder(buildOrder());
    setError(false);
    setDrawer("checkout");
  };
  const checkoutPlan = (id: string) => {
    const p = plans.find((x) => x.id === id);
    if (!p) return;
    setOrder({
      title: `${p.name} prebuilt`,
      lines: [{ label: `${p.name} prebuilt CTF`, usd: p.usd, icon: p.icon }],
      total: p.usd,
      quoted: false,
    });
    setError(false);
    setDrawer("checkout");
  };

  const onField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSubmitting(true);
    setError(false);
    const id = `CHX-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const lines = order.lines.map((l) => `${l.label}: ${l.usd === null ? "quote" : money(l.usd)}`).join("\n");
    const totalText = money(order.total) + (order.quoted ? " plus quoted custom challenges" : "");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "ae826816-f65e-4d6f-8491-3362df582e13",
          subject: `New CTF order ${id}: ${form.eventName} (${totalText})`,
          order_id: id,
          order_type: order.title,
          order_items: lines,
          order_total_usd: totalText,
          ...form,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("failed");
      setOrderId(id);
      setForm(emptyForm);
      if (order.title === "Custom CTF build") setBuild(emptyBuild);
      setDrawer("done");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const h2 = "font-display text-3xl sm:text-4xl";

  /* ---------- summary (desktop sidebar) ---------- */
  const summary = (
    <div className="sticker overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-line px-5 py-4">
        <h3 className="font-display text-lg">Your build</h3>
        <button
          type="button"
          onClick={() => setBuild(emptyBuild)}
          className="flex items-center gap-1.5 text-xs text-muted transition hover:text-white"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x-2 divide-line border-b-2 border-line text-center">
        {[
          [challengeCount, "challenges"],
          [categoriesUsed, "categories"],
          [`${build.hours}h`, "event"],
        ].map(([v, l]) => (
          <div key={String(l)} className="px-2 py-3">
            <div className="font-display text-xl">{v}</div>
            <div className="text-[11px] text-muted">{l}</div>
          </div>
        ))}
      </div>

      {/* Difficulty mix */}
      <div className="border-b-2 border-line px-5 py-4">
        <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wider text-muted">
          <span>Difficulty mix</span>
          {challengeCount > 0 && <span className="normal-case tracking-normal">{challengeCount} total</span>}
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
          {challengeCount > 0 &&
            tierCounts
              .filter((t) => t.n > 0)
              .map((t) => (
                <div key={t.tier} className={tierBar[t.tier]} style={{ width: `${(t.n / challengeCount) * 100}%` }} />
              ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {tierCounts.map((t) => (
            <span key={t.tier} className={`flex items-center gap-1.5 text-[11px] ${t.n ? "text-white/80" : "text-white/25"}`}>
              <span className={`h-2 w-2 rounded-full ${tierBar[t.tier]}`} />
              {t.tier} {t.n}
            </span>
          ))}
        </div>
      </div>

      <ul className="max-h-[38vh] space-y-2 overflow-y-auto px-5 py-4 text-sm">
        <li className="flex justify-between gap-3">
          <span className="text-white/85">Hosting + scoreboard ({P.hosting.hours}h)</span>
          <span className="font-mono text-muted">{money(P.hosting.usd)}</span>
        </li>
        {extraHours > 0 && (
          <li className="flex justify-between gap-3">
            <span className="text-white/85">Extra hours × {extraHours}</span>
            <span className="font-mono text-muted">{money(hoursUsd)}</span>
          </li>
        )}
        {challengeLines.map((l) => (
          <li key={key(l.cat.id, l.tier)} className="flex justify-between gap-3">
            <span className="text-white/85">
              {l.cat.name} <span className="text-muted">· {l.tier} × {l.n}</span>
            </span>
            <span className="font-mono text-muted">{money(l.n * l.usd)}</span>
          </li>
        ))}
        {build.website3d && (
          <li className="flex justify-between gap-3">
            <span className="text-white/85">3D event website</span>
            <span className="font-mono text-muted">{money(P.website3dUsd)}</span>
          </li>
        )}
        {build.custom && (
          <li className="flex justify-between gap-3">
            <span className="text-white/85">Custom challenges</span>
            <span className="font-mono text-muted">Quote</span>
          </li>
        )}
        {challengeCount === 0 && (
          <li className="rounded-lg border-2 border-dashed border-line p-3 text-center text-xs text-muted">
            Add challenges from the list, or start from a quick build.
          </li>
        )}
      </ul>

      <div className="border-t-2 border-line px-5 py-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Total</span>
          <span className="font-display text-3xl text-lime">
            {money(total)}
            {build.custom && <span className="text-base text-muted"> +</span>}
          </span>
        </div>
        <p className="mt-0.5 text-right text-xs text-muted">about ₹{(total * 100).toLocaleString("en-IN")}</p>
        <button type="button" onClick={checkoutBuild} className="btn btn-lime mt-4 w-full">
          Check out this build <ArrowRight size={16} />
        </button>
        <p className="mt-2.5 text-center text-[11px] text-muted">No payment now. We email a payment link.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-ink pb-24 pt-16 text-white sm:pt-[72px] lg:pb-0">
      {/* Store bar */}
      <div className="sticky top-16 z-40 border-b border-line bg-ink/90 backdrop-blur sm:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2.5 sm:px-6 lg:px-8">
          <nav className="hide-scrollbar flex items-center gap-1 overflow-x-auto">
            {[
              ["#build", "Builder"],
              ["#prebuilt", "Prebuilt"],
              ["#how-it-works", "How it works"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-white/[0.05] hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            href="#build"
            className="flex shrink-0 items-center gap-2 rounded-lg border-2 border-lime px-3.5 py-1.5 text-sm font-semibold text-lime transition hover:bg-lime hover:text-ink"
          >
            Build <span className="font-mono">{money(total)}</span>
          </a>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-14 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">CyberHx CTF builder</p>
            <h1 className="font-display mt-4 text-[2.4rem] leading-[1.02] sm:text-5xl lg:text-6xl">
              Build your CTF
              <span className="block text-white/35">part by part.</span>
            </h1>
            <p className="mt-6 max-w-lg leading-7 text-muted">
              Like building a PC: pick the challenge types you want, choose how hard, set the event length. Hosting
              and the live scoreboard come with every build from {money(P.hosting.usd)}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#build" className="btn btn-lime">
                Start building
              </a>
              <a href="#prebuilt" className="btn btn-ghost">
                See prebuilt CTFs
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xs">
            <div className="absolute inset-x-4 bottom-0 top-14 rounded-3xl border-2 border-line bg-panel" />
            <Mascot pose="thumbs" alt="CyberHx mascot giving a thumbs up" eager className="mascot-pop relative mx-auto w-60 lg:w-64" />
          </div>
        </div>
      </section>

      {/* Builder */}
      <section id="build" className="scroll-mt-32 border-t border-line bg-panel/30">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">
          {/* Quick builds */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className={h2}>Pick your parts</h2>
              <p className="mt-2 text-sm text-muted">Prices are per challenge. Or load a quick build and tweak it.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setBuild(p.build)}
                className="group rounded-xl border-2 border-line bg-ink p-4 text-left transition hover:border-lime"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs font-semibold text-lime opacity-0 transition group-hover:opacity-100">Load</span>
                </div>
                <p className="mt-1 text-xs text-muted">{p.who}</p>
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {/* 01 Hosting — always on */}
              <div className="rounded-2xl border-2 border-lime/50 bg-ink p-5">
                <div className="flex items-start gap-4">
                  <SiteIcon name="cloud" size={52} alt="" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted">01</span>
                      <h3 className="font-semibold">Hosting + live scoreboard</h3>
                      <span className="rounded bg-lime px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                        Included
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Platform, scoreboard and host dashboard for {P.hosting.hours} hours. Every build needs it.
                    </p>
                  </div>
                  <span className="font-display text-xl">{money(P.hosting.usd)}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:pl-[68px]">
                  <div>
                    <p className="text-sm font-semibold">Event length</p>
                    <p className="text-xs text-muted">
                      Extra hours {money(P.extraHourUsd)} each, up to {P.maxHours}h
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {extraHours > 0 && <span className="font-mono text-sm text-sun">+{money(hoursUsd)}</span>}
                    <Stepper
                      value={`${build.hours}h`}
                      label="hours"
                      onDec={() => setBuild((b) => ({ ...b, hours: Math.max(P.hosting.hours, b.hours - 1) }))}
                      onInc={() => setBuild((b) => ({ ...b, hours: Math.min(P.maxHours, b.hours + 1) }))}
                      decDisabled={build.hours <= P.hosting.hours}
                      incDisabled={build.hours >= P.maxHours}
                    />
                  </div>
                </div>
              </div>

              {/* Challenge categories */}
              {builderCategories.map((c, i) => {
                const catCount = c.tiers.reduce((s, t) => s + (build.qty[key(c.id, t.tier)] ?? 0), 0);
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border-2 bg-ink p-5 transition ${catCount > 0 ? "border-glow/50" : "border-line"}`}
                  >
                    <div className="flex items-start gap-4">
                      <SiteIcon name={c.icon} size={52} alt="" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted">{String(i + 2).padStart(2, "0")}</span>
                          <h3 className="font-semibold">{c.name}</h3>
                          {c.min && (
                            <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                              Min {c.min}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted">{c.blurb}</p>
                      </div>
                      {catCount > 0 && (
                        <span className="rounded-md bg-glow/15 px-2 py-1 font-mono text-xs text-glow">{catCount}</span>
                      )}
                    </div>
                    <div className="mt-4 space-y-2.5 border-t border-line pt-4 sm:pl-[68px]">
                      {c.tiers.map((t) => {
                        const n = build.qty[key(c.id, t.tier)] ?? 0;
                        return (
                          <div key={t.tier} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-16 rounded-md border py-1 text-center text-[11px] font-bold uppercase tracking-wider ${tierStyle[t.tier]}`}
                              >
                                {t.tier}
                              </span>
                              <span className="text-sm text-white/85">
                                {money(t.usd)} <span className="text-muted">each</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {n > 0 && <span className="hidden font-mono text-sm text-muted sm:inline">{money(n * t.usd)}</span>}
                              <Stepper
                                value={n}
                                label={`${t.tier} ${c.name} challenges`}
                                onDec={() => dec(c.id, t.tier, c.min)}
                                onInc={() => inc(c.id, t.tier, c.min)}
                                decDisabled={n === 0}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Extras */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    on: build.website3d,
                    flip: () => setBuild((b) => ({ ...b, website3d: !b.website3d })),
                    icon: "code-light" as IconName,
                    title: "3D event website",
                    text: "A themed 3D landing site made for your event.",
                    price: money(P.website3dUsd),
                  },
                  {
                    on: build.custom,
                    flip: () => setBuild((b) => ({ ...b, custom: !b.custom })),
                    icon: "swords" as IconName,
                    title: "Custom challenges",
                    text: "Built around your story or brand. Tell us at checkout.",
                    price: "Quote",
                  },
                ].map((x) => (
                  <button
                    key={x.title}
                    type="button"
                    onClick={x.flip}
                    aria-pressed={x.on}
                    className={`flex items-start gap-4 rounded-2xl border-2 bg-ink p-5 text-left transition ${
                      x.on ? "border-lime bg-lime/[0.05]" : "border-line hover:border-white/30"
                    }`}
                  >
                    <SiteIcon name={x.icon} size={48} alt="" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{x.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">{x.text}</p>
                      <p className="mt-2 font-display text-lg text-sun">{x.price}</p>
                    </div>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${
                        x.on ? "border-lime bg-lime text-ink" : "border-line text-white/50"
                      }`}
                    >
                      {x.on ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <aside className="hidden lg:block">
              <div className="sticky top-[140px]">{summary}</div>
            </aside>
          </div>
        </div>
      </section>

      {/* Prebuilt */}
      <section id="prebuilt" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-20 sm:px-6 lg:px-8">
        <h2 className={h2}>Or grab a prebuilt</h2>
        <p className="mt-2 text-sm text-muted">Ready-made CTFs with hosting included. One click to checkout.</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`sticker relative flex flex-col p-6 ${plan.featured ? "sticker-lime" : ""}`}>
              {plan.featured && (
                <span className="absolute -top-3 left-6 rounded-md bg-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                  Most picked
                </span>
              )}
              <div className="flex items-start justify-between">
                <SiteIcon name={plan.icon} size={60} alt="" />
                <div className="text-right">
                  <div className={`font-display text-4xl ${plan.featured ? "text-lime" : "text-white"}`}>${plan.usd}</div>
                  <div className="text-xs text-muted">about {plan.inr}</div>
                </div>
              </div>
              <h3 className="font-display mt-4 text-xl">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{plan.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/85">
                    <Check size={15} className="mt-0.5 shrink-0 text-lime" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => checkoutPlan(plan.id)}
                className={`btn mt-6 w-full ${plan.featured ? "btn-lime" : "btn-ghost"}`}
              >
                Buy {plan.name}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Dashboard */}
      <section className="border-y border-line bg-panel/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
          <div>
            <SiteIcon name="windows" size={64} alt="" />
            <h2 className={`${h2} mt-4`}>Every build comes with a host dashboard.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Watch the board, manage teams and send certificates from one screen.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardFeatures.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border-2 border-line bg-ink p-5">
                <SiteIcon name={f.icon} size={44} alt="" />
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-20 sm:px-6 lg:px-8">
        <h2 className={h2}>How buying works</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="bg-ink p-6">
              <span className="font-mono text-sm text-lime">{s.n}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted">
          Need something else?{" "}
          <a href="/contact" className="font-semibold text-lime underline-offset-4 hover:underline">
            Talk to us first
          </a>
          .
        </p>
      </section>

      {/* Mobile build bar */}
      {drawer === "closed" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-ink/95 p-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-display text-xl text-lime">
                {money(total)}
                {build.custom && <span className="text-sm text-muted"> +</span>}
              </div>
              <div className="text-[11px] text-muted">
                {challengeCount} challenges · {build.hours}h hosting
              </div>
            </div>
            <button type="button" onClick={checkoutBuild} className="btn btn-lime">
              Check out <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Checkout drawer */}
      {drawer !== "closed" && order && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Checkout">
          <div className="absolute inset-0 bg-black/70" onClick={() => !submitting && setDrawer("closed")} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l-2 border-line bg-ink">
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                {drawer === "checkout" && (
                  <button
                    type="button"
                    onClick={() => setDrawer("closed")}
                    className="rounded p-1 text-muted hover:text-white"
                    aria-label="Back to builder"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 className="font-display text-lg">{drawer === "checkout" ? "Checkout" : "Order placed"}</h2>
              </div>
              <button type="button" onClick={() => setDrawer("closed")} className="rounded p-1 text-muted hover:text-white" aria-label="Close">
                <X size={20} />
              </button>
            </header>

            {drawer === "checkout" && (
              <form onSubmit={placeOrder} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  <div className="rounded-xl border-2 border-line p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{order.title}</p>
                    {order.lines.map((l) => (
                      <div key={l.label} className="flex items-center gap-2.5 py-1 text-sm">
                        {l.icon && <SiteIcon name={l.icon} size={22} alt="" />}
                        <span className="flex-1 text-white/85">{l.label}</span>
                        <span className="font-mono text-muted">{l.usd === null ? "Quote" : money(l.usd)}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
                      <span>Total</span>
                      <span className="font-mono text-lime">
                        {money(order.total)}
                        {order.quoted ? " +" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Your name *</label>
                      <input name="name" required value={form.name} onChange={onField} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Email *</label>
                      <input type="email" name="email" required value={form.email} onChange={onField} placeholder="you@college.edu" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone *</label>
                      <input type="tel" name="phone" required value={form.phone} onChange={onField} placeholder="+91" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Organization *</label>
                      <input name="organization" required value={form.organization} onChange={onField} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Event name *</label>
                      <input name="eventName" required value={form.eventName} onChange={onField} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Event date</label>
                      <input type="date" name="eventDate" value={form.eventDate} onChange={onField} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Format *</label>
                      <select name="eventFormat" required value={form.eventFormat} onChange={onField} className={inputCls}>
                        <option value="">Select</option>
                        <option>Online</option>
                        <option>Offline</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Expected players</label>
                      <select name="participants" value={form.participants} onChange={onField} className={inputCls}>
                        <option value="">Select</option>
                        <option>Under 100</option>
                        <option>100 to 500</option>
                        <option>500 to 1,000</option>
                        <option>1,000+</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Theme or look</label>
                      <input name="eventTheme" value={form.eventTheme} onChange={onField} placeholder="Space heist, cyberpunk, retro terminal" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>{order.quoted ? "Describe your custom challenges *" : "Notes"}</label>
                      <textarea
                        name="message"
                        rows={3}
                        required={order.quoted}
                        value={form.message}
                        onChange={onField}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                </div>
                <footer className="border-t border-line px-5 py-5">
                  {error && <p className="mb-3 text-sm text-red-300">Could not place the order. Try again or email us.</p>}
                  <button type="submit" disabled={submitting} className="btn btn-lime w-full disabled:opacity-60">
                    {submitting ? "Placing order..." : `Place order · ${money(order.total)}${order.quoted ? " +" : ""}`}
                  </button>
                  <p className="mt-2.5 text-center text-xs text-muted">
                    You won't be charged now. We confirm your date and email a secure payment link.
                  </p>
                </footer>
              </form>
            )}

            {drawer === "done" && (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <Mascot pose="trophy" alt="" className="w-40" />
                <h3 className="font-display mt-5 text-2xl">Your CTF is in the queue.</h3>
                <p className="mt-2 text-sm text-muted">
                  Order <span className="font-mono text-lime">{orderId}</span> is in. Check your email: we'll send the
                  payment link and confirm your event date within a day.
                </p>
                <button type="button" onClick={() => setDrawer("closed")} className="btn btn-ghost mt-6">
                  Back to the builder
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
