// Vercel serverless function: interview slot booking backed by Google Calendar + Google Meet.
//
//   GET  /api/interview?t=<token>                -> { name, slots: ISO[], booked?: ISO }
//   POST /api/interview  { t, start }            -> { meetLink, start, end }
//
// Admin (header `Authorization: Bearer <Supabase admin session token>`):
//   POST /api/interview  { action:'create-link', name, email, days, kind, topic } -> { link }
//        kind = interview | partnership | ctf | other (topic is the custom title for 'other')
//   GET  /api/interview?admin=list                                   -> { items: [...booked], pending: [...unbooked links] }
//   POST /api/interview  { action:'cancel', eventId }                -> { ok: true }
//   POST /api/interview  { action:'create-link', ..., emails:[...], hideGuests, dur }  -> group link (one slot, many invitees)
//   GET  /api/interview?admin=slots&dur=60                           -> { slotMinutes, slots, taken }
//   POST /api/interview  { action:'book-now', name, emails, kind, topic, dur, hideGuests,
//                          start | custom:{date,time}, force? }       -> admin books directly (free slot, or ANY IST date/time)
//   POST /api/interview  { action:'add-attendees', eventId, emails[] } -> invite more people to a group / admin-made meeting
// The Outreach role may only: see slots/list, create/delete links and book-now, always as kind 'ctf', always as themselves:
// their own hours (outreach_people.availability), their own calls (event private.owner), their own links (payload.o).
// Owners pass `as=<user id>` to do the same for one person.
//
// The token is created with `node scripts/make-interview-link.mjs` and is HMAC-signed,
// so only people you sent a link to can see slots or book.
// Required env vars: see INTERVIEW_BOOKING_SETUP.md

import crypto from 'node:crypto';
import { canAny } from '../server/staff.js';
import { allow, clientIp } from '../server/payments.js';
import { sendMeetingMail, type Rcpt } from '../server/meetingMail.js';
import zlib from 'node:zlib';

// ---------- Config (edit to taste) ----------
const IST_OFFSET_MIN = 330; // Asia/Kolkata, no DST
const CONFIG = {
  slotMinutes: 30,
  daysAhead: 30, // default; editable in Admin -> Availability
  minNoticeHours: 2, // default; editable in Admin -> Availability
  workDays: [1, 2, 3, 4, 5, 6], // 0=Sun ... 6=Sat, in IST
  startHour: 10, // IST
  endHour: 18, // IST
  eventTitle: 'CyberHx',
};

// ---------- Meeting kinds ----------
type Kind = 'interview' | 'partnership' | 'ctf' | 'other';
const KINDS: Kind[] = ['interview', 'partnership', 'ctf', 'other'];
const KIND_TITLE: Record<Kind, string> = {
  interview: 'CyberHx Interview',
  partnership: 'CyberHx Partnership Meet',
  ctf: 'CyberHx CTF Hosting Call',
  other: 'CyberHx Meeting',
};
/** How a meeting is named inside emails (same words as the admin panel). */
const MAIL_TITLE: Record<Kind, string> = { interview: 'interview', partnership: 'partnership call', ctf: 'CTF hosting call', other: 'meeting' };

/** Who and what a booked calendar event is about, for emails and new links. */
function meetingOf(ev: any) {
  const priv = ev.extendedProperties?.private || {};
  const kind: Kind = KINDS.includes(priv.kind) ? priv.kind : 'interview';
  const guests = (ev.attendees || []).filter((a: any) => !a.self && !a.organizer && a.email && String(a.email).toLowerCase() !== String(priv.oe || ''));
  const group = priv.group === '1' || guests.length > 1;
  const rcpts: Rcpt[] = guests.map((a: any) => ({ email: String(a.email).toLowerCase(), name: group ? '' : String(priv.name || a.displayName || '') }));
  const startMs = Date.parse(ev.start?.dateTime || '');
  const endMs = Date.parse(ev.end?.dateTime || '');
  return {
    priv, kind, group, rcpts,
    topic: String(priv.topic || ''),
    name: String(priv.name || guests[0]?.displayName || ev.summary || ''),
    title: kind === 'other' && priv.topic ? String(priv.topic) : MAIL_TITLE[kind],
    hide: ev.guestsCanSeeOtherGuests === false,
    startMs, endMs,
    mins: Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.round((endMs - startMs) / 60_000) : 30,
    meetLink: ev.hangoutLink || null,
  };
}

function eventTitle(kind: Kind, topic: string, name: string) {
  return kind === 'other' && topic ? `CyberHx: ${topic} - ${name}` : `${KIND_TITLE[kind]} - ${name}`;
}

// ---------- Availability (edited in Admin -> Availability, stored in Supabase) ----------
interface Win { s: string; e: string }
interface Availability { slotMinutes: number; daysAhead: number; minNoticeHours: number; weekly: Record<string, Win[]>; dates: Record<string, Win[]> }

const toMin = (t: string) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const validWins = (ws: unknown): Win[] =>
  Array.isArray(ws)
    ? ws.filter((w) => w && /^\d{2}:\d{2}$/.test(w.s) && /^\d{2}:\d{2}$/.test(w.e) && toMin(w.e) > toMin(w.s))
    : [];

