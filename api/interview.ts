// Vercel serverless function: interview slot booking backed by Google Calendar + Google Meet.
//
//   GET  /api/interview?t=<token>                -> { name, slots: ISO[], booked?: ISO }
//   POST /api/interview  { t, start }            -> { meetLink, start, end }
//
// Admin (header `Authorization: Bearer <Supabase admin session token>`):
//   POST /api/interview  { action:'create-link', name, email, days } -> { link }
//   GET  /api/interview?admin=list                                   -> { items: [...] }
//   POST /api/interview  { action:'cancel', eventId }                -> { ok: true }
//
// The token is created with `node scripts/make-interview-link.mjs` and is HMAC-signed,
// so only people you sent a link to can see slots or book.
// Required env vars: see INTERVIEW_BOOKING_SETUP.md

import crypto from 'node:crypto';

// ---------- Config (edit to taste) ----------
const IST_OFFSET_MIN = 330; // Asia/Kolkata, no DST
const CONFIG = {
  slotMinutes: 30,
  daysAhead: 14,
  minNoticeHours: 12,
  workDays: [1, 2, 3, 4, 5, 6], // 0=Sun ... 6=Sat, in IST
  startHour: 10, // IST
  endHour: 18, // IST
  eventTitle: 'CyberHx Interview',
};
const CALENDAR_ID = process.env.INTERVIEW_CALENDAR_ID || 'primary';

// ---------- Token ----------
interface TokenPayload {
  id: string; // unique invite id
  n: string; // candidate name
  e: string; // candidate email
  x: number; // expiry, unix seconds
}

function verifyToken(token: string): TokenPayload | null {
  const secret = process.env.INTERVIEW_LINK_SECRET;
  if (!secret || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.id || !payload.e || payload.x < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.INTERVIEW_LINK_SECRET || '').update(body).digest('base64url');
  return `${body}.${sig}`;
}

// Admin = a Supabase Auth user listed in the `admins` table (see supabase/admin_security.sql).
// We forward the user's own JWT to the is_admin() SQL function, so no service key is needed.
async function isAdmin(req: any): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const auth = String(req.headers?.authorization || '');
  if (!url || !anon || !auth.startsWith('Bearer ')) return false;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
      body: '{}',
    });
    return res.ok && (await res.json()) === true;
  } catch {
    return false;
  }
}

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

async function busyRanges(from: Date, to: Date): Promise<Array<[number, number]>> {
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
    timeMax: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });
  const data = await gcal(`/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${q}`);
  return (data.items || [])
    .filter((ev: any) => ev.extendedProperties?.private?.inviteId)
    .map((ev: any) => ({
      eventId: ev.id,
      name: ev.attendees?.[0]?.displayName || ev.summary,
      email: ev.attendees?.[0]?.email || '',
      status: ev.attendees?.[0]?.responseStatus || 'needsAction',
      start: ev.start?.dateTime,
      end: ev.end?.dateTime,
      meetLink: ev.hangoutLink || null,
    }));
}

// ---------- Slots ----------
function candidateSlots(now: Date): number[] {
  const slotMs = CONFIG.slotMinutes * 60_000;
  const earliest = now.getTime() + CONFIG.minNoticeHours * 3_600_000;
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const out: number[] = [];
  for (let d = 0; d <= CONFIG.daysAhead; d++) {
    const day = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + d));
    if (!CONFIG.workDays.includes(day.getUTCDay())) continue;
    for (let m = CONFIG.startHour * 60; m + CONFIG.slotMinutes <= CONFIG.endHour * 60; m += CONFIG.slotMinutes) {
      const startUtc = day.getTime() + m * 60_000 - IST_OFFSET_MIN * 60_000;
      if (startUtc >= earliest) out.push(startUtc);
    }
  }
  return out.filter((s) => s + slotMs > earliest);
}

async function freeSlots(now: Date): Promise<number[]> {
  const cands = candidateSlots(now);
  if (!cands.length) return [];
  const slotMs = CONFIG.slotMinutes * 60_000;
  const busy = await busyRanges(new Date(cands[0]), new Date(cands[cands.length - 1] + slotMs));
  return cands.filter((s) => !busy.some(([bs, be]) => s < be && s + slotMs > bs));
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
      if (!(await isAdmin(req))) return res.status(401).json({ error: 'Unauthorized' });

      if (req.method === 'GET') {
        return res.status(200).json({ items: await listBookings() });
      }

      const { action, name, email, days, eventId } = req.body;

      if (action === 'create-link') {
        const cleanName = String(name || '').trim().slice(0, 80);
        const cleanEmail = String(email || '').trim().toLowerCase();
        const validDays = Math.min(Math.max(Number(days) || 7, 1), 60);
        if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return res.status(400).json({ error: 'Valid name and email are required.' });
        }
        const token = signToken({
          id: crypto.randomUUID(),
          n: cleanName,
          e: cleanEmail,
          x: Math.floor(Date.now() / 1000) + validDays * 86400,
        });
        const origin = process.env.SITE_URL || `https://${req.headers.host}`;
        return res.status(200).json({ link: `${origin.replace(/\/$/, '')}/book-interview?t=${token}` });
      }

      if (action === 'cancel') {
        const id = String(eventId || '');
        const cal = encodeURIComponent(CALENDAR_ID);
        const ev = await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}`);
        if (!ev.extendedProperties?.private?.inviteId) {
          return res.status(400).json({ error: 'Not an interview booking.' });
        }
        await gcal(`/calendars/${cal}/events/${encodeURIComponent(id)}?sendUpdates=all`, { method: 'DELETE' });
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action.' });
    }

    if (req.method === 'GET') {
      const invite = verifyToken(String(req.query?.t || ''));
      if (!invite) return res.status(401).json({ error: 'This link is invalid or has expired.' });

      const booked = await existingBooking(invite.id);
      if (booked) return res.status(200).json({ name: invite.n, booked });

      const slots = (await freeSlots(new Date())).map((s) => new Date(s).toISOString());
      return res.status(200).json({ name: invite.n, slots });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const invite = verifyToken(String(body.t || ''));
      if (!invite) return res.status(401).json({ error: 'This link is invalid or has expired.' });

      const startMs = Date.parse(String(body.start || ''));
      if (Number.isNaN(startMs)) return res.status(400).json({ error: 'Invalid slot.' });

      if (await existingBooking(invite.id)) {
        return res.status(409).json({ error: 'You have already booked an interview slot.' });
      }

      // Re-validate: slot must be one we offer AND still free right now.
      const free = await freeSlots(new Date());
      if (!free.includes(startMs)) {
        return res.status(409).json({ error: 'Sorry, that slot was just taken. Please pick another.' });
      }

      const endMs = startMs + CONFIG.slotMinutes * 60_000;
      const event = await gcal(
        `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=all`,
        {
          method: 'POST',
          body: JSON.stringify({
            summary: `${CONFIG.eventTitle} - ${invite.n}`,
            description: `Interview with ${invite.n} (${invite.e}).\nBooked via the CyberHx website.`,
            start: { dateTime: new Date(startMs).toISOString() },
            end: { dateTime: new Date(endMs).toISOString() },
            attendees: [{ email: invite.e, displayName: invite.n }],
            extendedProperties: { private: { inviteId: invite.id } },
            conferenceData: {
              createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          }),
        },
      );

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
