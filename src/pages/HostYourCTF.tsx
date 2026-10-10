import React from "react";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { SiteIcon, type IconName } from "../components/shared/SiteIcon";
import { Mascot } from "../components/shared/Mascot";
import { plans, pickAndChoose } from "../data/hosting";

/* =============================================================
   CTF HOSTING STORE — add to cart, then check out.
   Prices live in src/data/hosting.ts. Add-on prices are quoted
   per event until you set a number in `addOns` below.
   Checkout places the order via Web3Forms; payment is collected
   afterwards with a link sent to the buyer.
============================================================= */

type Kind = "plan" | "pack" | "addon";
type Product = {
  id: string;
  kind: Kind;
  title: string;
  icon: IconName;
  usd: number | null; // null = quoted per event
  note?: string;
};

const addOns: { id: string; icon: IconName; title: string; description: string; usd: number | null }[] = [
  { id: "longer-events", icon: "gauge", title: "Longer event", description: "Stretch hosting past 8 hours, up to 24 hours, for multi-round CTFs.", usd: null },
  { id: "extra-challenges", icon: "toolbox", title: "Extra challenges", description: "More custom-built challenges on top of any plan or pack.", usd: null },
  { id: "custom-website", icon: "code-light", title: "3D event website", description: "A themed 3D landing site for your event. Already included in Max.", usd: null },
  { id: "promotion", icon: "satellite", title: "Promotion", description: "Put your event in front of the CyberHx community.", usd: null },
];

const parseUsd = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

const catalog: Product[] = [
  ...plans.map((p) => ({ id: p.id, kind: "plan" as const, title: `${p.name} plan`, icon: p.icon, usd: p.usd, note: `about ${p.inr}` })),
  ...pickAndChoose.map((p) => ({ id: p.id, kind: "pack" as const, title: p.title, icon: p.icon, usd: parseUsd(p.usd), note: p.inr })),
  ...addOns.map((a) => ({ id: a.id, kind: "addon" as const, title: a.title, icon: a.icon, usd: a.usd })),
];
const byId = (id: string) => catalog.find((p) => p.id === id);

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
  { icon: "hacker-team", title: "Teams and players", description: "Registrations, teams and activity in one place." },
  { icon: "toolbox", title: "Challenge control", description: "Release, hide or review challenges during the event." },
  { icon: "podium", title: "Certificates", description: "Issue participation and winner certificates afterwards." },
];

const steps = [
  { n: "01", title: "Add to cart", text: "A plan, a pack, or both, plus any add-ons." },
  { n: "02", title: "Check out", text: "Tell us about your event and place the order." },
  { n: "03", title: "Pay and confirm", text: "We email a payment link and lock your date." },
  { n: "04", title: "Go live", text: "We build it, you run it from the host dashboard." },
];

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

const CART_KEY = "cyberhx-ctf-cart";
const loadCart = (): string[] => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return ids.filter((id) => byId(id));
  } catch {
    return [];
  }
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

const inputCls =
  "w-full rounded-lg border border-line bg-ink px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-lime";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";

