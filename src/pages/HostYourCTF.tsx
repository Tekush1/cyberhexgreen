import React from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Minus, Plus, RotateCcw, X } from "lucide-react";
import { SiteIcon, type IconName } from "../components/shared/SiteIcon";
import { Mascot } from "../components/shared/Mascot";
import { Local } from "../components/shared/Local";
import { currencyChoices, useLocalCurrency } from "../lib/currency";
import { plans, builderCategories, builderPricing, type Tier } from "../data/hosting";
import { Seo } from "../features/seo/Seo";
import { submitForm } from "../lib/forms";

/* =============================================================
   HOST YOUR CTF — build your CTF like a PC.
   Prices live in src/data/hosting.ts (builderCategories, builderPricing).
   A build is one round, or a qualifier plus a grand finale; each round
   has its own hosting, hours, player count and challenges.
   Checkout places the order via Web3Forms; payment is collected
   afterwards with a link sent to the buyer.
============================================================= */

const P = builderPricing;
const key = (cat: string, tier: Tier) => `${cat}:${tier}`;
const minFor = (catId: string) => builderCategories.find((c) => c.id === catId)?.min ?? 1;

const tierStyle: Record<Tier, string> = {
  easy: "text-lime border-lime/40 bg-lime/10",
  medium: "text-glow border-glow/40 bg-glow/10",
  hard: "text-sun border-sun/40 bg-sun/10",
  insane: "text-red-400 border-red-400/40 bg-red-400/10",
};
const tierBar: Record<Tier, string> = { easy: "bg-lime", medium: "bg-glow", hard: "bg-sun", insane: "bg-red-400" };
const TIERS: Tier[] = ["easy", "medium", "hard", "insane"];

type RoundId = "main" | "qualifier" | "finale";
type Round = { hours: number; players: number; qty: Record<string, number> };
type Build = {
  v: 2;
  format: "single" | "split";
  rounds: Record<RoundId, Round>;
  website3d: boolean;
  custom: boolean;
};

const roundName: Record<RoundId, string> = { main: "Your CTF", qualifier: "Qualifier", finale: "Grand finale" };
const freshRound = (): Round => ({ hours: P.hosting.hours, players: P.hosting.players, qty: {} });
const emptyBuild = (): Build => ({
  v: 2,
  format: "single",
  rounds: { main: freshRound(), qualifier: freshRound(), finale: freshRound() },
  website3d: false,
  custom: false,
});

/* ---------- pricing ---------- */
const extraHoursOf = (r: Round) => Math.max(0, r.hours - P.hosting.hours);
const extraBlocksOf = (r: Round) => Math.max(0, Math.ceil(r.players / P.playerBlock) - 1);
const challengeLinesOf = (r: Round) =>
  builderCategories.flatMap((c) =>
    c.tiers.map((t) => ({ cat: c, ...t, n: r.qty[key(c.id, t.tier)] ?? 0 })).filter((l) => l.n > 0)
  );
const roundTotal = (r: Round) =>
  P.hosting.usd +
  extraHoursOf(r) * P.extraHourUsd +
  extraBlocksOf(r) * P.extraPlayersUsd +
  challengeLinesOf(r).reduce((s, l) => s + l.n * l.usd, 0);
const roundCount = (r: Round) => challengeLinesOf(r).reduce((s, l) => s + l.n, 0);

