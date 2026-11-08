// Admin -> Contacts: shared types, styles, CSV reading and email templates.
// Data: supabase/outreach_contacts.sql (outreach_contacts, contact batches through outreach_queue).

import type { ReactNode } from 'react';

export type Category = 'college' | 'fest' | 'space' | 'govt' | 'sponsor' | 'program' | 'community' | 'media' | 'other';
export type CStatus = 'new' | 'mailed' | 'replied' | 'interested' | 'not_interested' | 'bounced' | 'skip';

export interface Contact {
  id: string; name: string; org: string; role: string; email: string | null; phone: string; category: Category;
  city: string; state: string; country: string; website: string; source: string; tags: string[]; notes: string;
  status: CStatus; mail_count: number; last_mailed_at: string | null; last_replied_at: string | null;
  updated_by: string | null; created_at: string; updated_at: string;
}

export const CATEGORY: Record<Category, { label: string; color: string }> = {
  college: { label: 'College', color: '#0A84FF' },
  fest: { label: 'Fest / club', color: '#BF5AF2' },
  space: { label: 'Space', color: '#5E5CE6' },
  govt: { label: 'Govt / ISRO', color: '#FF9F0A' },
  sponsor: { label: 'Sponsor', color: '#30D158' },
  program: { label: 'Program / incubator', color: '#64D2FF' },
  community: { label: 'Community', color: '#FF375F' },
  media: { label: 'Media', color: '#FFD60A' },
  other: { label: 'Other', color: '#98989D' },
};
export const CATEGORIES = Object.keys(CATEGORY) as Category[];

export const CSTATUS: Record<CStatus, { label: string; color: string }> = {
  new: { label: 'New', color: '#98989D' },
  mailed: { label: 'Emailed', color: '#0A84FF' },
  replied: { label: 'Replied', color: '#FF9F0A' },
  interested: { label: 'Interested', color: '#30D158' },
  not_interested: { label: 'Not interested', color: '#FF453A' },
  bounced: { label: 'Bounced', color: '#FF6961' },
  skip: { label: 'Skip', color: '#636366' },
};
export const CSTATUSES = Object.keys(CSTATUS) as CStatus[];
/** Bulk emails never go to these. */
export const NO_MAIL: CStatus[] = ['skip', 'bounced', 'not_interested'];

/* ---------- glass look (same as Outreach) ---------- */
export const glass = 'bg-white/[0.045] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_40px_-12px_rgba(0,0,0,0.6)]';
export const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 focus-visible:ring-offset-0';
export const field = `w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/30 ${ring} focus:border-[#0A84FF]/60 transition-colors`;
export const btn = `inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors disabled:opacity-40 ${ring}`;
export const btnBlue = `${btn} bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90`;
export const btnGlass = `${btn} bg-white/[0.08] border border-white/[0.1] text-white/85 hover:bg-white/[0.12]`;

export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap"
      style={{ background: `${color}22`, color }}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{children}
    </span>
  );
}

