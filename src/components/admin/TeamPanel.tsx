import { useEffect, useId, useState } from 'react';
import { Check, ExternalLink, Loader2, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { sbRpc } from './mailingApi';
import { ROLES, type Role } from './roles';

interface Member {
  user_id: string;
  email: string;
  role: Role;
  created_at: string;
  fixed: boolean; // main owner from the admins table: can't be changed here
  last_sign_in: string | null;
}

const ASSIGNABLE: Role[] = ['hr', 'campaign', 'event', 'owner'];
const PROJECT_USERS = 'https://supabase.com/dashboard/project/bqdegvtqnqcmzvrohbow/auth/users';
const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3e635]/70';

const when = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never';

/** Owner-only: who can open the admin panel, and with which role. */
export function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('hr');
  const [busy, setBusy] = useState<string | null>(null);
  const emailId = useId();
  const roleId = useId();

  const load = async () => {
    setLoading(true);
    try { setMembers(await sbRpc<Member[]>('staff_list', {})); setErr(''); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not load the team.'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr('Enter the email address of their login.'); return; }
    setBusy('add'); setErr(''); setMsg('');
    try {
      await sbRpc('staff_set', { p_email: e, p_role: role });
      setMsg(`${e} can now sign in as ${ROLES[role].label}.`);
      setEmail('');
      await load();
    } catch (x) { setErr(x instanceof Error ? x.message : 'Could not add them.'); }
    setBusy(null);
  };

  const change = async (m: Member, r: Role) => {
    setBusy(m.user_id); setErr(''); setMsg('');
    try { await sbRpc('staff_set', { p_email: m.email, p_role: r }); setMsg(`${m.email} is now ${ROLES[r].label}.`); await load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not change the role.'); }
    setBusy(null);
  };

  const remove = async (m: Member) => {
    if (!confirm(`Remove admin access for ${m.email}? Their login stays, but they won't be able to open the admin panel.`)) return;
    setBusy(m.user_id); setErr(''); setMsg('');
    try { await sbRpc('staff_remove', { p_user: m.user_id }); setMsg(`${m.email} no longer has admin access.`); await load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not remove them.'); }
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      {/* What each role can open */}
      <section aria-labelledby="roles-h" className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5">
        <h2 id="roles-h" className="text-white font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-[#a3e635]" />Roles</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['hr', 'campaign', 'event', 'owner'] as Role[]).map((r) => (
            <div key={r} className="rounded-xl border border-white/8 bg-[#05080f] p-4">
              <p className="text-sm font-semibold text-white">{ROLES[r].label}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">{ROLES[r].about}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Add someone */}
      <section aria-labelledby="add-h" className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5">
        <h2 id="add-h" className="text-white font-semibold flex items-center gap-2"><UserPlus size={18} className="text-[#a3e635]" />Add a team member</h2>
        <ol className="mt-3 space-y-1.5 text-sm text-gray-400 list-decimal pl-5">
          <li>
            Make their login in{' '}
            <a href={PROJECT_USERS} target="_blank" rel="noreferrer" className={`text-[#a3e635] hover:underline inline-flex items-center gap-1 rounded ${focusRing}`}>
              Supabase → Authentication → Users <ExternalLink size={12} aria-hidden />
            </a>
            : <span className="text-gray-300">Add user → Create new user</span>, enter their email and a password, tick <span className="text-gray-300">Auto Confirm User</span>.
          </li>
          <li>Enter the same email here, pick a role, press Add.</li>
          <li>Send them the password privately. They sign in at cyberhx.com/admin and only see their own tabs.</li>
        </ol>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor={emailId} className="text-gray-400 text-xs font-medium mb-1.5 block">Their login email</label>
            <input id={emailId} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="name@cyberhx.com" autoComplete="off"
              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50" />
          </div>
          <div className="sm:w-64">
            <label htmlFor={roleId} className="text-gray-400 text-xs font-medium mb-1.5 block">Role</label>
            <select id={roleId} value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#a3e635]/50">
              {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
          </div>
          <button onClick={add} disabled={busy === 'add'}
            className={`py-2.5 px-5 rounded-xl bg-[#a3e635] text-[#05080f] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#bef264] disabled:opacity-60 ${focusRing}`}>
            {busy === 'add' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}Add
          </button>
        </div>
        <div aria-live="polite" className="min-h-[1.25rem] mt-3 text-sm">
          {err && <p className="text-red-400" role="alert">{err}</p>}
          {!err && msg && <p className="text-[#a3e635] flex items-center gap-1.5"><Check size={14} />{msg}</p>}
        </div>
      </section>

      {/* Current team */}
      <section aria-labelledby="team-h" className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="team-h" className="text-white font-semibold flex items-center gap-2"><Users size={18} className="text-[#a3e635]" />Team ({members.length})</h2>
          <button onClick={load} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white text-xs ${focusRing}`}>
            <RefreshCw size={13} />Refresh
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="text-[#a3e635] animate-spin" /></div>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No one yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {members.map((m) => (
              <li key={m.user_id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm text-white break-all">{m.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Last sign-in: {when(m.last_sign_in)}</p>
                </div>
                {m.fixed ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/25">Main owner</span>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`role-${m.user_id}`}>Role for {m.email}</label>
                    <select id={`role-${m.user_id}`} value={m.role} disabled={busy === m.user_id}
                      onChange={(e) => change(m, e.target.value as Role)}
                      className="bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#a3e635]/50">
                      {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
                    </select>
                    <button onClick={() => remove(m)} disabled={busy === m.user_id} aria-label={`Remove ${m.email}`}
                      className={`p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 ${focusRing}`}>
                      {busy === m.user_id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
