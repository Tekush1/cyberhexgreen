// Shared helpers for the admin panel's Supabase REST calls.
// The admin's access token lives in sessionStorage (set on login in AdminPage).

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const TOKEN_KEY = 'cyberhx_admin_token';

export const getAdminToken = () => sessionStorage.getItem(TOKEN_KEY) || '';

const headers = (extra: Record<string, string> = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${getAdminToken() || SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

// Session expired (JWT lives ~1h) → force re-login
const guard = (res: Response) => {
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.reload();
  }
  return res;
};

export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  /** true when the table doesn't exist yet (SQL not run) */
  missingTable: boolean;
  error: string;
}

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  const body = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: body as T, missingTable: false, error: '' };
  const code = String(body?.code || '');
  const missing = res.status === 404 || code === 'PGRST205' || code === '42P01';
  return {
    ok: false,
    data: null,
    missingTable: missing,
    error: missing ? 'Table not found — run supabase/admin_tables.sql in Supabase.' : body?.message || `Request failed (${res.status})`,
  };
}

export async function sbSelect<T>(table: string, params: Record<string, string> = {}): Promise<ApiResult<T[]>> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return parse<T[]>(guard(await fetch(url.toString(), { headers: headers() })));
}

export async function sbUpdate(table: string, id: string, body: object): Promise<ApiResult<unknown>> {
  return parse(
    guard(
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(body),
      }),
    ),
  );
}

export async function sbRemove(table: string, id: string): Promise<ApiResult<unknown>> {
  return parse(
    guard(
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: headers({ Prefer: 'return=minimal' }),
      }),
    ),
  );
}

/** Insert-or-replace a row by primary key. */
export async function sbUpsert(table: string, body: object): Promise<ApiResult<unknown>> {
  return parse(
    guard(
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(body),
      }),
    ),
  );
}

/** Count rows matching a filter (cheap HEAD-style request). Returns 0 on any error. */
export async function sbCount(table: string, filter: Record<string, string> = {}): Promise<number> {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('select', 'id');
    Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = guard(await fetch(url.toString(), { method: 'HEAD', headers: headers({ Prefer: 'count=exact' }) }));
    if (!res.ok) return 0;
    const range = res.headers.get('content-range') || '';
    return Number(range.split('/')[1]) || 0;
  } catch {
    return 0;
  }
}

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (d: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days}d ago` : fmtDateTime(d);
};
