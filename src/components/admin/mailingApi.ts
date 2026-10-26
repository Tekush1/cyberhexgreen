// Admin -> Campaigns / Subscribers: API calls, list parsing, and the background send loop.

import { SUPABASE_URL, SUPABASE_KEY, TOKEN_KEY } from './adminApi';

const token = () => sessionStorage.getItem(TOKEN_KEY) || '';

function expired() {
  sessionStorage.removeItem(TOKEN_KEY);
  window.location.reload();
  return new Error('Session expired. Please log in again.');
}

async function readJson(res: Response) {
  const raw = await res.text();
  try { return raw ? JSON.parse(raw) : {}; } catch { return { error: raw.slice(0, 200) }; }
}

/** POST/GET /api/campaign */
export async function campaignApi<T = any>(body?: object): Promise<T> {
  const res = await fetch(body ? '/api/campaign' : '/api/campaign?admin=providers', {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await readJson(res);
  if (res.status === 401) throw expired();
  if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status}).`);
  return data as T;
}

const MISSING = 'Mailing tables are missing: run supabase/mailing.sql in Supabase (SQL Editor → Run).';

/** Supabase RPC as the admin. */
export async function sbRpc<T = any>(fn: string, args: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await readJson(res);
  if (res.status === 401) throw expired();
  if (!res.ok) throw new Error(['PGRST202', 'PGRST205', '42883', '42P01'].includes(data?.code) ? MISSING : data?.message || `Request failed (${res.status}).`);
  return data as T;
}

/** Supabase REST read as the admin. Returns rows plus the total count. */
export async function sbRows<T = any>(path: string, opts: { from?: number; to?: number } = {}): Promise<{ rows: T[]; total: number }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token()}`,
      Prefer: 'count=exact',
      ...(opts.to !== undefined ? { Range: `${opts.from ?? 0}-${opts.to}`, 'Range-Unit': 'items' } : {}),
    },
  });
  const data = await readJson(res);
  if (res.status === 401) throw expired();
  if (!res.ok) throw new Error(['PGRST205', '42P01'].includes(data?.code) ? MISSING : data?.message || `Request failed (${res.status}).`);
  const total = Number((res.headers.get('content-range') || '').split('/')[1]) || (Array.isArray(data) ? data.length : 0);
  return { rows: data as T[], total };
}

/** Insert one row as the admin and return it. */
export async function sbInsert<T = any>(table: string, row: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  const data = await readJson(res);
  if (res.status === 401) throw expired();
  if (!res.ok) throw new Error(['PGRST205', '42P01'].includes(data?.code) ? MISSING : data?.message || `Request failed (${res.status}).`);
  return (Array.isArray(data) ? data[0] : data) as T;
}

export async function sbWrite(method: 'PATCH' | 'DELETE', path: string, body?: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw expired();
  if (!res.ok) { const d = await readJson(res); throw new Error(d?.message || `Request failed (${res.status}).`); }
}

// ---------- Lists: paste, CSV, TSV, "Name <email>" ----------
const EMAIL_RE = /[^\s<>,;"'()[\]]+@[^\s<>,;"'()[\]]+\.[a-z]{2,}/i;

export interface Person { email: string; name: string }

/**
 * Reads people from pasted text or a CSV/TSV file. Any column layout works: the cell that looks like an email
 * is the email, a column called "name" (or first/last name) is the name, otherwise the other text cells are the name.
 */
export function parsePeople(text: string): { people: Person[]; bad: number; dupes: number } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const split = (l: string) => {
    const delim = l.includes('\t') ? '\t' : l.includes(';') && !l.includes(',') ? ';' : ',';
    const cells: string[] = [];
    let cur = '';
    let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === delim && !q) { cells.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  // Header row → name columns
  let nameCols: number[] | null = null;
  if (lines.length && !EMAIL_RE.test(lines[0])) {
    const h = split(lines[0]).map((c) => c.toLowerCase());
    const full = h.findIndex((c) => /^(full ?name|name|participant|student name|your name)$/.test(c));
    const first = h.findIndex((c) => /^(first ?name|given ?name)$/.test(c));
    const last = h.findIndex((c) => /^(last ?name|surname|family ?name)$/.test(c));
    nameCols = full >= 0 ? [full] : first >= 0 ? [first, ...(last >= 0 ? [last] : [])] : [];
  }
  const seen = new Set<string>();
  const people: Person[] = [];
  let bad = 0;
  let dupes = 0;
  lines.forEach((line, i) => {
    if (i === 0 && nameCols) return;
    const m = EMAIL_RE.exec(line);
    if (!m) { bad++; return; }
    const email = m[0].toLowerCase().replace(/^mailto:/, '');
    if (seen.has(email)) { dupes++; return; }
    seen.add(email);
    let name = '';
    const angle = /^\s*"?([^"<]*?)"?\s*<[^>]+>/.exec(line);
    if (angle) name = angle[1];
    else {
      const cells = split(line);
      if (nameCols && nameCols.length) name = nameCols.map((c) => cells[c] || '').join(' ');
      else name = cells.filter((c) => c && !EMAIL_RE.test(c) && !/^\+?[\d\s\-()]{6,}$/.test(c)).slice(0, 2).join(' ');
    }
    people.push({ email, name: name.replace(/\s+/g, ' ').trim().slice(0, 120) });
  });
  return { people, bad, dupes };
}

export const cleanTag = (t: string) => t.trim().toLowerCase().replace(/[^a-z0-9:_\-. ]/g, '').replace(/\s+/g, '-').slice(0, 60);

/** A cell that starts with = + - @ (or a tab/CR) runs as a formula in Excel; a leading ' keeps it as text. */
const csvCell = (c: string | number | null | undefined) => {
  const s = String(c ?? '');
  return `"${(typeof c === 'string' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Background send loop (survives switching admin tabs) ----------
export interface Progress { sent: number; failed: number; pending: number; status: string; note: string; providers?: Record<string, number> }
type Listener = () => void;

export const sender = {
  running: new Map<string, Progress>(),
  listeners: new Set<Listener>(),
  stopRequested: new Set<string>(),
  emit() { this.listeners.forEach((l) => l()); },
  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; },

  async run(id: string) {
    if (this.running.has(id)) return;
    this.stopRequested.delete(id);
    this.running.set(id, { sent: 0, failed: 0, pending: 1, status: 'sending', note: '' });
    this.emit();
    let errors = 0;
    try {
      while (!this.stopRequested.has(id)) {
        let p: Progress & { batch?: number };
        try {
          p = await campaignApi({ action: 'send', id });
          errors = 0;
        } catch (e) {
          if (++errors >= 3) {
            this.running.set(id, { ...(this.running.get(id) as Progress), status: 'paused', note: e instanceof Error ? e.message : 'Network error' });
            break;
          }
          await new Promise((r) => setTimeout(r, 2000 * errors));
          continue;
        }
        this.running.set(id, { ...p, note: p.note || '' });
        this.emit();
        if (p.status !== 'sending' || p.pending === 0 || !p.batch) break;
      }
    } finally {
      const last = this.running.get(id);
      this.running.delete(id);
      this.stopRequested.delete(id);
      this.emit();
      window.dispatchEvent(new CustomEvent('cx-campaign-finished', { detail: { id, last } }));
    }
  },
  stop(id: string) { this.stopRequested.add(id); },
};

window.addEventListener('beforeunload', (e) => {
  if (sender.running.size) { e.preventDefault(); e.returnValue = ''; }
});
