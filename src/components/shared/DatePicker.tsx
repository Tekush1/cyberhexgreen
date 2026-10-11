import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

/* Booking calendar. Values are plain "YYYY-MM-DD" strings in the visitor's
   local calendar (no time-zone shifting). Days before `min` are disabled.
   Keyboard: arrows move a day/week, PageUp/PageDown a month, Enter picks, Esc closes. */

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const prettyDate = (s: string) =>
  fromISO(s)?.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) ?? '';

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DatePicker({
  value,
  onChange,
  min,
  label,
  error,
  hint,
  name,
}: {
  value: string;
  onChange: (iso: string) => void;
  min: Date;
  label: string;
  error?: string;
  hint?: string;
  name: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = value ? fromISO(value) : null;
  const [view, setView] = useState(() => selected ?? min);
  const [focus, setFocus] = useState<Date>(() => selected ?? min);
  const wrap = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  // Keep the calendar on the selected month / earliest month when opening.
  useEffect(() => {
    if (!open) return;
    const start = selected && selected >= min ? selected : min;
    setView(new Date(start.getFullYear(), start.getMonth(), 1));
    setFocus(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Move keyboard focus onto the focused day.
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-day="${toISO(focus)}"]`)?.focus();
  }, [open, focus]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
  }, [view]);

  const pick = (d: Date) => {
    if (d < min) return;
    onChange(toISO(d));
    setOpen(false);
  };
  const move = (d: Date) => {
    setFocus(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (k in steps) {
      e.preventDefault();
      move(addDays(focus, steps[k]));
    } else if (k === 'PageUp' || k === 'PageDown') {
      e.preventDefault();
      move(new Date(focus.getFullYear(), focus.getMonth() + (k === 'PageDown' ? 1 : -1), focus.getDate()));
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      pick(focus);
    } else if (k === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const today = new Date();
  const canPrev = new Date(view.getFullYear(), view.getMonth(), 0) >= new Date(min.getFullYear(), min.getMonth(), 1);

  return (
    <div ref={wrap} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      <button
        id={id}
        name={name}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!error}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-lg border bg-ink px-3.5 py-3 text-left text-base outline-none transition sm:text-sm ${
          error ? 'border-red-400/60' : open ? 'border-lime' : 'border-line hover:border-white/25'
        } focus-visible:border-lime`}
      >
        <CalendarDays size={16} className={value ? 'text-lime' : 'text-white/35'} />
        <span className={value ? 'text-white' : 'text-white/30'}>{value ? prettyDate(value) : 'Pick a date'}</span>
      </button>
      {error ? <p className="mt-1.5 text-xs text-red-300">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}

      {open && (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          onKeyDown={onKey}
          className="dp-pop absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-white/10 p-3 sm:right-auto sm:w-[19rem]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-25"
            >
              <ChevronLeft size={17} />
            </button>
            <p className="font-display text-[15px]" aria-live="polite">
              {view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              aria-label="Next month"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center font-mono text-[10.5px] uppercase tracking-wider text-white/35">
            {WEEK.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div ref={grid} role="grid" className="mt-1 grid grid-cols-7 gap-1">
            {days.map((d) => {
              const out = d.getMonth() !== view.getMonth();
              const disabled = d < min;
              const isSel = !!selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              const iso = toISO(d);
              return (
                <button
                  key={iso}
                  type="button"
                  data-day={iso}
                  tabIndex={sameDay(d, focus) ? 0 : -1}
                  disabled={disabled}
                  aria-selected={isSel}
                  aria-label={d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  onClick={() => pick(d)}
                  className={`relative flex h-10 items-center justify-center rounded-lg text-sm tabular-nums outline-none transition sm:h-9 ${
                    isSel
                      ? 'bg-lime font-bold text-ink shadow-[0_0_18px_-4px_rgba(198,241,53,0.8)]'
                      : disabled
                        ? 'cursor-not-allowed text-white/15 line-through decoration-white/10'
                        : out
                          ? 'text-white/35 hover:bg-white/[0.06]'
                          : 'text-white/85 hover:bg-white/[0.08] hover:text-white'
                  } focus-visible:ring-2 focus-visible:ring-glow`}
                >
                  {d.getDate()}
                  {isToday && !isSel && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-glow" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-white/[0.07] pt-2 text-[11.5px] text-muted">
            Earliest available: <span className="text-white/80">{prettyDate(toISO(min))}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
