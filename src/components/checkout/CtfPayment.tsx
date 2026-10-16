import React from "react";
import { ImageUp, Loader2, Lock, X } from "lucide-react";
import {
  createOrder, getQuote, loadRazorpay, LOGO_MAX, LOGO_TYPES, logoPublicUrl, reportFailure, uploadLogo, verifyPayment,
  type Cart, type PayCurrency, type PayQuote,
} from "../../lib/ctfPay";

/* =============================================================
   Checkout pieces for Host Your CTF (Razorpay, like pentestlab.cyberhx.com):
   - LogoField: the CTF logo the buyer must upload
   - PayFooter: price, currency, terms, the Pay button, and a quiet "Have a code?" link
============================================================= */

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";

export function LogoField({ path, onChange, error, required }: { path: string; onChange: (p: string) => void; error?: string; required: boolean }) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const shown = msg || error;

  React.useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setMsg("");
    if (!LOGO_TYPES[file.type]) { setMsg("Use a PNG, JPG or WebP image."); return; }
    if (file.size > LOGO_MAX) { setMsg("The logo must be 3 MB or smaller."); return; }
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      onChange(await uploadLogo(file));
    } catch (e) {
      setPreview("");
      onChange("");
      setMsg(e instanceof Error ? e.message : "Could not upload the logo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const src = preview || (path ? logoPublicUrl(path) : "");
  return (
    <div className="col-span-2" data-field="logo">
      <span id="co-logo-label" className={labelCls}>CTF logo {required ? "*" : "(optional)"}</span>
      <div
        className={`flex items-center gap-4 rounded-xl border bg-white/[0.03] p-3 ${shown ? "border-red-400/60" : "border-line"}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
      >
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-ink">
          {src ? <img src={src} alt="Your CTF logo" className="h-full w-full object-contain" /> : <ImageUp size={22} className="text-muted" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/85">{busy ? "Uploading…" : path ? "Logo added" : "Square image works best"}</p>
          <p className="text-xs text-muted">PNG, JPG or WebP, up to 3 MB. Shown on your event page and scoreboard.</p>
        </div>
        <input
          ref={inputRef} id="co-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
          aria-labelledby="co-logo-label" aria-invalid={shown ? true : undefined} aria-describedby={shown ? "co-logo-error" : undefined}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {path && !busy ? (
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-ghost !px-3 !py-2 text-xs">Change</button>
            <button type="button" onClick={() => { onChange(""); setPreview(""); }} aria-label="Remove logo" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white">
              <X size={15} />
            </button>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="btn btn-ghost shrink-0 !px-3.5 !py-2 text-xs disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : "Upload"}
          </button>
        )}
      </div>
      {shown && <p id="co-logo-error" className="mt-1.5 text-xs text-red-300" role="alert">{shown}</p>}
    </div>
  );
}

const CURRENCIES: { id: PayCurrency; label: string; hint: string }[] = [
  { id: "INR", label: "₹ INR", hint: "UPI, cards, netbanking, wallets" },
  { id: "USD", label: "$ USD", hint: "International cards" },
];

export interface PaidInfo { ref: string; amountLabel: string }

export function PayFooter({
  cart, defaultCurrency, usdTotal, buyer, validate, getForm, onPaid, onStep,
}: {
  cart: Cart;
  defaultCurrency: PayCurrency;
  usdTotal: string;
  buyer: { name: string; email: string; phone: string };
  /** Checks the form (and logo); returns false and shows the errors when something is missing. */
  validate: () => boolean;
  getForm: () => Record<string, string>;
  onPaid: (info: PaidInfo) => void;
  /** Lets the page's mascot react. */
  onStep?: (step: "paying" | "failed") => void;
}) {
  const [currency, setCurrency] = React.useState<PayCurrency>(defaultCurrency);
  const [code, setCode] = React.useState<string | null>(null);
  const [quote, setQuote] = React.useState<PayQuote | null>(null);
  const [quoting, setQuoting] = React.useState(true);
  const [quoteErr, setQuoteErr] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [codeInput, setCodeInput] = React.useState("");
  const [codeBusy, setCodeBusy] = React.useState(false);
  const [codeErr, setCodeErr] = React.useState("");
  const cartKey = JSON.stringify(cart);

  React.useEffect(() => {
    let live = true;
    setQuoting(true);
    setQuoteErr("");
    getQuote(cart, currency, code)
      .then((q) => { if (live) setQuote(q); })
      .catch((e) => {
        if (!live) return;
        setQuote(null);
        setQuoteErr(e instanceof Error ? e.message : "Could not load the price.");
        if (currency === "INR") setCurrency("USD"); // rupee rate unavailable: fall back to dollars
      })
      .finally(() => live && setQuoting(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, currency, code]);

  // Not a <form>: this sits inside the checkout form, and nested forms submit the page.
  const applyCode = async () => {
    const c = codeInput.trim().toUpperCase();
    if (!c) { setCodeErr("Enter a code."); return; }
    setCodeBusy(true);
    setCodeErr("");
    try {
      const q = await getQuote(cart, currency, c);
      if (q.codeError) setCodeErr(q.codeError);
      else { setCode(q.code); setQuote(q); setCodeInput(""); setCodeOpen(false); }
    } catch (x) {
      setCodeErr(x instanceof Error ? x.message : "Could not check that code.");
    }
    setCodeBusy(false);
  };

  const pay = async () => {
    setErr("");
    if (!validate()) return;
    if (!agreed) { setErr("Tick the box to agree to the Terms of Service."); return; }
    if (!quote) return;
    setBusy(true);
    onStep?.("paying");
    try {
      const sdk = loadRazorpay();
      const o = await createOrder({ cart, currency, code, form: getForm(), acceptTerms: true });
      if (o.free) { onPaid({ ref: o.ref, amountLabel: "Free" }); return; }
      if (!(await sdk)) throw new Error("The payment window could not load. Check your connection and try again.");
      const rzp = new (window as any).Razorpay({
        key: o.key_id,
        amount: o.amount,
        currency: o.currency,
        order_id: o.order_id,
        name: "CyberHx",
        description: o.description,
        prefill: { name: buyer.name, email: buyer.email, contact: buyer.phone.replace(/[^\d+]/g, "") },
        notes: { ref: o.ref },
        theme: { color: "#c6f135" },
        handler: async (r: Record<string, string>) => {
          try {
            await verifyPayment(r);
            onPaid({ ref: o.ref, amountLabel: quote.amountLabel });
          } catch (x) {
            setErr(x instanceof Error ? x.message : "We could not confirm the payment. If you were charged, it will be confirmed automatically.");
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            reportFailure({ razorpay_order_id: o.order_id!, dismissed: true, reason: "Payment window closed" });
          },
        },
      });
      rzp.on("payment.failed", (r: any) => {
        const reason = r?.error?.description || "Payment failed. Please try again.";
        setErr(reason);
        onStep?.("failed");
        reportFailure({ razorpay_order_id: o.order_id!, reason, code: r?.error?.code, step: r?.error?.step, payment_id: r?.error?.metadata?.payment_id });
      });
      rzp.open();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
      setBusy(false);
      onStep?.("failed");
    }
  };

  const discounted = !!quote?.percentOff;
  return (
    <footer className="space-y-3.5 border-t border-line px-5 py-5">
      <div className="flex items-end justify-between gap-3" aria-live="polite">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl tabular-nums text-white">{quote ? quote.amountLabel : quoting ? "…" : usdTotal}</span>
            {discounted && quote && <span className="text-sm text-muted line-through tabular-nums">{quote.listLabel}</span>}
            {quoting && quote && <Loader2 size={14} className="animate-spin text-muted" aria-label="Updating price" />}
          </div>
          <p className="text-xs text-muted">
            {quote?.currency === "INR" ? `${usdTotal} at today's rate` : "One-time payment"}
          </p>
        </div>
        <div role="radiogroup" aria-label="Pay in" className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {CURRENCIES.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={currency === c.id} title={c.hint}
              disabled={busy} onClick={() => setCurrency(c.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${currency === c.id ? "bg-white text-black" : "text-muted hover:text-white"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {quoteErr && !quote && <p className="text-xs text-red-300">{quoteErr}</p>}

      {code && quote && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-lime/30 bg-lime/[0.06] px-3 py-2 text-xs">
          <span className="text-white/85">Code <b className="font-mono text-lime">{code}</b> applied · {Number(quote.percentOff)}% off</span>
          <button type="button" onClick={() => setCode(null)} aria-label={`Remove code ${code}`} className="grid h-7 w-7 place-items-center rounded text-muted hover:text-white">
            <X size={13} />
          </button>
        </div>
      )}

      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-white/75">
        <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked && err.startsWith("Tick")) setErr(""); }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#c6f135]" />
        <span>
          I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-lime underline underline-offset-2">Terms of Service</a>. We confirm your date by email within one business day.
        </span>
      </label>

      {err && <p className="text-sm text-red-300" role="alert">{err}</p>}
      <button type="button" onClick={pay} disabled={busy || !quote} className="btn btn-lime w-full !py-3.5 text-base disabled:opacity-60">
        {busy ? <><Loader2 size={17} className="animate-spin" /> Processing…</> : quote ? (quote.amount === 0 ? "Confirm free order" : `Pay ${quote.amountLabel}`) : "Pay"}
      </button>

      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><Lock size={12} aria-hidden /> Secured by Razorpay</span>
        {!code && (
          <button type="button" aria-expanded={codeOpen} onClick={() => { setCodeOpen((o) => !o); setCodeErr(""); }}
            className="px-1 py-1 underline underline-offset-[3px] hover:text-white">
            Have a code?
          </button>
        )}
      </div>
      {codeOpen && !code && (
        <div role="group" aria-label="Promo code" className="space-y-1.5">
          <div className="flex gap-2">
            <label htmlFor="co-code" className="sr-only">Promo code</label>
            <input id="co-code" autoFocus value={codeInput} maxLength={40} autoComplete="off" placeholder="Promo code"
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }}
              aria-invalid={codeErr ? true : undefined}
              className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm text-white outline-none placeholder:font-sans placeholder:text-white/30 focus:border-lime" />
            <button type="button" onClick={applyCode} disabled={codeBusy || !codeInput.trim()} className="btn btn-ghost !px-3.5 !py-2 text-xs disabled:opacity-50">
              {codeBusy ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
            </button>
          </div>
          {codeErr && <p className="text-xs text-red-300" role="alert">{codeErr}</p>}
        </div>
      )}
    </footer>
  );
}