function parseAvailability(c: any): Availability | null {
  if (!c || !c.weekly) return null;
  const weekly: Record<string, Win[]> = {};
  for (let d = 0; d < 7; d++) weekly[String(d)] = validWins(c.weekly[String(d)]);
  const dates: Record<string, Win[]> = {};
  for (const [k, v] of Object.entries(c.dates || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) dates[k] = validWins(v);
  const slot = Number(c.slotMinutes);
  const ahead = Number(c.daysAhead);
  const notice = Number(c.minNoticeHours);
  return {
    slotMinutes: [15, 20, 30, 45, 60].includes(slot) ? slot : CONFIG.slotMinutes,
    daysAhead: Number.isFinite(ahead) && ahead >= 1 ? Math.min(ahead, 90) : CONFIG.daysAhead,
    minNoticeHours: Number.isFinite(notice) && notice >= 0 ? Math.min(notice, 168) : CONFIG.minNoticeHours,
    weekly,
    dates,
  };
}

/** One outreach person's own call hours (Admin → Outreach → Call hours). Falls back to the shared CTF hours. */
async function personAvailability(uid: string): Promise<Availability> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (url && anon && UUID_RE.test(uid)) {
    try {
      const r = await fetch(`${url}/rest/v1/rpc/outreach_hours`, {
        method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user: uid }), cache: 'no-store',
      });
      const av = r.ok ? parseAvailability(await r.json()) : null;
      if (av) return av;
    } catch { /* fall back */ }
  }
  return loadAvailability(2);
}

async function loadAvailability(row: 1 | 2 = 1): Promise<Availability> {
  const fallback: Availability = {
    slotMinutes: CONFIG.slotMinutes,
    daysAhead: CONFIG.daysAhead,
    minNoticeHours: CONFIG.minNoticeHours,
    weekly: Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), CONFIG.workDays.includes(d) ? [{ s: `${CONFIG.startHour}:00`.padStart(5, '0'), e: `${CONFIG.endHour}:00`.padStart(5, '0') }] : []]),
    ),
    dates: {},
  };
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('availability: SUPABASE_URL / SUPABASE_ANON_KEY missing on the server - using default hours');
    return fallback;
  }
  try {
    const res = await fetch(`${url}/rest/v1/meeting_availability?id=eq.${row}&select=config`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('availability: Supabase read failed', res.status, '- using default hours');
      return fallback;
    }
    const c = (await res.json())?.[0]?.config;
    if ((!c || !c.weekly) && row === 2) return loadAvailability(1);
    return parseAvailability(c) || fallback;
  } catch (e) {
    console.error('availability: read error', e instanceof Error ? e.message : e);
    return fallback;
  }
}
/** CTF hosting calls use the outreach person's own hours (or the shared CTF hours, row 2); everything else uses row 1. */
const UUID_RE = /^[0-9a-f-]{36}$/i;
const availabilityFor = (k?: string, owner?: string) =>
  k === 'ctf' && owner && UUID_RE.test(owner) ? personAvailability(owner) : loadAvailability(k === 'ctf' ? 2 : 1);
const CALENDAR_ID = process.env.INTERVIEW_CALENDAR_ID || 'primary';

// ---------- Token ----------
interface TokenPayload {
  id: string; // unique invite id
  n: string; // candidate name
  e: string; // candidate email
  x: number; // expiry, unix seconds
  k?: Kind; // meeting kind (missing on old links = interview)
  tp?: string; // custom topic for kind 'other'
  g?: string[]; // group meeting: every invitee email (one link, one slot, many guests)
  hg?: boolean; // group meeting: hide the guest list from attendees
  d?: number; // meeting length in minutes (missing = one slot)
  o?: string; // outreach person's user id: their hours, their calendar slots, their dashboard
  oe?: string; // that person's email: invited to the meeting too
}

// New links are ENCRYPTED (AES-256-GCM) + compressed, so nobody can read the invitee emails out of the URL
// and a 50-person link stays short. Old HMAC-signed links keep working.
const sealKey = () => crypto.createHash('sha256').update(`interview-token-v2:${process.env.INTERVIEW_LINK_SECRET || ''}`).digest();

function sealToken(payload: TokenPayload): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', sealKey(), iv);
  const data = Buffer.concat([c.update(zlib.deflateRawSync(Buffer.from(JSON.stringify(payload)))), c.final()]);
  return `e.${Buffer.concat([iv, c.getAuthTag(), data]).toString('base64url')}`;
}

function openSealed(raw: string): TokenPayload | null {
  try {
    const buf = Buffer.from(raw, 'base64url');
    if (buf.length < 29) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', sealKey(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    const plain = Buffer.concat([d.update(buf.subarray(28)), d.final()]);
    return JSON.parse(zlib.inflateRawSync(plain).toString('utf8')) as TokenPayload;
  } catch {
    return null;
  }
}

// ---------- Short links:  https://site/meet/k7m2xq9p ----------
// The payload (name, emails, length...) lives in Supabase `meeting_links` (run supabase/meeting_links.sql once);
// the link only carries an 8-character random code. If that table isn't set up yet we quietly fall back
// to the long encrypted link, so nothing breaks.
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (i l o 0 1)
const CODE_RE = new RegExp(`^[${CODE_CHARS}]{8}$`);
const newCode = () => Array.from(crypto.randomBytes(8), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');

const sb = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
});