export function Sheet({ title, onClose, busy, wide, children, footer }: { title: string; onClose: () => void; busy?: boolean; wide?: boolean; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className={`relative flex w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'} max-h-[94vh] flex-col rounded-t-[28px] sm:rounded-[28px] ${glass} bg-[#1c1c1e]/95`}>
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-white/25 sm:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-3 border-b border-white/[0.07]">
          <h3 className="text-[17px] font-semibold text-white truncate">{title}</h3>
          <button onClick={onClose} disabled={busy} className="text-[15px] text-[#0A84FF] disabled:opacity-40 shrink-0">Close</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-white/[0.07] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
export const initials = (s: string) => (s.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('') || '?').toUpperCase();

/* ---------- merge fields: same rules as public.contact_fill() in SQL ---------- */
export const FIELDS = ['{first_name}', '{name}', '{org}', '{role}', '{city}', '{sender}'];
export function fill(text: string, c: Pick<Contact, 'name' | 'org' | 'role' | 'city'>, sender = '') {
  const first = c.name.trim().split(/\s+/)[0] || '';
  return text
    .split('{sender}').join(sender || 'Cyber HX')
    .split('{first_name}').join(first || 'there')
    .split('{name}').join(c.name.trim() || 'there')
    .split('{org}').join(c.org.trim() || 'your team')
    .split('{role}').join(c.role.trim())
    .split('{city}').join(c.city.trim() || 'your city');
}

/* ---------- templates ---------- */
const LINKS = 'Reviews from our past events: https://cyberhx.com/reviews\nInstagram: https://instagram.com/cyberhx__';
export const TEMPLATES: { id: string; label: string; subject: string; body: string }[] = [
  {
    id: 'space', label: 'Space CTF co-host',
    subject: 'Co-hosting a space security CTF with {org}?',
    body: `Hi {first_name},

I'm {sender} from Cyber HX (cyberhx.com). We run CTF competitions for universities and security communities worldwide, on our own platform, with players from 90+ countries.

We're planning a space security CTF: satellite, ground station and radio challenges, all simulated and safe to play. Space systems are a new attack surface, governments are now writing cyber security rules for them, and almost no CTF trains people for it.

We'd love {org} to co-host it. You bring the venue and the students; we bring the platform, the challenges and the running of the event. Sponsors cover the prizes.

Would you be open to a 15-minute call this week?

${LINKS}

{sender}
Cyber HX`,
  },
  {
    id: 'host', label: 'CTF hosting (club / fest)',
    subject: 'Hosting your next CTF on Cyber HX',
    body: `Hi {first_name},

I'm {sender} from Cyber HX (cyberhx.com). We host CTFs end to end for college clubs and fests: the platform, live scoreboard, challenges if you need them, and support during the event.

If there's any downtime from our side during your event, you get a 100% money-back guarantee.

Would {org} like to run its next CTF with us? Happy to share a quick demo.

${LINKS}

{sender}
Cyber HX`,
  },
  {
    id: 'sponsor', label: 'Sponsor ask',
    subject: 'Partnering with Cyber HX on a national CTF',
    body: `Hi {first_name},

I'm {sender} from Cyber HX (cyberhx.com). We run global CTF competitions that thousands of players from 90+ countries take part in.

We're looking for a few partners for our next event. Sponsors get their name on the platform and the scoreboard, a challenge category in their name, and direct access to the top players for hiring.

Could we set up a short call to see if this fits {org}?

${LINKS}

{sender}
Cyber HX`,
  },
  { id: 'blank', label: 'Blank', subject: '', body: '\n\n{sender}\nCyber HX' },
];

/* ---------- CSV / pasted table reading ---------- */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const sep = (() => {
    const first = text.split(/\r?\n/, 1)[0] || '';
    return (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  })();
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

export type ImportKey = 'name' | 'org' | 'role' | 'email' | 'phone' | 'category' | 'city' | 'state' | 'country' | 'website' | 'tags' | 'notes' | 'source';
export const IMPORT_KEYS: ImportKey[] = ['name', 'org', 'role', 'email', 'phone', 'category', 'city', 'state', 'country', 'website', 'tags', 'notes', 'source'];
const ALIASES: Record<ImportKey, RegExp> = {
  email: /^(e-?mail|email ?(id|address)?|mail)$/i,
  name: /^(name|full ?name|contact( name)?|person|poc)$/i,
  org: /^(org|organi[sz]ation|college|university|institute|institution|company|club|fest|event)$/i,
  role: /^(role|designation|title|position|post)$/i,
  phone: /^(phone|mobile|contact ?(no|number)|whatsapp|phone ?(no|number))$/i,
  category: /^(category|type|kind)$/i,
  city: /^(city|town|location)$/i,
  state: /^(state|region)$/i,
  country: /^country$/i,
  website: /^(website|site|url|link|web)$/i,
  tags: /^(tags?|labels?|lists?)$/i,
  notes: /^(notes?|comments?|remarks?)$/i,
  source: /^(source|found ?(at|on|via))$/i,
};
const EMAIL = /[^\s<>,;"'()[\]]+@[^\s<>,;"'()[\]]+\.[a-z]{2,}/i;

/** Which column holds what. Returns null for a column we don't use. Without a header row, the column that holds emails is "email". */
export function guessColumns(rows: string[][]): { header: boolean; map: (ImportKey | null)[] } {
  if (!rows.length) return { header: true, map: [] };
  const first = rows[0];
  const map = first.map((h) => (IMPORT_KEYS.find((k) => ALIASES[k].test(h.trim())) || null) as ImportKey | null);
  if (map.some(Boolean) && !first.some((c) => EMAIL.test(c))) return { header: true, map };
  // No header: find the email column, call the first other text column the name and the next the organisation.
  const width = Math.max(0, ...rows.slice(0, 20).map((r) => r.length));
  const guess: (ImportKey | null)[] = Array(width).fill(null);
  const emailCol = [...Array(width).keys()].find((i) => rows.slice(0, 20).filter((r) => EMAIL.test(r[i] || '')).length >= Math.min(3, rows.length) * 0.6);
  if (emailCol !== undefined) guess[emailCol] = 'email';
  const others = [...Array(width).keys()].filter((i) => i !== emailCol);
  if (others[0] !== undefined) guess[others[0]] = 'name';
  if (others[1] !== undefined) guess[others[1]] = 'org';
  return { header: false, map: guess };
}

export function toRows(rows: string[][], header: boolean, map: (ImportKey | null)[]) {
  return rows.slice(header ? 1 : 0).map((r) => {
    const o: Record<string, unknown> = {};
    map.forEach((k, i) => {
      if (!k) return;
      const v = (r[i] || '').trim();
      if (!v) return;
      if (k === 'email') o.email = (v.match(EMAIL) || [''])[0].toLowerCase();
      else if (k === 'tags') o.tags = v.split(/[,;|]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
      else if (k === 'category') {
        const lv = v.toLowerCase();
        o.category = (Object.keys(CATEGORY) as Category[]).find((c) => lv.startsWith(c) || CATEGORY[c].label.toLowerCase().startsWith(lv)) || undefined;
      } else o[k] = v;
    });
    return o;
  }).filter((o) => Object.keys(o).length);
}

export function csvCell(v: unknown) {
  const s = Array.isArray(v) ? v.join('; ') : String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
