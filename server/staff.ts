// Team roles: does the signed-in staff member (their own Supabase JWT) have access to one of these admin areas?
// Areas and which role gets which are defined in SQL: public.can(area) in supabase/team_roles.sql.
//   owner -> everything · hr -> applications, meetings, availability, emails
//   campaign -> campaigns, subscribers, blog · event -> ctf, inbox, meetings, campaigns

export type Area = 'applications' | 'meetings' | 'availability' | 'emails' | 'campaigns' | 'subscribers' | 'blog' | 'ctf' | 'inbox' | 'team' | 'outreach';

export async function canAny(authHeader: string, areas: Area[]): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !authHeader.startsWith('Bearer ')) return false;
  for (const area of areas) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/can`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_area: area }),
      });
      if (res.ok && (await res.json()) === true) return true;
    } catch {
      /* try the next area */
    }
  }
  return false;
}