/** Saves the payload under a fresh code using the ADMIN's own session. Returns the code, or null if unavailable. */
async function storeShortLink(auth: string, payload: TokenPayload): Promise<string | null> {
  const { url, anon } = sb();
  if (!url || !anon) return null;
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    try {
      const r = await fetch(`${url}/rest/v1/meeting_links`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ code, payload, expires_at: new Date(payload.x * 1000).toISOString() }),
      });
      if (r.ok) return code;
      if (r.status === 409) continue; // code already taken -> try another
      console.error('short link: could not store (run supabase/meeting_links.sql?)', r.status);
      return null;
    } catch (e) {
      console.error('short link: store error', e instanceof Error ? e.message : e);
      return null;
    }
  }
  return null;
}

async function loadShortLink(code: string): Promise<TokenPayload | null> {
  const { url, anon } = sb();
  if (!url || !anon) return null;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/get_meeting_link`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const p = (await r.json()) as TokenPayload | null;
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

/** Links the admin created that nobody has booked yet (admin session only: RLS lets only admins read the table). */
async function listPendingLinks(auth: string, origin: string, bookedIds: Set<string>) {
  const { url, anon } = sb();
  if (!url || !anon) return [];
  try {
    const q = new URLSearchParams({
      select: 'code,payload,expires_at,created_at',
      expires_at: `gt.${new Date().toISOString()}`,
      order: 'created_at.desc',
      limit: '100',
    });
    const r = await fetch(`${url}/rest/v1/meeting_links?${q}`, { headers: { apikey: anon, Authorization: auth }, cache: 'no-store' });
    if (!r.ok) {
      console.error('pending links: could not read', r.status);
      return [];
    }
    const rows = (await r.json()) as Array<{ code: string; payload: TokenPayload; expires_at: string; created_at: string }>;
    return rows
      .filter((row) => row.payload && row.payload.id && !bookedIds.has(row.payload.id))
      .map((row) => {
        const p = row.payload;
        const guests = p.g && p.g.length ? p.g : [p.e];
        return {
          code: row.code,
          link: `${origin}/meet/${row.code}`,
          name: p.n,
          email: p.e,
          group: guests.length > 1,
          guests,
          kind: (p.k && KINDS.includes(p.k) ? p.k : 'interview') as Kind,
          topic: p.tp || '',
          owner: p.o || '',
          expiresAt: row.expires_at,
          createdAt: row.created_at,
        };
      });
  } catch (e) {
    console.error('pending links: error', e instanceof Error ? e.message : e);
    return [];
  }
}

async function deleteShortLink(auth: string, code: string): Promise<boolean> {
  const { url, anon } = sb();
  if (!url || !anon || !CODE_RE.test(code)) return false;
  const r = await fetch(`${url}/rest/v1/meeting_links?code=eq.${code}`, { method: 'DELETE', headers: { apikey: anon, Authorization: auth } });
  return r.ok;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  const secret = process.env.INTERVIEW_LINK_SECRET;
  if (!secret || typeof token !== 'string') return null;
  if (CODE_RE.test(token)) {
    const p = await loadShortLink(token);
    return p && p.id && p.e && p.x >= Date.now() / 1000 ? p : null;
  }
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  let payload: TokenPayload | null = null;
  if (body === 'e') {
    payload = openSealed(sig); // new encrypted link
  } else {
    // legacy HMAC-signed link (also what scripts/make-interview-link.mjs makes)
    const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    } catch {
      return null;
    }
  }
  if (!payload || !payload.id || !payload.e || payload.x < Date.now() / 1000) return null;
  return payload;
}

const signToken = sealToken;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LINK_GUESTS = 50; // people in one booking LINK
const MAX_GUESTS = 100; // people in one meeting the admin books directly
function cleanEmails(list: unknown, max = MAX_GUESTS): string[] {
  const raw = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/[\s,;]+/) : [];
  return Array.from(new Set(raw.map((x) => String(x).trim().toLowerCase()).filter((x) => EMAIL_RE.test(x) && x.length <= 200))).slice(0, max);
}
const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 180];
/** Meeting length in minutes; never shorter than one slot. */
const cleanDur = (d: unknown, slot: number) => {
  const n = Number(d);
  return DURATIONS.includes(n) && n > slot ? n : slot;
};

// "2026-10-12" + "09:30" (IST) -> unix ms
function istToMs(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MIN * 60_000;
}
const attendeesOf = (inv: TokenPayload): string[] => (inv.g && inv.g.length ? inv.g : [inv.e]);

class SlotTakenError extends Error {}
class AlreadyBookedError extends Error {}

// ---------- Google API ----------
let cachedAccess: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedAccess && cachedAccess.exp > Date.now() + 60_000) return cachedAccess.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error('Google auth failed');
  cachedAccess = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cachedAccess.token;
}

async function gcal(path: string, init?: RequestInit) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Calendar error ${res.status}`);
  return data;
}

/** Busy times for ONE outreach person: only their own CTF calls count (each person runs their own diary). */
async function ownerBusy(owner: string, from: Date, to: Date): Promise<Array<[number, number]>> {
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', maxResults: '250' });
  const data = await gcal(`/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${q}`);
  return (data.items || [])
    .filter((e: any) => e.status !== 'cancelled' && e.start?.dateTime && (e.extendedProperties?.private?.owner === owner))
    .map((e: any) => [Date.parse(e.start.dateTime), Date.parse(e.end.dateTime)] as [number, number]);
}

async function busyRanges(from: Date, to: Date, owner?: string): Promise<Array<[number, number]>> {
  if (owner) return ownerBusy(owner, from, to);
  const data = await gcal('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: CALENDAR_ID }],
    }),
  });
  const busy = data.calendars?.[CALENDAR_ID]?.busy || [];
  return busy.map((b: { start: string; end: string }) => [Date.parse(b.start), Date.parse(b.end)]);
}

