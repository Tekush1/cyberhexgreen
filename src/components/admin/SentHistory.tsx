import React from 'react';
import { Mail } from 'lucide-react';
import { TEMPLATES } from '../../../shared/emailTemplates';
import { TOKEN_KEY, timeAgo, fmtDateTime } from './adminApi';
import { sbRows } from './mailingApi';

export interface SentItem { label: string; at: string; status: string; via: string }
export type History = Record<string, SentItem[]>;

const TPL_LABEL: Record<string, string> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t.label]));

const STATUS: Record<string, { label: string; cls: string }> = {
  opened: { label: 'Opened', cls: 'text-[#a3e635]' },
  clicked: { label: 'Clicked', cls: 'text-violet-300' },
  delivered: { label: 'Delivered', cls: 'text-sky-300' },
  bounced: { label: 'Bounced', cls: 'text-red-300' },
  complained: { label: 'Marked spam', cls: 'text-red-300' },
  failed: { label: 'Failed', cls: 'text-red-300' },
  sent: { label: 'Sent', cls: 'text-gray-300' },
};

const quoteList = (emails: string[]) => `(${emails.map((e) => `"${e.replace(/"/g, '')}"`).join(',')})`;

/** Every email sent to these addresses: meeting emails (with open status from Resend) and campaign emails. */
export async function loadHistory(emailsIn: string[]): Promise<History> {
  const emails = [...new Set(emailsIn.map((e) => e.trim().toLowerCase()).filter(Boolean))].slice(0, 300);
  const out: History = {};
  if (!emails.length) return out;
  const add = (email: string, it: SentItem) => { (out[email] ||= []).push(it); };

  // 1) Status + older history straight from Resend (latest 200 emails)
  const status = new Map<string, string>();
  const resendSeen = new Set<string>();
  const resendOld: { id: string; to: string[]; subject: string; createdAt: string; lastEvent: string }[] = [];
  try {
    let after = '';
    for (let page = 0; page < 2; page++) {
      const res = await fetch(`/api/email?admin=log${after ? `&after=${encodeURIComponent(after)}` : ''}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` },
      });
      if (!res.ok) break;
      const d = await res.json();
      for (const it of d.items || []) { status.set(it.id, it.lastEvent); resendOld.push(it); }
      if (!d.hasMore || !d.items?.length) break;
      after = d.items[d.items.length - 1].id;
    }
  } catch { /* Resend list needs a full-access key; history still works without status */ }

  // 2) Meeting emails we logged ourselves (template names)
  try {
    const r = await sbRows<{ email: string; template: string; subject: string; message_id: string | null; created_at: string; provider: string }>(
      `mail_log?select=email,template,subject,message_id,created_at,provider&email=in.${encodeURIComponent(quoteList(emails))}&order=created_at.desc&limit=1000`,
    );
    for (const m of r.rows) {
      if (m.message_id) resendSeen.add(m.message_id);
      add(m.email, { label: TPL_LABEL[m.template] || m.subject, at: m.created_at, status: (m.message_id && status.get(m.message_id)) || 'sent', via: m.provider });
    }
  } catch { /* table not there yet */ }

  // 3) Older Resend emails sent before logging existed
  const wanted = new Set(emails);
  for (const it of resendOld) {
    if (resendSeen.has(it.id)) continue;
    for (const to of it.to || []) {
      const e = String(to).toLowerCase();
      if (wanted.has(e)) add(e, { label: it.subject, at: it.createdAt, status: it.lastEvent || 'sent', via: 'resend' });
    }
  }

  // 4) Campaign emails
  try {
    const r = await sbRows<{ email: string; provider: string | null; updated_at: string; mail_campaigns: { name: string } | null }>(
      `mail_queue?select=email,provider,updated_at,mail_campaigns(name)&status=eq.sent&email=in.${encodeURIComponent(quoteList(emails))}&order=updated_at.desc&limit=1000`,
    );
    for (const q of r.rows) add(q.email, { label: q.mail_campaigns?.name ? `Campaign: ${q.mail_campaigns.name}` : 'Campaign', at: q.updated_at, status: 'sent', via: q.provider || '' });
  } catch { /* ignore */ }

  for (const k of Object.keys(out)) out[k].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  return out;
}

/** One line under a meeting card: what was emailed to these people, when, and whether it was opened. */
export const SentHistory: React.FC<{ emails: string[]; history: History | null }> = ({ emails, history }) => {
  if (!history) return null;
  const list = [...new Set(emails.map((e) => e.toLowerCase()))];
  const items = list.flatMap((e) => (history[e] || []).map((it) => ({ ...it, email: e })));
  if (!items.length) {
    return <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5"><Mail size={12} aria-hidden="true" /> No email sent yet</p>;
  }
  // Group: same email to several guests counts once, with a people count
  const merged = new Map<string, { label: string; at: string; status: string; people: Set<string> }>();
  for (const it of items) {
    const key = `${it.label}|${new Date(it.at).toISOString().slice(0, 13)}`;
    const m = merged.get(key);
    if (m) { m.people.add(it.email); if (it.status === 'opened' || it.status === 'clicked') m.status = it.status; }
    else merged.set(key, { label: it.label, at: it.at, status: it.status, people: new Set([it.email]) });
  }
  const rows = [...merged.values()].slice(0, 6);
  const more = merged.size - rows.length;
  return (
    <div className="mt-2" aria-label="Emails sent">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><Mail size={11} aria-hidden="true" /> Emails sent</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {rows.map((r, i) => {
          const st = STATUS[r.status] || STATUS.sent;
          return (
            <li key={i} title={`${fmtDateTime(r.at)} · ${[...r.people].join(', ')}`}
              className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-white/[0.03] text-gray-200">
              {r.label} <span className="text-gray-400">· {timeAgo(r.at)}</span>
              {list.length > 1 && <span className="text-gray-400"> · {r.people.size}/{list.length}</span>}
              {' · '}<span className={st.cls}>{st.label}</span>
            </li>
          );
        })}
        {more > 0 && <li className="text-xs px-2 py-1 text-gray-400">+{more} more</li>}
      </ul>
    </div>
  );
};

export default SentHistory;