/* ---------- presets (single round) ---------- */
const preset = (qty: Record<string, number>, hours = P.hosting.hours, players = P.hosting.players): Build => {
  const b = emptyBuild();
  b.rounds.main = { hours, players, qty };
  return b;
};
const presets: { id: string; name: string; who: string; build: () => Build }[] = [
  {
    id: "campus",
    name: "Campus starter",
    who: "First CTF for a college club",
    build: () => preset({ "web:medium": 5, "osint:medium": 3, "crypto:medium": 3, "steg:easy": 3, "mobile:easy": 2 }),
  },
  {
    id: "competitive",
    name: "Competitive",
    who: "Fest CTF with a real leaderboard fight",
    build: () =>
      preset(
        {
          "web:medium": 8, "osint:medium": 4, "crypto:medium": 3, "crypto:hard": 2,
          "reverse:hard": 3, "steg:hard": 2, "mobile:medium": 2, "boot2root:hard": 1,
        },
        12,
        2000
      ),
  },
  {
    id: "national",
    name: "Qualifier + finale",
    who: "Open qualifier, top teams in the final",
    build: () => {
      const b = emptyBuild();
      b.format = "split";
      b.rounds.qualifier = {
        hours: 24,
        players: 5000,
        qty: { "web:medium": 6, "osint:medium": 4, "crypto:medium": 4, "steg:easy": 3, "mobile:easy": 3, "reverse:hard": 2 },
      };
      b.rounds.finale = {
        hours: 8,
        players: 1000,
        qty: { "web:medium": 5, "crypto:hard": 3, "reverse:insane": 2, "boot2root:hard": 2, "mobile:hard": 2 },
      };
      return b;
    },
  },
];

type Line = { label: string; usd: number | null; icon?: IconName };
type Order = { title: string; lines: Line[]; total: number; quoted: boolean };

