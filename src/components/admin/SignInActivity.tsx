import { useMemo, useState } from 'react';
import { AlertTriangle, MapPin, Monitor, RefreshCw } from 'lucide-react';

/* Admin → Team → Sign-in activity (owners only; data: public.staff_logins, written by /api/staff). */

export interface SignIn { id: number; at: string; ok: boolean; user_id: string | null; email: string; role: string; ip: string; city: string; region: string; country: string; user_agent: string }

const ist = (d: string) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const ago = (d: string) => {
  const s = Math.round((Date.now() - Date.parse(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
export const place = (l: Pick<SignIn, 'city' | 'region' | 'country'>) => [l.city, l.region !== l.city ? l.region : '', l.country].filter(Boolean).join(', ');

/** "Chrome on Windows", "Safari on iPhone" from a user agent. */
export function device(ua: string) {
  if (!ua) return 'Unknown device';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /curl|python|bot|wget/i.test(ua) ? 'Script / bot' : 'Browser';
  return os ? `${br} on ${os}` : br;
}

export function SignInActivity({ rows, loading, err, onRefresh }: { rows: SignIn[]; loading: boolean; err: string; onRefresh: () => void }) {
  const [show, setShow] = useState<'all' | 'ok' | 'failed'>('all');
  const [who, setWho] = useState('');
  const people = useMemo(() => [...new Set(rows.map((r) => r.email).filter(Boolean))].sort(), [rows]);

  // "New place": first time this person signed in from this country+city (within the loaded history)
  const fresh = useMemo(() => {
    const seen = new Set<string>(); const users = new Set<string>(); const out = new Set<number>();
    [...rows].reverse().forEach((r) => { // oldest first
      if (!r.ok) return;
      const k = `${r.email}|${r.country}|${r.city}`;
      if (users.has(r.email) && !seen.has(k)) out.add(r.id);
      seen.add(k); users.add(r.email);
    });
    return out;
  }, [rows]);

  const list = rows.filter((r) => (show === 'all' || (show === 'ok' ? r.ok : !r.ok)) && (!who || r.email === who));
  const failed24h = rows.filter((r) => !r.ok && Date.now() - Date.parse(r.at) < 864e5).length;
  const seg = (on: boolean) => `px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] ${on ? 'bg-white/[0.16] text-white' : 'text-white/55 hover:text-white/85'}`;

  return (
    <section aria-labelledby="signin-h" className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="signin-h" className="text-white font-semibold">Sign-in activity</h2>
          <p className="mt-0.5 text-xs text-gray-500">Every admin sign-in and failed attempt, with place, IP and device. Only owners see this.</p>
        </div>
        <button onClick={onRefresh} aria-label="Refresh" className="h-9 w-9 rounded-full bg-white/5 text-gray-400 hover:text-white flex items-center justify-center">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {failed24h > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#FF453A]/12 border border-[#FF453A]/30 px-3 py-2 text-[13px] text-[#FF9F9A]">
          <AlertTriangle size={15} /> {failed24h} failed sign-in attempt{failed24h > 1 ? 's' : ''} in the last 24 hours.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[11px] bg-white/[0.07] p-[3px] border border-white/[0.06]" role="radiogroup" aria-label="Show">
          {([['all', 'All'], ['ok', 'Signed in'], ['failed', 'Failed']] as const).map(([v, t]) => (
            <button key={v} role="radio" aria-checked={show === v} onClick={() => setShow(v)} className={seg(show === v)}>{t}</button>
          ))}
        </div>
        <label className="sr-only" htmlFor="signin-who">Person</label>
        <select id="signin-who" value={who} onChange={(e) => setWho(e.target.value)} className="bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-[13px]">
          <option value="">Everyone</option>
          {people.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {err && <p role="alert" className="mt-3 text-sm text-red-400">{err}</p>}
      {!loading && !list.length && !err && <p className="mt-6 text-center text-sm text-gray-500">No sign-ins recorded yet. New sign-ins show up here.</p>}

      <ul className="mt-3 divide-y divide-white/[0.06]">
        {list.map((r) => (
          <li key={r.id} className="flex items-start gap-3 py-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${r.ok ? 'bg-[#30D158]' : 'bg-[#FF453A]'}`} aria-label={r.ok ? 'Signed in' : 'Failed'} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-white">
                <span className="break-all">{r.email || 'unknown'}</span>
                {r.role && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-gray-300 capitalize">{r.role}</span>}
                {!r.ok && <span className="rounded-full bg-[#FF453A]/15 px-2 py-0.5 text-[11px] text-[#FF6961]">Wrong password / no access</span>}
                {fresh.has(r.id) && <span className="rounded-full bg-[#FF9F0A]/15 px-2 py-0.5 text-[11px] text-[#FF9F0A]">New place</span>}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={12} />{place(r) || 'Unknown place'}</span>
                <span className="flex items-center gap-1"><Monitor size={12} />{device(r.user_agent)}</span>
                <span className="font-mono text-[11.5px] text-gray-500">{r.ip}</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[12.5px] text-gray-300 whitespace-nowrap">{ago(r.at)}</p>
              <p className="text-[11px] text-gray-500 whitespace-nowrap">{ist(r.at)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-gray-600">Place comes from the IP address, so it is approximate (city level), and a VPN shows the VPN's location.</p>
    </section>
  );
}
