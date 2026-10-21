import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { sbRpc } from './mailingApi';

/* =============================================================
   Shared audience filter (Subscribers list + Campaigns):
   gender · country · state · college · list (tag), with live counts.
   Server: public.mail_audience_facets / public.mail_filter_ok (an empty list means "any").
============================================================= */

export interface AudFilter { gender?: string[]; country?: string[]; state?: string[]; college?: string[]; tag?: string }
type Facet = { v: string; n: number };
interface Facets { total: number; gender: Facet[]; country: Facet[]; state: Facet[]; college: Facet[]; tag: Facet[] }

export const isEmptyFilter = (f: AudFilter) => !f.gender?.length && !f.country?.length && !f.state?.length && !f.college?.length && !f.tag;
const inList = (vals: string[]) => `in.(${vals.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`;
/** Same filter as PostgREST query params, for listing / exporting contacts. */
export function filterToQs(f: AudFilter): string[] {
  const p: string[] = [];
  if (f.gender?.length) p.push(`gender=${encodeURIComponent(inList(f.gender))}`);
  if (f.country?.length) p.push(`country=${encodeURIComponent(inList(f.country))}`);
  if (f.state?.length) p.push(`state=${encodeURIComponent(inList(f.state))}`);
  if (f.college?.length) p.push(`college=${encodeURIComponent(inList(f.college))}`);
  if (f.tag) p.push(`tags=cs.${encodeURIComponent(`{"${f.tag.replace(/"/g, '')}"}`)}`);
  return p;
}
export function describeFilter(f: AudFilter): string {
  const parts: string[] = [];
  if (f.gender?.length) parts.push(f.gender.map(cap).join(' / '));
  if (f.state?.length) parts.push(f.state.length > 2 ? `${f.state.length} states` : f.state.join(', '));
  if (f.country?.length) parts.push(f.country.length > 2 ? `${f.country.length} countries` : f.country.join(', '));
  if (f.college?.length) parts.push(f.college.length > 1 ? `${f.college.length} colleges` : shortCollege(f.college[0]));
  if (f.tag) parts.push(`list: ${tagLabel(f.tag)}`);
  return parts.length ? parts.join(' · ') : 'All subscribers';
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortCollege = (s: string) => (s.length > 42 ? `${s.slice(0, 40)}…` : s);
export const tagLabel = (t: string) => (t === 'subscriber' ? 'Website subscribers' : /^unstop-(\d+)$/.test(t) ? `Unstop event ${t.slice(7)}` : t);

const chip = (on: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] border transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/70 ${
    on ? 'bg-[#0A84FF] border-[#0A84FF] text-white' : 'bg-white/[0.05] border-white/[0.08] text-white/75 hover:text-white'}`;

export function AudienceFilter({ value, onChange, onTotal, title = 'Who', note }: {
  value: AudFilter; onChange: (f: AudFilter) => void; onTotal?: (n: number | null) => void; title?: string; note?: string;
}) {
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [collegeQ, setCollegeQ] = useState('');
  const key = JSON.stringify(value);
  const onTotalRef = useRef(onTotal);
  onTotalRef.current = onTotal;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const f = await sbRpc<Facets>('mail_audience_facets', { p_filter: value, p_college_q: collegeQ });
        if (!alive) return;
        setFacets(f); setErr(''); onTotalRef.current?.(f.total);
      } catch (e) {
        if (alive) { setErr(e instanceof Error ? e.message : 'Could not load filters.'); onTotalRef.current?.(null); }
      } finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, collegeQ]);

  const toggle = (k: 'gender' | 'country' | 'state' | 'college', v: string) => {
    const cur = value[k] || [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    onChange({ ...value, [k]: next });
  };
  const clear = () => { onChange({}); setCollegeQ(''); };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-white/40">{title}</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tabular-nums text-white">
            {facets ? facets.total.toLocaleString('en-IN') : '…'}
            <span className="ml-2 text-[14px] font-normal text-white/50">{facets?.total === 1 ? 'person' : 'people'}{loading && <Loader2 size={13} className="ml-2 inline animate-spin" />}</span>
          </p>
          <p className="mt-1 text-[12.5px] text-white/45">{describeFilter(value)}{note ? ` · ${note}` : ''}</p>
        </div>
        {!isEmptyFilter(value) && <button onClick={clear} className="text-[14px] text-[#0A84FF]">Clear</button>}
      </div>
      {err && <p role="alert" className="text-[13px] text-[#FF9F9A]">{err}</p>}

      <Row label="Gender">
        <button onClick={() => onChange({ ...value, gender: [] })} className={chip(!value.gender?.length)}>Everyone</button>
        {(facets?.gender || []).map((g) => (
          <button key={g.v} onClick={() => toggle('gender', g.v)} aria-pressed={!!value.gender?.includes(g.v)} className={chip(!!value.gender?.includes(g.v))}>
            {cap(g.v)} <span className="opacity-60 tabular-nums">{g.n.toLocaleString('en-IN')}</span>
          </button>
        ))}
      </Row>

      <Picker label="Country" items={facets?.country || []} selected={value.country || []} onToggle={(v) => toggle('country', v)} top={8} />
      <Picker label="State" items={facets?.state || []} selected={value.state || []} onToggle={(v) => toggle('state', v)} top={10}
        hint="Only for people whose state is known" />

      {/* College: type to search */}
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-white/80">College</p>
        {!!value.college?.length && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {value.college.map((c) => (
              <button key={c} onClick={() => toggle('college', c)} className={chip(true)} title={c}>
                {shortCollege(c)} <X size={13} />
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={collegeQ} onChange={(e) => setCollegeQ(e.target.value)} placeholder="Search a college, e.g. IIT, Karur, VIT…" aria-label="Search colleges"
            className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] py-2.5 pl-9 pr-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none" />
        </div>
        {(collegeQ || !value.college?.length) && (
          <ul className="mt-2 max-h-56 overflow-auto rounded-xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.05]">
            {(facets?.college || []).filter((c) => !value.college?.includes(c.v)).slice(0, collegeQ ? 40 : 6).map((c) => (
              <li key={c.v}>
                <button onClick={() => { toggle('college', c.v); setCollegeQ(''); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-white/[0.04]">
                  <span className="truncate text-[13.5px] text-white/85">{c.v}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-white/40">{c.n}</span>
                </button>
              </li>
            ))}
            {facets && !facets.college.length && <li className="px-3 py-2 text-[13px] text-white/40">No college matches.</li>}
          </ul>
        )}
      </div>

      {(facets?.tag || []).filter((t) => t.v !== 'subscriber').length > 0 && (
        <Row label="From list">
          <button onClick={() => onChange({ ...value, tag: '' })} className={chip(!value.tag)}>Any</button>
          {(facets?.tag || []).filter((t) => t.v !== 'subscriber').map((t) => (
            <button key={t.v} onClick={() => onChange({ ...value, tag: value.tag === t.v ? '' : t.v })} aria-pressed={value.tag === t.v} className={chip(value.tag === t.v)}>
              {tagLabel(t.v)} <span className="opacity-60 tabular-nums">{t.n.toLocaleString('en-IN')}</span>
            </button>
          ))}
        </Row>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-white/80">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Top values as chips, the rest behind "More" with a search box. */
function Picker({ label, items, selected, onToggle, top, hint }: { label: string; items: Facet[]; selected: string[]; onToggle: (v: string) => void; top: number; hint?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const first = items.slice(0, top);
    const extra = selected.filter((s) => !first.some((f) => f.v === s)).map((s) => items.find((i) => i.v === s) || { v: s, n: 0 });
    return [...first, ...extra];
  }, [items, selected, top]);
  const rest = items.filter((i) => i.v.toLowerCase().includes(q.toLowerCase()));
  if (!items.length && !selected.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-white/80">{label}{hint && <span className="ml-2 font-normal text-[12px] text-white/35">{hint}</span>}</p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <button key={c.v} onClick={() => onToggle(c.v)} aria-pressed={selected.includes(c.v)} className={chip(selected.includes(c.v))}>
            {selected.includes(c.v) && <Check size={13} />}{c.v} {c.n > 0 && <span className="opacity-60 tabular-nums">{c.n.toLocaleString('en-IN')}</span>}
          </button>
        ))}
        {items.length > top && (
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className={chip(false)}>
            {open ? 'Less' : `More (${items.length - top})`} <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label}`}
            className="w-full rounded-lg bg-white/[0.06] px-3 py-2 text-[14px] text-white placeholder:text-white/30 focus:outline-none" />
          <ul className="mt-1.5 max-h-56 overflow-auto">
            {rest.map((c) => (
              <li key={c.v}>
                <button onClick={() => onToggle(c.v)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.05]">
                  <span className="flex items-center gap-2 text-[13.5px] text-white/85">
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected.includes(c.v) ? 'bg-[#0A84FF] border-[#0A84FF]' : 'border-white/25'}`}>{selected.includes(c.v) && <Check size={11} className="text-white" />}</span>
                    {c.v}
                  </span>
                  <span className="text-[12px] tabular-nums text-white/40">{c.n.toLocaleString('en-IN')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