export default function HostYourCTF() {
  const [cart, setCart] = React.useState<string[]>(loadCart);
  const [drawer, setDrawer] = React.useState<"closed" | "cart" | "checkout" | "done">("closed");
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [orderId, setOrderId] = React.useState("");

  React.useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable; cart still works for this visit */
    }
  }, [cart]);

  React.useEffect(() => {
    document.body.style.overflow = drawer === "closed" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const items = cart.map(byId).filter(Boolean) as Product[];
  const total = items.reduce((s, p) => s + (p.usd ?? 0), 0);
  const hasQuoted = items.some((p) => p.usd === null);
  const inCart = (id: string) => cart.includes(id);

  // Only one plan at a time: adding a plan swaps out any other plan.
  const add = (id: string, open = true) => {
    const p = byId(id);
    if (!p) return;
    setCart((prev) => {
      const base = p.kind === "plan" ? prev.filter((x) => byId(x)?.kind !== "plan") : prev;
      return base.includes(id) ? base : [...base, id];
    });
    if (open) setDrawer("cart");
  };
  const remove = (id: string) => setCart((prev) => prev.filter((x) => x !== id));
  const toggle = (id: string) => (inCart(id) ? remove(id) : add(id, false));

  const onField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    const id = `CHX-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const lines = items.map((p) => `${p.title}: ${p.usd === null ? "quote" : money(p.usd)}`).join("\n");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "ae826816-f65e-4d6f-8491-3362df582e13",
          subject: `New CTF order ${id}: ${form.eventName} (${money(total)}${hasQuoted ? " + quote" : ""})`,
          order_id: id,
          order_items: lines,
          order_total_usd: money(total) + (hasQuoted ? " plus quoted add-ons" : ""),
          ...form,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("failed");
      setOrderId(id);
      setCart([]);
      setForm(emptyForm);
      setDrawer("done");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const h2 = "font-display text-3xl sm:text-4xl";

  return (
    <div className="min-h-screen overflow-x-clip bg-ink pt-16 text-white sm:pt-[72px]">
      {/* Store bar */}
      <div className="sticky top-16 z-40 border-b border-line bg-ink/90 backdrop-blur sm:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2.5 sm:px-6 lg:px-8">
          <nav className="hide-scrollbar flex items-center gap-1 overflow-x-auto">
            {[
              ["#plans", "Plans"],
              ["#packs", "Packs"],
              ["#add-ons", "Add-ons"],
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
          <button
            type="button"
            onClick={() => setDrawer("cart")}
            className="flex shrink-0 items-center gap-2.5 rounded-lg border-2 border-lime px-3.5 py-1.5 text-sm font-semibold text-lime transition hover:bg-lime hover:text-ink"
          >
            Cart
            <span className="rounded bg-lime px-1.5 py-0.5 font-mono text-xs leading-none text-ink">{cart.length}</span>
            {total > 0 && <span className="hidden font-mono sm:inline">{money(total)}</span>}
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">CyberHx CTF store</p>
            <h1 className="font-display mt-4 text-[2.4rem] leading-[1.02] sm:text-5xl lg:text-6xl">
              Host your CTF.
              <span className="block text-white/35">Check out in minutes.</span>
            </h1>
            <p className="mt-6 max-w-lg leading-7 text-muted">
              Add a plan to your cart, tell us about your event, and place the order. We build the challenges, host
              the platform and run a live scoreboard for 8 hours, or up to 24.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#plans" className="btn btn-lime">
                Shop plans
              </a>
              <a href="#packs" className="btn btn-ghost">
                Just hosting or challenges
              </a>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
              {[
                ["1M+", "Unique visitors"],
                ["8 to 24h", "Hosted event"],
                ["From $" + Math.min(...plans.map((p) => p.usd)), "Full plans"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-xl">{v}</dt>
                  <dd className="mt-0.5 text-xs text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-x-6 bottom-0 top-16 rounded-3xl border-2 border-line bg-panel" />
            <Mascot pose="point" alt="CyberHx mascot pointing at the plans" eager className="mascot-pop relative mx-auto w-64 lg:w-72" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto grid max-w-7xl grid-cols-4 gap-y-6 px-5 py-8 sm:px-6 lg:grid-cols-8 lg:px-8">
          {challengeCategories.map(({ icon, name }) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <SiteIcon name={icon} size={56} alt="" />
              <span className="text-xs font-semibold text-white/75">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className={h2}>Full plans</h2>
            <p className="mt-2 text-sm text-muted">Hosting and challenges together. Pick one plan per event.</p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const on = inCart(plan.id);
            return (
              <article
                key={plan.id}
                className={`sticker relative flex flex-col p-6 ${plan.featured ? "sticker-lime" : ""}`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-6 rounded-md bg-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                    Most picked
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <SiteIcon name={plan.icon} size={64} alt="" />
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
                  onClick={() => (on ? setDrawer("cart") : add(plan.id))}
                  className={`btn mt-6 w-full ${on ? "btn-ghost" : plan.featured ? "btn-lime" : "btn-ghost"}`}
                >
                  {on ? (
                    <>
                      <Check size={16} /> In cart
                    </>
                  ) : (
                    "Add to cart"
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Packs */}
      <section id="packs" className="scroll-mt-32 border-y border-line bg-panel/40">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <h2 className={h2}>Buy only the part you need</h2>
          <p className="mt-2 text-sm text-muted">Have your own challenges? Buy hosting. Have a platform? Buy a pack.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pickAndChoose.map((p) => {
              const on = inCart(p.id);
              return (
                <article key={p.id} className="sticker flex flex-col p-6">
                  <SiteIcon name={p.icon} size={56} alt="" />
                  <h3 className="mt-4 font-semibold">{p.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-muted">{p.description}</p>
                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
                    <div>
                      <div className="font-display text-3xl text-sun">{p.usd}</div>
                      <div className="text-xs text-muted">{p.inr}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                        on ? "border-lime bg-lime text-ink" : "border-line text-white hover:border-lime"
                      }`}
                    >
                      {on ? <Check size={15} /> : <Plus size={15} />}
                      {on ? "Added" : "Add"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section id="add-ons" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-20 sm:px-6 lg:px-8">
        <h2 className={h2}>Add-ons</h2>
        <p className="mt-2 text-sm text-muted">Quoted per event. Add them and we'll price them with your order.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {addOns.map((a) => {
            const on = inCart(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                aria-pressed={on}
                className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition ${
                  on ? "border-lime bg-lime/[0.06]" : "border-line hover:border-white/30"
                }`}
              >
                <SiteIcon name={a.icon} size={52} alt="" />
                <div className="flex-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{a.description}</p>
                </div>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${
                    on ? "border-lime bg-lime text-ink" : "border-line text-white/50"
                  }`}
                >
                  {on ? <Check size={14} /> : <Plus size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dashboard */}
      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
          <div>
            <SiteIcon name="windows" size={72} alt="" />
            <h2 className={`${h2} mt-4`}>Every order comes with a host dashboard.</h2>
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
          Need something custom?{" "}
          <a href="/contact" className="font-semibold text-lime underline-offset-4 hover:underline">
            Talk to us first
          </a>
          .
        </p>
      </section>

      {/* Mobile cart bar */}
      {cart.length > 0 && drawer === "closed" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-ink/95 p-3 backdrop-blur sm:hidden">
          <button type="button" onClick={() => setDrawer("cart")} className="btn btn-lime w-full justify-between">
            <span>
              View cart ({cart.length})
            </span>
            <span className="font-mono">{money(total)}{hasQuoted ? " +" : ""}</span>
          </button>
        </div>
      )}

      {/* Drawer */}
      {drawer !== "closed" && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Your cart">
          <div className="absolute inset-0 bg-black/70" onClick={() => !submitting && setDrawer("closed")} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l-2 border-line bg-ink">
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                {drawer === "checkout" && (
                  <button type="button" onClick={() => setDrawer("cart")} className="rounded p-1 text-muted hover:text-white" aria-label="Back to cart">
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 className="font-display text-lg">
                  {drawer === "cart" ? "Your cart" : drawer === "checkout" ? "Checkout" : "Order placed"}
                </h2>
              </div>
              <button type="button" onClick={() => setDrawer("closed")} className="rounded p-1 text-muted hover:text-white" aria-label="Close">
                <X size={20} />
              </button>
            </header>

            {drawer === "cart" && (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {items.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Mascot pose="confused" alt="" className="w-36" />
                      <p className="mt-4 font-semibold">Your cart is empty</p>
                      <p className="mt-1 text-sm text-muted">Start with a plan. Most colleges pick Pro.</p>
                      <a href="#plans" onClick={() => setDrawer("closed")} className="btn btn-lime mt-5">
                        Shop plans
                      </a>
                    </div>
                  ) : (
                    <ul className="divide-y divide-line">
                      {items.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 py-4">
                          <SiteIcon name={p.icon} size={44} alt="" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{p.title}</p>
                            <p className="text-xs text-muted">
                              {p.kind === "plan" ? "Plan" : p.kind === "pack" ? "Pack" : "Add-on"}
                            </p>
                          </div>
                          <span className="font-mono text-sm">{p.usd === null ? "Quote" : money(p.usd)}</span>
                          <button type="button" onClick={() => remove(p.id)} className="rounded p-1 text-muted hover:text-white" aria-label={`Remove ${p.title}`}>
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {items.length > 0 && !items.some((p) => p.kind === "addon") && (
                    <a href="#add-ons" onClick={() => setDrawer("closed")} className="mt-2 block rounded-lg border-2 border-dashed border-line p-3 text-center text-sm text-muted hover:border-lime hover:text-white">
                      Need more hours or challenges? Browse add-ons
                    </a>
                  )}
                </div>
                {items.length > 0 && (
                  <footer className="border-t border-line px-5 py-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Subtotal</span>
                      <span className="font-display text-2xl">{money(total)}</span>
                    </div>
                    {hasQuoted && <p className="mt-1 text-xs text-muted">Add-ons are quoted and added to your invoice.</p>}
                    <button type="button" onClick={() => setDrawer("checkout")} className="btn btn-lime mt-4 w-full">
                      Checkout <ArrowRight size={16} />
                    </button>
                  </footer>
                )}
              </>
            )}

            {drawer === "checkout" && (
              <form onSubmit={placeOrder} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  <div className="rounded-xl border-2 border-line p-4">
                    {items.map((p) => (
                      <div key={p.id} className="flex justify-between py-1 text-sm">
                        <span className="text-white/85">{p.title}</span>
                        <span className="font-mono text-muted">{p.usd === null ? "Quote" : money(p.usd)}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
                      <span>Total</span>
                      <span className="font-mono text-lime">{money(total)}{hasQuoted ? " +" : ""}</span>
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
                      <label className={labelCls}>Notes</label>
                      <textarea name="message" rows={3} value={form.message} onChange={onField} className={`${inputCls} resize-none`} />
                    </div>
                  </div>
                </div>
                <footer className="border-t border-line px-5 py-5">
                  {error && <p className="mb-3 text-sm text-red-300">Could not place the order. Try again or email us.</p>}
                  <button type="submit" disabled={submitting} className="btn btn-lime w-full disabled:opacity-60">
                    {submitting ? "Placing order..." : `Place order · ${money(total)}${hasQuoted ? " +" : ""}`}
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
                <h3 className="font-display mt-5 text-2xl">You're on the board.</h3>
                <p className="mt-2 text-sm text-muted">
                  Order <span className="font-mono text-lime">{orderId}</span> is in. Check your email: we'll send the
                  payment link and confirm your event date within a day.
                </p>
                <button type="button" onClick={() => setDrawer("closed")} className="btn btn-ghost mt-6">
                  Back to the store
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