async function existingBooking(inviteId: string): Promise<string | null> {
  const q = new URLSearchParams({
    privateExtendedProperty: `inviteId=${inviteId}`,
    timeMin: new Date(Date.now() - 120 * 86_400_000).toISOString(),
    singleEvents: 'true',
    maxResults: '1',
  });
  const data = await gcal(`/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${q}`);
  const ev = data.items?.[0];
  return ev?.start?.dateTime || null;
}

async function listBookings() {
  const q = new URLSearchParams({
    q: CONFIG.eventTitle,
    timeMin: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    timeMax: new Date(Date.now() + 120 * 86_400_000).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await gcal(`/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${q}`);
  return (data.items || [])
    .filter((ev: any) => ev.extendedProperties?.private?.inviteId)
    .map((ev: any) => {
      const priv = ev.extendedProperties.private;
      const guests = (ev.attendees || []).filter((a: any) => !a.self && !a.organizer && String(a.email || '').toLowerCase() !== String(priv.oe || ''));
      const group = priv.group === '1' || guests.length > 1;
      return {
        eventId: ev.id,
        inviteId: priv.inviteId as string,
        name: priv.name || guests[0]?.displayName || ev.summary,
        email: guests[0]?.email || '',
        status: guests[0]?.responseStatus || 'needsAction',
        group,
        canAdd: priv.group === '1' || priv.adm === '1',
        attendees: guests.map((a: any) => ({ email: a.email, status: a.responseStatus || 'needsAction' })),
        start: ev.start?.dateTime,
        end: ev.end?.dateTime,
        meetLink: ev.hangoutLink || null,
        kind: (KINDS.includes(priv.kind) ? priv.kind : 'interview') as Kind,
        topic: priv.topic || '',
        owner: priv.owner || '',
      };
    });
}

// Creates the Calendar event (+ Meet link) WITHOUT inviting anyone yet. If two people grabbed the same
// slot at the same instant, the booking created first wins and the later one is silently removed -
// nobody gets a stray invite or cancellation mail. Only the winner's guests are invited.
async function createEvent(o: {
  inviteId: string; kind: Kind; topic: string; name: string; emails: string[]; hide: boolean;
  startMs: number; endMs: number; admin?: boolean; allowOverlap?: boolean; owner?: string; ownerEmail?: string;
}) {
  const cal = encodeURIComponent(CALENDAR_ID);
  const group = o.emails.length > 1;
  const event = await gcal(`/calendars/${cal}/events?conferenceDataVersion=1&sendUpdates=none`, {
    method: 'POST',
    body: JSON.stringify({
      summary: eventTitle(o.kind, o.topic, o.name),
      // Every guest can read the description, so group events never list the other invitees' emails.
      description: `${o.kind === 'other' && o.topic ? o.topic : KIND_TITLE[o.kind]} with ${o.name}${group ? '' : ` (${o.emails[0]})`}.\nBooked via the CyberHx website.`,
      start: { dateTime: new Date(o.startMs).toISOString() },
      end: { dateTime: new Date(o.endMs).toISOString() },
      guestsCanSeeOtherGuests: !(group && o.hide),
      transparency: 'opaque',
      extendedProperties: {
        private: {
          inviteId: o.inviteId, kind: o.kind, topic: o.topic, name: o.name, ...(group ? { group: '1' } : {}), ...(o.admin ? { adm: '1' } : {}),
          ...(o.owner ? { owner: o.owner } : {}), ...(o.ownerEmail ? { oe: o.ownerEmail } : {}),
        },
      },
      conferenceData: {
        createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
    }),
  });
  const remove = () =>
    gcal(`/calendars/${cal}/events/${encodeURIComponent(event.id)}?sendUpdates=none`, { method: 'DELETE' }).catch(() => {});

  // race check: another website booking overlapping this slot that was created before ours?
  const q = new URLSearchParams({
    timeMin: new Date(o.startMs).toISOString(),
    timeMax: new Date(o.endMs).toISOString(),
    singleEvents: 'true',
    maxResults: '20',
  });
  const near = await gcal(`/calendars/${cal}/events?${q}`);
  const lost = !o.allowOverlap && (near.items || []).some(
    (e: any) =>
      e.id !== event.id &&
      e.status !== 'cancelled' &&
      e.extendedProperties?.private?.inviteId &&
      e.extendedProperties.private.inviteId !== o.inviteId &&
      (e.extendedProperties.private.owner || '') === (o.owner || '') && // each outreach person has their own diary
      ((e.created || '') < (event.created || '') || ((e.created || '') === (event.created || '') && e.id < event.id)),
  );
  if (lost) {
    await remove();
    throw new SlotTakenError();
  }

  // One link = one booking: if the same link was used in parallel, only the earliest event survives.
  const same = await gcal(`/calendars/${cal}/events?${new URLSearchParams({
    privateExtendedProperty: `inviteId=${o.inviteId}`, singleEvents: 'true', maxResults: '20',
  })}`);
  const older = (same.items || []).some(
    (e: any) => e.id !== event.id && e.status !== 'cancelled' &&
      ((e.created || '') < (event.created || '') || ((e.created || '') === (event.created || '') && e.id < event.id)),
  );
  if (older) {
    await remove();
    throw new AlreadyBookedError();
  }

  // we own the slot -> now invite everyone (this is the moment the invite emails go out)
  try {
    const done = await gcal(`/calendars/${cal}/events/${encodeURIComponent(event.id)}?conferenceDataVersion=1&sendUpdates=all`, {
      method: 'PATCH',
      body: JSON.stringify({
        attendees: [
          ...o.emails.map((email) => (group ? { email } : { email, displayName: o.name })),
          ...(o.ownerEmail && !o.emails.includes(o.ownerEmail) ? [{ email: o.ownerEmail }] : []),
        ],
      }),
    });
    return { ...event, ...done, hangoutLink: done.hangoutLink || event.hangoutLink };
  } catch (e) {
    await remove();
    throw e;
  }
}

// ---------- Slots ----------
function candidateSlots(now: Date, av: Availability): number[] {
  const slotMs = av.slotMinutes * 60_000;
  const earliest = now.getTime() + av.minNoticeHours * 3_600_000;
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const out: number[] = [];
  for (let d = 0; d <= av.daysAhead; d++) {
    const day = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + d));
    const dateKey = day.toISOString().slice(0, 10);
    // a date override (even an empty one = day off) beats the weekly schedule
    const windows = av.dates[dateKey] ?? av.weekly[String(day.getUTCDay())] ?? [];
    for (const w of windows) {
      for (let m = toMin(w.s); m + av.slotMinutes <= toMin(w.e); m += av.slotMinutes) {
        const startUtc = day.getTime() + m * 60_000 - IST_OFFSET_MIN * 60_000;
        if (startUtc >= earliest) out.push(startUtc);
      }
    }
  }
  return out.filter((s) => s + slotMs > earliest).sort((a, b) => a - b);
}

// free = a start time where the WHOLE meeting (durationMin, default one slot) fits inside your hours and
// nothing is busy; taken = every other start time inside your hours (shown as "Booked" on the page).
async function slotState(now: Date, av: Availability, durationMin?: number, owner?: string): Promise<{ free: number[]; taken: number[] }> {
  const cands = candidateSlots(now, av);
  if (!cands.length) return { free: [], taken: [] };
  const slotMs = av.slotMinutes * 60_000;
  const need = Math.max(1, Math.ceil((durationMin || av.slotMinutes) / av.slotMinutes));
  const busy = await busyRanges(new Date(cands[0]), new Date(cands[cands.length - 1] + slotMs), owner);
  const isBusy = (s: number) => busy.some(([bs, be]) => s < be && s + slotMs > bs);
  const open = new Set(cands.filter((s) => !isBusy(s)));
  const fits = (s: number) => Array.from({ length: need }, (_, i) => s + i * slotMs).every((x) => open.has(x));
  return { free: cands.filter(fits), taken: cands.filter((s) => !fits(s)) };
}

// ---------- Outreach people ----------
type Who = { id: string; email: string };
/** The signed-in outreach person (their user id + login email). */
async function outreachSelf(auth: string): Promise<Who | null> {
  const { url, anon } = sb();
  if (!url || !anon) return null;
  try {
    const [p, me] = await Promise.all(['outreach_me', 'staff_me'].map((fn) =>
      fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    return p?.user_id ? { id: String(p.user_id), email: String(me?.email || '').toLowerCase() } : null;
  } catch { return null; }
}
/** For owners: any outreach person by user id (via the owner-only outreach_team()). */
async function outreachPerson(auth: string, id: string): Promise<Who | null> {
  const { url, anon } = sb();
  if (!url || !anon) return null;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/outreach_team`, { method: 'POST', headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
    const rows = r.ok ? ((await r.json()) as Array<{ user_id: string; login_email: string }>) : [];
    const p = rows.find((x) => x.user_id === id);
    return p ? { id, email: String(p.login_email || '').toLowerCase() } : null;
  } catch { return null; }
}

// ---------- Handler ----------
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN || !process.env.INTERVIEW_LINK_SECRET) {
      return res.status(500).json({ error: 'Booking is not configured yet.' });
    }

    // ----- Admin actions -----
    const wantsAdmin =
      (req.method === 'GET' && req.query?.admin) ||
      (req.method === 'POST' && typeof req.body === 'object' && req.body?.action);
    if (wantsAdmin) {
      const authz = String(req.headers?.authorization || '');
      const fullMeetings = await canAny(authz, ['meetings']);
      // The Outreach role only handles "CTF hosting call" links: see free slots, list, create and delete them.
      const outreachOnly = !fullMeetings && (await canAny(authz, ['outreach']));
      if (!fullMeetings && !outreachOnly) return res.status(401).json({ error: 'Unauthorized' });
      if (outreachOnly && req.method === 'POST' && !['create-link', 'delete-link', 'book-now'].includes(String(req.body?.action))) {
        return res.status(403).json({ error: 'Not allowed for the Outreach role.' });
      }
      // Whose CTF calls are these? An outreach person: always their own. An owner: anyone, via `as` (a person's user id).
      const asId = String((req.method === 'GET' ? req.query?.as : req.body?.as) || '');
      const who = outreachOnly ? await outreachSelf(authz) : UUID_RE.test(asId) ? await outreachPerson(authz, asId) : null;
      if (outreachOnly && !who) return res.status(403).json({ error: 'Your outreach profile is not set up yet. Ask the owner.' });

      if (req.method === 'GET') {
        if (req.query?.admin === 'slots') {
          const k = outreachOnly ? 'ctf' : String(req.query?.kind || '');
          const owner = k === 'ctf' ? who?.id : undefined;
          const av = await availabilityFor(k, owner);
          const dur = cleanDur(req.query?.dur, av.slotMinutes);
          const st = await slotState(new Date(), av, dur, owner);
          return res.status(200).json({
            slotMinutes: dur,
            slots: st.free.map((s) => new Date(s).toISOString()),
            taken: st.taken.map((s) => new Date(s).toISOString()),
          });
        }
        const all = await listBookings();
        const items = outreachOnly ? all.filter((i: any) => i.kind === 'ctf' && i.owner === who!.id) : all;
        const origin = (process.env.SITE_URL || 'https://cyberhx.com').replace(/\/$/, '');
        const pending = await listPendingLinks(String(req.headers.authorization), origin, new Set(items.map((i: any) => i.inviteId)));
        return res.status(200).json({ items, pending });
      }

      const { action, name, email, days, eventId, kind, topic, emails, hideGuests, start, dur, custom, force } = req.body;

      if (action === 'create-link') {
        const cleanName = String(name || '').trim().slice(0, 80);
        const guestList = cleanEmails(emails, MAX_LINK_GUESTS);
        const isGroup = Array.isArray(emails) || (typeof emails === 'string' && emails.trim() !== '');
        const cleanEmail = isGroup ? guestList[0] || '' : String(email || '').trim().toLowerCase();
        const validDays = Math.min(Math.max(Number(days) || 7, 1), 60);
        if (!cleanName || !EMAIL_RE.test(cleanEmail)) {
          return res.status(400).json({ error: isGroup ? 'Meeting title and at least one valid email are required.' : 'Valid name and email are required.' });
        }
        const cleanKind: Kind = outreachOnly ? 'ctf' : KINDS.includes(kind) ? kind : 'interview';
        const cleanTopic = cleanKind === 'other' ? String(topic || '').trim().slice(0, 80) : '';
        if (cleanKind === 'other' && !cleanTopic) {
          return res.status(400).json({ error: 'Please write a topic for this meeting.' });
        }
        const payload: TokenPayload = {
          id: crypto.randomUUID(),
          n: cleanName,
          e: cleanEmail,
          x: Math.floor(Date.now() / 1000) + validDays * 86400,
          k: cleanKind,
          ...(cleanTopic ? { tp: cleanTopic } : {}),
          ...(isGroup ? { g: guestList, hg: !!hideGuests } : {}),
          ...(Number(dur) > 0 ? { d: cleanDur(dur, 0) || undefined } : {}),
          ...(cleanKind === 'ctf' && who ? { o: who.id, oe: who.email } : {}),
        };
        const origin = (process.env.SITE_URL || 'https://cyberhx.com').replace(/\/$/, '');
        const code = await storeShortLink(String(req.headers.authorization), payload);
        if (code) return res.status(200).json({ link: `${origin}/meet/${code}`, short: true });
        // fallback: self-contained encrypted link (long, but works with no database setup)
        return res.status(200).json({ link: `${origin}/book-interview?t=${signToken(payload)}`, short: false });
      }

      if (action === 'delete-link') {
        const ok = await deleteShortLink(String(req.headers.authorization), String(req.body.code || ''));
        return ok ? res.status(200).json({ ok: true }) : res.status(400).json({ error: 'Could not delete this link.' });
      }

      if (action === 'book-now') {
        const cleanName = String(name || '').trim().slice(0, 80);
        const guestList = Array.isArray(emails) || (typeof emails === 'string' && emails.trim() !== '') ? cleanEmails(emails) : cleanEmails([email]);
        const cleanKind: Kind = outreachOnly ? 'ctf' : KINDS.includes(kind) ? kind : 'interview'; // Outreach books CTF hosting calls only
        const cleanTopic = cleanKind === 'other' ? String(topic || '').trim().slice(0, 80) : '';
        if (!cleanName || !guestList.length) return res.status(400).json({ error: 'Name/title and at least one valid email are required.' });
        if (cleanKind === 'other' && !cleanTopic) return res.status(400).json({ error: 'Please write a topic for this meeting.' });
        const owner = cleanKind === 'ctf' ? who?.id : undefined;
        const av = await availabilityFor(cleanKind, owner);
        const mins = cleanDur(dur, av.slotMinutes);

        let startMs: number;
        if (custom && typeof custom === 'object') {
          // any IST date/time, even outside your normal hours - only a calendar clash can stop it
          const t = istToMs(String(custom.date || ''), String(custom.time || ''));
          if (t === null) return res.status(400).json({ error: 'Please choose a valid date and time.' });
          if (t < Date.now()) return res.status(400).json({ error: 'That date/time is in the past.' });
          startMs = t;
          if (!force) {
            const busy = await busyRanges(new Date(startMs), new Date(startMs + mins * 60_000), owner);
            if (busy.some(([bs, be]) => startMs < be && startMs + mins * 60_000 > bs)) {
              return res.status(409).json({ conflict: true, error: 'You already have something booked at that time.' });
            }
          }
        } else {
          startMs = Date.parse(String(start || ''));
          if (Number.isNaN(startMs)) return res.status(400).json({ error: 'Pick a date and time first.' });
          if (!(await slotState(new Date(), av, mins, owner)).free.includes(startMs)) {
            return res.status(409).json({ error: 'That slot is no longer free. Pick another.' });
          }
        }
        try {
          const event = await createEvent({
            inviteId: crypto.randomUUID(), kind: cleanKind, topic: cleanTopic, name: cleanName,
            emails: guestList, hide: !!hideGuests, startMs, endMs: startMs + mins * 60_000, admin: true,
            allowOverlap: !!(custom && force), // admin knowingly double-books
            ...(owner && who ? { owner, ownerEmail: who.email } : {}),
          });
          return res.status(200).json({ eventId: event.id, meetLink: event.hangoutLink || null, start: new Date(startMs).toISOString(), guests: guestList.length });
        } catch (e) {
          if (e instanceof SlotTakenError) return res.status(409).json({ error: 'That slot was just taken. Pick another.' });
          throw e;
        }
      }

      if (action === 'add-attendees') {
        const add = cleanEmails(emails);
        if (!add.length) return res.status(400).json({ error: 'No valid email addresses found.' });
        const cal = encodeURIComponent(CALENDAR_ID);
        const id = encodeURIComponent(String(eventId || ''));
        const ev = await gcal(`/calendars/${cal}/events/${id}`);
        const priv = ev.extendedProperties?.private;
        if (!priv?.inviteId || (priv.group !== '1' && priv.adm !== '1')) {
          return res.status(400).json({ error: 'People can only be added to group meetings.' });
        }
        const current: Array<{ email: string }> = ev.attendees || [];
        const have = new Set(current.map((a) => String(a.email).toLowerCase()));
        const fresh = add.filter((e) => !have.has(e));
        if (current.length + fresh.length > MAX_GUESTS) {
          return res.status(400).json({ error: `Maximum ${MAX_GUESTS} people per meeting.` });
        }
        if (fresh.length) {
          await gcal(`/calendars/${cal}/events/${id}?sendUpdates=all`, {
            method: 'PATCH',
            body: JSON.stringify({
              attendees: [...current, ...fresh.map((e) => ({ email: e }))],
              extendedProperties: { private: { ...priv, group: '1' } },
            }),
          });
        }
        return res.status(200).json({ added: fresh.length, skipped: add.length - fresh.length });
      }

      const auth = String(req.headers.authorization || '');
      const note = String(req.body.note || '').trim().slice(0, 1500);
      const notify = req.body.notify !== false;

      if (action === 'cancel') {
        const id = String(eventId || '');
        const cal = encodeURIComponent(CALENDAR_ID);
        const ev = await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}`);
        if (!ev.extendedProperties?.private?.inviteId) {
          return res.status(400).json({ error: 'Not an interview booking.' });
        }
        const m = meetingOf(ev);
        // Google removes it from their calendar (and tells them); our email explains it in CyberHx words.
        await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}?sendUpdates=all`, { method: 'DELETE' });
        const mail = notify
          ? await sendMeetingMail(auth, 'cancelled', { title: m.title, start: new Date(m.startMs).toISOString(), end: new Date(m.endMs).toISOString(), note }, m.rcpts)
          : { sent: 0 };
        return res.status(200).json({ ok: true, emailed: mail.sent, emailError: mail.error || null });
      }

      // Move a booked meeting to a new time you choose: same Meet link, calendar invite updated for everyone,
      // plus a CyberHx "new time" email.
      if (action === 'reschedule') {
        const id = String(eventId || '');
        const cal = encodeURIComponent(CALENDAR_ID);
        const ev = await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}`);
        if (!ev.extendedProperties?.private?.inviteId) return res.status(400).json({ error: 'Not a booking made here.' });
        const m = meetingOf(ev);
        const owner = m.kind === 'ctf' && m.priv.owner ? String(m.priv.owner) : undefined;
        const av = await availabilityFor(m.kind, owner);
        const mins = Number(dur) > 0 ? cleanDur(dur, av.slotMinutes) : m.mins > 0 ? m.mins : av.slotMinutes;

        let startMs: number;
        if (custom && typeof custom === 'object') {
          const t = istToMs(String(custom.date || ''), String(custom.time || ''));
          if (t === null) return res.status(400).json({ error: 'Please choose a valid date and time.' });
          if (t < Date.now()) return res.status(400).json({ error: 'That date/time is in the past.' });
          startMs = t;
          if (!force) {
            const busy = await busyRanges(new Date(startMs), new Date(startMs + mins * 60_000), owner);
            // The meeting's own current slot does not count as a clash.
            const clash = busy.some(([bs, be]) => startMs < be && startMs + mins * 60_000 > bs && !(bs >= m.startMs && be <= m.endMs));
            if (clash) return res.status(409).json({ conflict: true, error: 'You already have something booked at that time.' });
          }
        } else {
          startMs = Date.parse(String(start || ''));
          if (Number.isNaN(startMs)) return res.status(400).json({ error: 'Pick a new date and time first.' });
          if (!(await slotState(new Date(), av, mins, owner)).free.includes(startMs)) {
            return res.status(409).json({ error: 'That slot is no longer free. Pick another.' });
          }
        }
        if (startMs === m.startMs && mins === m.mins) return res.status(400).json({ error: 'That is the same time as now.' });

        const endMs = startMs + mins * 60_000;
        const done = await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}?conferenceDataVersion=1&sendUpdates=all`, {
          method: 'PATCH',
          body: JSON.stringify({ start: { dateTime: new Date(startMs).toISOString() }, end: { dateTime: new Date(endMs).toISOString() } }),
        });
        const meetLink = done.hangoutLink || m.meetLink;
        const mail = notify
          ? await sendMeetingMail(auth, 'moved', {
              title: m.title, start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString(),
              meetLink, previousStart: new Date(m.startMs).toISOString(), note,
            }, m.rcpts)
          : { sent: 0 };
        return res.status(200).json({ start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString(), meetLink, emailed: mail.sent, emailError: mail.error || null });
      }

      // Let them choose the new time: a fresh booking link for the same people, the old meeting removed,
      // and a CyberHx "please pick a new time" email with the link.
      if (action === 'reschedule-link') {
        const id = String(eventId || '');
        const cal = encodeURIComponent(CALENDAR_ID);
        const ev = await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}`);
        if (!ev.extendedProperties?.private?.inviteId) return res.status(400).json({ error: 'Not a booking made here.' });
        const m = meetingOf(ev);
        if (!m.rcpts.length) return res.status(400).json({ error: 'This meeting has no guests to send a link to.' });
        const validDays = Math.min(Math.max(Number(days) || 7, 1), 60);
        const payload: TokenPayload = {
          id: crypto.randomUUID(),
          n: m.name.slice(0, 80) || 'Guest',
          e: m.rcpts[0].email,
          x: Math.floor(Date.now() / 1000) + validDays * 86400,
          k: m.kind,
          ...(m.kind === 'other' && m.topic ? { tp: m.topic.slice(0, 80) } : {}),
          ...(m.group ? { g: m.rcpts.map((r) => r.email).slice(0, MAX_LINK_GUESTS), hg: m.hide } : {}),
          ...(m.mins > 0 ? { d: cleanDur(m.mins, 0) || undefined } : {}),
          ...(m.priv.owner ? { o: String(m.priv.owner), ...(m.priv.oe ? { oe: String(m.priv.oe) } : {}) } : {}),
        };
        const origin = (process.env.SITE_URL || 'https://cyberhx.com').replace(/\/$/, '');
        const code = await storeShortLink(auth, payload);
        const link = code ? `${origin}/meet/${code}` : `${origin}/book-interview?t=${signToken(payload)}`;
        await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}?sendUpdates=all`, { method: 'DELETE' });
        const mail = notify
          ? await sendMeetingMail(auth, 'reschedule', {
              title: m.title, start: new Date(m.startMs).toISOString(), end: new Date(m.endMs).toISOString(), bookingLink: link, note,
            }, m.rcpts)
          : { sent: 0 };
        return res.status(200).json({ link, emailed: mail.sent, emailError: mail.error || null });
      }

      return res.status(400).json({ error: 'Unknown action.' });
    }

    if (req.method === 'GET') {
      const invite = await verifyToken(String(req.query?.t || ''));
      if (!invite) return res.status(401).json({ error: 'This link is invalid or has expired.' });

      const groupSize = invite.g && invite.g.length > 1 ? invite.g.length : 0;
      const booked = await existingBooking(invite.id);
      if (booked) return res.status(200).json({ name: invite.n, kind: invite.k || 'interview', topic: invite.tp || '', groupSize, booked });

      const av = await availabilityFor(invite.k, invite.o);
      const mins = cleanDur(invite.d, av.slotMinutes);
      const st = await slotState(new Date(), av, mins, invite.k === 'ctf' ? invite.o : undefined);
      return res.status(200).json({
        name: invite.n, kind: invite.k || 'interview', topic: invite.tp || '', groupSize, slotMinutes: av.slotMinutes, durationMinutes: mins,
        slots: st.free.map((s) => new Date(s).toISOString()),
        taken: st.taken.map((s) => new Date(s).toISOString()),
      });
    }

    if (req.method === 'POST') {
      if (!(await allow('interview.book', clientIp(req), 10, 600))) {
        return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const invite = await verifyToken(String(body.t || ''));
      if (!invite) return res.status(401).json({ error: 'This link is invalid or has expired.' });

      const startMs = Date.parse(String(body.start || ''));
      if (Number.isNaN(startMs)) return res.status(400).json({ error: 'Invalid slot.' });

      if (await existingBooking(invite.id)) {
        return res.status(409).json({ error: 'This link has already been used to book a slot.' });
      }

      // Re-validate: slot must be one we offer AND still free right now.
      const av = await availabilityFor(invite.k, invite.o);
      const mins = cleanDur(invite.d, av.slotMinutes);
      const free = (await slotState(new Date(), av, mins, invite.k === 'ctf' ? invite.o : undefined)).free;
      if (!free.includes(startMs)) {
        return res.status(409).json({ error: 'Sorry, that slot was just taken. Please pick another.' });
      }

      const endMs = startMs + mins * 60_000;
      const kind: Kind = invite.k && KINDS.includes(invite.k) ? invite.k : 'interview';
      let event;
      try {
        event = await createEvent({
          inviteId: invite.id, kind, topic: invite.tp || '', name: invite.n,
          emails: attendeesOf(invite), hide: !!invite.hg, startMs, endMs,
          ...(kind === 'ctf' && invite.o ? { owner: invite.o, ownerEmail: invite.oe } : {}),
        });
      } catch (e) {
        if (e instanceof SlotTakenError) return res.status(409).json({ error: 'Sorry, that slot was just taken. Please pick another.' });
        if (e instanceof AlreadyBookedError) return res.status(409).json({ error: 'This link has already been used to book a slot.' });
        throw e;
      }

      return res.status(200).json({
        meetLink: event.hangoutLink || null,
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('interview api error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