const BUILD_KEY = "cyberhx-ctf-build-v2";
const clampRound = (r: Partial<Round> | undefined): Round => {
  const base = freshRound();
  if (!r) return base;
  const hours = Number(r.hours);
  const players = Number(r.players);
  const qty: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.qty ?? {})) {
    const n = Math.floor(Number(v));
    const [cat] = k.split(":");
    if (!Number.isFinite(n) || n <= 0 || !builderCategories.some((c) => c.id === cat)) continue;
    qty[k] = Math.min(P.maxPerTier, Math.max(minFor(cat), n));
  }
  return {
    hours: Number.isFinite(hours) ? Math.min(P.maxHours, Math.max(P.hosting.hours, hours)) : base.hours,
    players: Number.isFinite(players)
      ? Math.min(P.maxPlayers, Math.max(P.playerBlock, Math.ceil(players / P.playerBlock) * P.playerBlock))
      : base.players,
    qty,
  };
};
const loadBuild = (): Build => {
  try {
    const raw = localStorage.getItem(BUILD_KEY);
    if (!raw) return emptyBuild();
    const b = JSON.parse(raw) as Partial<Build>;
    if (b.v !== 2) return emptyBuild();
    return {
      v: 2,
      format: b.format === "split" ? "split" : "single",
      rounds: {
        main: clampRound(b.rounds?.main),
        qualifier: clampRound(b.rounds?.qualifier),
        finale: clampRound(b.rounds?.finale),
      },
      website3d: !!b.website3d,
      custom: !!b.custom,
    };
  } catch {
    return emptyBuild();
  }
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const players = (n: number) => n.toLocaleString("en-US");

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
  { n: "01", title: "Build it", text: "Pick rounds, challenge types, difficulty, hours and players." },
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
  wide,
}: {
  value: number | string;
  onDec: () => void;
  onInc: () => void;
  label: string;
  decDisabled?: boolean;
  incDisabled?: boolean;
  wide?: boolean;
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
      <span className={`${wide ? "w-16" : "w-10"} text-center font-mono text-sm tabular-nums`}>{value}</span>
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
  const [active, setActive] = React.useState<RoundId>(() => (loadBuild().format === "split" ? "qualifier" : "main"));
  const [order, setOrder] = React.useState<Order | null>(null);
  const [drawer, setDrawer] = React.useState<"closed" | "checkout" | "done">("closed");
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [orderId, setOrderId] = React.useState("");
  const currency = useLocalCurrency();

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

  /* ---------- derived ---------- */
  const roundIds: RoundId[] = build.format === "split" ? ["qualifier", "finale"] : ["main"];
  const editing: RoundId = build.format === "split" ? (active === "main" ? "qualifier" : active) : "main";
  const round = build.rounds[editing];

  const total =
    roundIds.reduce((s, id) => s + roundTotal(build.rounds[id]), 0) + (build.website3d ? P.website3dUsd : 0);
  const allLines = roundIds.flatMap((id) => challengeLinesOf(build.rounds[id]));
  const challengeCount = allLines.reduce((s, l) => s + l.n, 0);
  const categoriesUsed = new Set(allLines.map((l) => l.cat.id)).size;
  const totalHours = roundIds.reduce((s, id) => s + build.rounds[id].hours, 0);
  const tierCounts = TIERS.map((t) => ({
    tier: t,
    n: allLines.filter((l) => l.tier === t).reduce((s, l) => s + l.n, 0),
  }));

  /* ---------- edits (always on the round being edited) ---------- */
  const patchRound = (fn: (r: Round) => Round) =>
    setBuild((b) => ({ ...b, rounds: { ...b.rounds, [editing]: fn(b.rounds[editing]) } }));

  const setQty = (catId: string, tier: Tier, next: number) =>
    patchRound((r) => {
      const qty = { ...r.qty };
      const n = Math.max(0, Math.min(P.maxPerTier, next));
      if (n === 0) delete qty[key(catId, tier)];
      else qty[key(catId, tier)] = n;
      return { ...r, qty };
    });
  const inc = (catId: string, tier: Tier) => {
    const cur = round.qty[key(catId, tier)] ?? 0;
    setQty(catId, tier, cur === 0 ? minFor(catId) : cur + 1);
  };
  const dec = (catId: string, tier: Tier) => {
    const cur = round.qty[key(catId, tier)] ?? 0;
    setQty(catId, tier, cur <= minFor(catId) ? 0 : cur - 1);
  };

  const setFormat = (format: Build["format"]) => {
    setBuild((b) => {
      if (b.format === format) return b;
      const rounds = { ...b.rounds };
      // Carry the current build across so nothing is lost when switching.
      if (format === "split" && roundCount(rounds.qualifier) === 0 && roundCount(rounds.finale) === 0) {
        rounds.qualifier = { ...rounds.main, qty: { ...rounds.main.qty } };
      }
      if (format === "single" && roundCount(rounds.main) === 0) {
        rounds.main = { ...rounds.qualifier, qty: { ...rounds.qualifier.qty } };
      }
      return { ...b, format, rounds };
    });
    setActive(format === "split" ? "qualifier" : "main");
  };

  const copyQualifierToFinale = () =>
    setBuild((b) => ({ ...b, rounds: { ...b.rounds, finale: { ...b.rounds.finale, qty: { ...b.rounds.qualifier.qty } } } }));

  const loadPreset = (fn: () => Build) => {
    const b = fn();
    setBuild(b);
    setActive(b.format === "split" ? "qualifier" : "main");
  };

  const reset = () => {
    setBuild(emptyBuild());
    setActive("main");
  };

  /* ---------- orders ---------- */
  const roundLines = (id: RoundId): Line[] => {
    const r = build.rounds[id];
    const pre = build.format === "split" ? `${roundName[id]}: ` : "";
    const xh = extraHoursOf(r);
    const xb = extraBlocksOf(r);
    return [
      { label: `${pre}Hosting + scoreboard (${P.hosting.hours}h, up to ${players(P.hosting.players)} players)`, usd: P.hosting.usd, icon: "cloud" },
      ...(xh > 0 ? [{ label: `${pre}Extra hours × ${xh} (${r.hours}h total)`, usd: xh * P.extraHourUsd, icon: "gauge" as IconName }] : []),
      ...(xb > 0
        ? [{ label: `${pre}Extra players: ${players(xb * P.playerBlock)} (${players(r.players)} total)`, usd: xb * P.extraPlayersUsd, icon: "hacker-team" as IconName }]
        : []),
      ...challengeLinesOf(r).map((l) => ({ label: `${pre}${l.cat.name} · ${l.tier} × ${l.n}`, usd: l.n * l.usd, icon: l.cat.icon })),
    ];
  };

  const checkoutBuild = () => {
    setOrder({
      title: build.format === "split" ? "Custom CTF build: qualifier + grand finale" : "Custom CTF build",
      lines: [
        ...roundIds.flatMap(roundLines),
        ...(build.website3d ? [{ label: "3D event website", usd: P.website3dUsd, icon: "code-light" as IconName }] : []),
        ...(build.custom ? [{ label: "Custom challenges", usd: null, icon: "swords" as IconName }] : []),
      ],
      total,
      quoted: build.custom,
    });
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
    const local = currency.fmt(order.total);
    const totalText =
      money(order.total) + (order.quoted ? " plus quoted custom challenges" : "") + (local ? ` (≈ ${local})` : "");
    try {
      // Emails the team AND saves the order to Supabase (Admin → CTF Requests).
      const result = await submitForm({
        subject: `New CTF order ${id}: ${form.eventName} (${totalText})`,
        table: "ctf_requests",
        replyTo: form.email,
        row: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          organization: form.organization,
          event_name: form.eventName,
          event_format: form.eventFormat,
          event_date: form.eventDate,
          participants: form.participants,
          requirements: `${order.title}\n${lines}`,
          message: [form.eventTheme && `Theme: ${form.eventTheme}`, form.message].filter(Boolean).join("\n\n"),
          order_id: id,
          order_total: totalText,
          order_items: lines,
        },
        email: {
          order_id: id,
          order_type: order.title,
          order_items: lines,
          order_total_usd: totalText,
          visitor_currency: currency.code,
          ...form,
        },
      });
      if (!result.ok) throw new Error("failed");
      setOrderId(id);
      setForm(emptyForm);
      if (order.title.startsWith("Custom CTF build")) reset();
      setDrawer("done");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const h2 = "font-display text-3xl sm:text-4xl";

  /* ---------- summary ---------- */
  const summary = (
    <div className="sticker overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-line px-5 py-4">
        <h3 className="font-display text-lg">Your build</h3>
        <button type="button" onClick={reset} className="flex items-center gap-1.5 text-xs text-muted transition hover:text-white">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x-2 divide-line border-b-2 border-line text-center">
        {[
          [challengeCount, "challenges"],
          [categoriesUsed, "categories"],
          [`${totalHours}h`, build.format === "split" ? "2 rounds" : "event"],
        ].map(([v, l]) => (
          <div key={String(l)} className="px-2 py-3">
            <div className="font-display text-xl">{v}</div>
            <div className="text-[11px] text-muted">{l}</div>
          </div>
        ))}
      </div>

      <div className="border-b-2 border-line px-5 py-4">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">Difficulty mix</div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
          {challengeCount > 0 &&
            tierCounts
              .filter((t) => t.n > 0)
              .map((t) => (
                <div key={t.tier} className={`${tierBar[t.tier]} transition-all duration-500`} style={{ width: `${(t.n / challengeCount) * 100}%` }} />
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

      <div className="max-h-[40vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
        {roundIds.map((id) => {
          const r = build.rounds[id];
          const n = roundCount(r);
          return (
            <div key={id}>
              {build.format === "split" && (
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-semibold text-white">{roundName[id]}</span>
                  <span className="font-mono text-xs text-glow">{money(roundTotal(r))}</span>
                </div>
              )}
              <ul className="space-y-1.5">
                {roundLines(id).map((l) => (
                  <li key={l.label} className="flex justify-between gap-3">
                    <span className="text-white/80">{l.label.replace(`${roundName[id]}: `, "")}</span>
                    <span className="shrink-0 font-mono text-muted">{l.usd === null ? "Quote" : money(l.usd)}</span>
                  </li>
                ))}
              </ul>
              {n === 0 && (
                <p className="mt-2 rounded-lg border-2 border-dashed border-line p-2.5 text-center text-xs text-muted">
                  No challenges yet. Add some, or keep it hosting only if you bring your own.
                </p>
              )}
            </div>
          );
        })}
        {(build.website3d || build.custom) && (
          <ul className="space-y-1.5 border-t border-line pt-3">
            {build.website3d && (
              <li className="flex justify-between gap-3">
                <span className="text-white/80">3D event website</span>
                <span className="font-mono text-muted">{money(P.website3dUsd)}</span>
              </li>
            )}
            {build.custom && (
              <li className="flex justify-between gap-3">
                <span className="text-white/80">Custom challenges</span>
                <span className="font-mono text-muted">Quote</span>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="border-t-2 border-line px-5 py-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Total</span>
          <span className="font-display text-3xl text-lime">
            {money(total)}
            {build.custom && <span className="text-base text-muted"> +</span>}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-muted">
            Show in
            <select
              value={currency.code}
              onChange={(e) => currency.setCurrency(e.target.value)}
              className="rounded border border-line bg-ink px-1.5 py-0.5 text-white outline-none focus:border-lime"
              aria-label="Currency for price equivalents"
            >
              {[...new Set([currency.code, ...currencyChoices])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Local usd={total} className="font-semibold text-white/85" />
        </div>
        <button type="button" onClick={checkoutBuild} className="btn btn-lime mt-4 w-full">
          Check out this build <ArrowRight size={16} />
        </button>
        <p className="mt-2.5 text-center text-[11px] text-muted">
          Charged in USD. Local amounts are estimates. No payment now.
        </p>
      </div>
    </div>
  );

  const extraHours = extraHoursOf(round);
  const extraBlocks = extraBlocksOf(round);

  return (
    <div className="min-h-screen overflow-x-clip bg-ink pb-24 pt-16 text-white sm:pt-[72px] lg:pb-0">
      <Seo
        title="Host Your CTF — Build a Custom Capture-the-Flag Event | CyberHx"
        description="Build your own CTF like a PC: pick challenge types, difficulty, hours and players. Hosting and a live scoreboard from $49. Run one round or a qualifier plus grand finale."
        path="/host-your-ctf"
        keywords="host a ctf, buy ctf challenges, ctf hosting india, college ctf event, capture the flag platform"
      />
      {/* Store bar */}
      <div className="sticky top-16 z-40 border-b border-line bg-ink/90 backdrop-blur sm:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2.5 sm:px-6 lg:px-8">
          <nav className="hide-scrollbar flex items-center gap-1 overflow-x-auto">
            {[
              ["#build", "Builder"],
              ["#prebuilt", "Prebuilt"],
              ["#how-it-works", "How it works"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-white/[0.05] hover:text-white">
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
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="font-display text-[2.4rem] leading-[1.02] sm:text-5xl lg:text-6xl">
              Build your CTF
              <span className="block text-white/35">part by part.</span>
            </h1>
            <p className="mt-6 max-w-lg leading-7 text-muted">
              Like building a PC: pick challenge types and difficulty, set hours and player count, and split it into a
              qualifier and a grand finale if you want. Hosting and the live scoreboard come with every round from{" "}
              {money(P.hosting.usd)} <Local usd={P.hosting.usd} />.
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
          <h2 className={h2}>Pick your parts</h2>
          <p className="mt-2 text-sm text-muted">Prices are in USD, per challenge. Start from a quick build and tweak it, or start empty.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => loadPreset(p.build)}
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
              {/* Format */}
              <div className="rounded-2xl border-2 border-line bg-ink p-5">
                <h3 className="font-semibold">How many rounds?</h3>
                <p className="mt-1 text-sm text-muted">
                  A qualifier and a grand finale are hosted separately, each with its own hours, players and challenges.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-panel p-1.5" role="radiogroup" aria-label="Event format">
                  {(
                    [
                      ["single", "One round"],
                      ["split", "Qualifier + grand finale"],
                    ] as const
                  ).map(([f, label]) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={build.format === f}
                      onClick={() => setFormat(f)}
                      className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        build.format === f ? "bg-lime text-ink" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Round tabs */}
              {build.format === "split" && (
                <div className="sticky top-[118px] z-30 -mx-1 flex gap-2 bg-panel/80 px-1 py-2 backdrop-blur sm:top-[126px]" role="tablist">
                  {(["qualifier", "finale"] as RoundId[]).map((id) => {
                    const r = build.rounds[id];
                    const on = editing === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setActive(id)}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition ${
                          on ? "border-glow bg-glow/10" : "border-line bg-ink hover:border-white/30"
                        }`}
                      >
                        <span className="block font-semibold">{roundName[id]}</span>
                        <span className="block text-xs text-muted">
                          {roundCount(r)} challenges · {r.hours}h · {players(r.players)} players · {money(roundTotal(r))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {build.format === "split" && editing === "finale" && roundCount(build.rounds.finale) === 0 && roundCount(build.rounds.qualifier) > 0 && (
                <button
                  type="button"
                  onClick={copyQualifierToFinale}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-3 text-sm text-muted transition hover:border-glow hover:text-white"
                >
                  <Copy size={15} /> Copy the qualifier's challenge mix into the finale
                </button>
              )}

              {/* Hosting for this round */}
              <div className="rounded-2xl border-2 border-lime/50 bg-ink p-5">
                <div className="flex items-start gap-4">
                  <SiteIcon name="cloud" size={52} alt="" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        Hosting + live scoreboard{build.format === "split" ? ` for the ${roundName[editing].toLowerCase()}` : ""}
                      </h3>
                      <span className="rounded bg-lime px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">Included</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Platform, scoreboard and host dashboard for {P.hosting.hours} hours and up to {players(P.hosting.players)} players.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-xl">{money(P.hosting.usd)}</span>
                    <Local usd={P.hosting.usd} className="block text-xs text-muted" />
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-line pt-4 sm:pl-[68px]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Event length</p>
                      <p className="text-xs text-muted">
                        {P.hosting.hours}h included, then {money(P.extraHourUsd)} per extra hour, up to {P.maxHours}h
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {extraHours > 0 && <span className="font-mono text-sm text-sun">+{money(extraHours * P.extraHourUsd)}</span>}
                      <Stepper
                        value={`${round.hours}h`}
                        label="hours"
                        onDec={() => patchRound((r) => ({ ...r, hours: Math.max(P.hosting.hours, r.hours - 1) }))}
                        onInc={() => patchRound((r) => ({ ...r, hours: Math.min(P.maxHours, r.hours + 1) }))}
                        decDisabled={round.hours <= P.hosting.hours}
                        incDisabled={round.hours >= P.maxHours}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Expected players</p>
                      <p className="text-xs text-muted">
                        Up to {players(P.hosting.players)} included, then {money(P.extraPlayersUsd)} per extra {players(P.playerBlock)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {extraBlocks > 0 && <span className="font-mono text-sm text-sun">+{money(extraBlocks * P.extraPlayersUsd)}</span>}
                      <Stepper
                        wide
                        value={round.players >= 1000 ? `${round.players / 1000}k` : round.players}
                        label="players"
                        onDec={() => patchRound((r) => ({ ...r, players: Math.max(P.playerBlock, r.players - P.playerBlock) }))}
                        onInc={() => patchRound((r) => ({ ...r, players: Math.min(P.maxPlayers, r.players + P.playerBlock) }))}
                        decDisabled={round.players <= P.playerBlock}
                        incDisabled={round.players >= P.maxPlayers}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenge categories */}
              {builderCategories.map((c) => {
                const catCount = c.tiers.reduce((s, t) => s + (round.qty[key(c.id, t.tier)] ?? 0), 0);
                return (
                  <div key={c.id} className={`rounded-2xl border-2 bg-ink p-5 transition ${catCount > 0 ? "border-glow/50" : "border-line"}`}>
                    <div className="flex items-start gap-4">
                      <SiteIcon name={c.icon} size={52} alt="" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{c.name}</h3>
                          {c.min && (
                            <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                              Min {c.min}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted">{c.blurb}</p>
                      </div>
                      {catCount > 0 && <span className="rounded-md bg-glow/15 px-2 py-1 font-mono text-xs text-glow">{catCount}</span>}
                    </div>
                    <div className="mt-4 space-y-2.5 border-t border-line pt-4 sm:pl-[68px]">
                      {c.tiers.map((t) => {
                        const n = round.qty[key(c.id, t.tier)] ?? 0;
                        return (
                          <div key={t.tier} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className={`w-16 rounded-md border py-1 text-center text-[11px] font-bold uppercase tracking-wider ${tierStyle[t.tier]}`}>
                                {t.tier}
                              </span>
                              <span className="text-sm text-white/85">
                                {money(t.usd)} <span className="text-muted">each</span>{" "}
                                <Local usd={t.usd} className="hidden text-xs text-muted sm:inline" />
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {n > 0 && <span className="hidden font-mono text-sm text-muted sm:inline">{money(n * t.usd)}</span>}
                              <Stepper
                                value={n}
                                label={`${t.tier} ${c.name} challenges`}
                                onDec={() => dec(c.id, t.tier)}
                                onInc={() => inc(c.id, t.tier)}
                                decDisabled={n === 0}
                                incDisabled={n >= P.maxPerTier}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Extras (whole event) */}
              <h3 className="pt-4 font-semibold">For the whole event</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    on: build.website3d,
                    flip: () => setBuild((b) => ({ ...b, website3d: !b.website3d })),
                    icon: "code-light" as IconName,
                    title: "3D event website",
                    text: "A themed 3D landing site made for your event.",
                    usd: P.website3dUsd as number | null,
                  },
                  {
                    on: build.custom,
                    flip: () => setBuild((b) => ({ ...b, custom: !b.custom })),
                    icon: "swords" as IconName,
                    title: "Custom challenges",
                    text: "Built around your story or brand. Describe them at checkout.",
                    usd: null,
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
                      <p className="mt-2 font-display text-lg text-sun">
                        {x.usd === null ? "Quote" : money(x.usd)}{" "}
                        {x.usd !== null && <Local usd={x.usd} className="font-sans text-xs font-normal text-muted" />}
                      </p>
                    </div>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${x.on ? "border-lime bg-lime text-ink" : "border-line text-white/50"}`}>
                      {x.on ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-[140px]">{summary}</div>
            </aside>
          </div>

          {/* Summary on small screens */}
          <div className="mt-8 lg:hidden">{summary}</div>
        </div>
      </section>

      {/* Prebuilt */}
      <section id="prebuilt" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-20 sm:px-6 lg:px-8">
        <h2 className={h2}>Or grab a prebuilt</h2>
        <p className="mt-2 text-sm text-muted">Ready-made single-round CTFs with hosting included. One click to checkout.</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`sticker relative flex flex-col p-6 ${plan.featured ? "sticker-lime" : ""}`}>
              {plan.featured && (
                <span className="absolute -top-3 left-6 rounded-md bg-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">Most picked</span>
              )}
              <div className="flex items-start justify-between">
                <SiteIcon name={plan.icon} size={60} alt="" />
                <div className="text-right">
                  <div className={`font-display text-4xl ${plan.featured ? "text-lime" : "text-white"}`}>${plan.usd}</div>
                  <Local usd={plan.usd} className="text-xs text-muted" />
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
              <button type="button" onClick={() => checkoutPlan(plan.id)} className={`btn mt-6 w-full ${plan.featured ? "btn-lime" : "btn-ghost"}`}>
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
            <h2 className={`${h2} mt-4`}>Every round comes with a host dashboard.</h2>
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
                {build.custom && <span className="text-sm text-muted"> +</span>}{" "}
                <Local usd={total} className="font-sans text-xs font-normal text-muted" />
              </div>
              <div className="text-[11px] text-muted">
                {challengeCount} challenges · {build.format === "split" ? "2 rounds" : `${totalHours}h`}
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
                    <Local usd={order.total} className="mt-1 block text-right text-xs text-muted" />
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
                    You won't be charged now. We confirm your date and email a secure payment link in USD.
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
