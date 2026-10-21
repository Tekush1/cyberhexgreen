import React, { useState } from 'react';
import { ChevronDown, Mail } from 'lucide-react';
import { TEMPLATES } from '../../../shared/emailTemplates';
import { TOKEN_KEY, timeAgo, fmtDateTime } from './adminApi';
import { sbRows } from './mailingApi';

export interface SentItem { label: string; at: string; status: string; via: string; subject?: string; body?: string | null }
export type History = Record<string, SentItem[]>;

const TPL_LABEL: Record<string, string> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t.label]));

const STATUS: Record<string, { label: string; cls: string }> = {
  opened: { label: 'Opened', cls: 'text-[#30D158]' },
  clicked: { label: 'Clicked', cls: 'text-violet-300' },
  delivered: { label: 'Delivered', cls: 'text-[#0A84FF]' },
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
    const r = await sbRows<{ email: string; template: string; subject: string; body: string | null; message_id: string | null; created_at: string; provider: string }>(
      `mail_log?select=email,template,subject,body,message_id,created_at,provider&email=in.${encodeURIComponent(quoteList(emails))}&order=created_at.desc&limit=1000`,
    );
    for (const m of r.rows) {
      if (m.message_id) resendSeen.add(m.message_id);
      add(m.email, { label: TPL_LABEL[m.template] || m.subject, at: m.created_at, status: (m.message_id && status.get(m.message_id)) || 'sent', via: m.provider, subject: m.subject, body: m.body });
    }
  } catch { /* table not there yet */ }

  // 3) Older Resend emails sent before logging existed
  const wanted = new Set(emails);
  for (const it of resendOld) {
    if (resendSeen.has(it.id)) continue;
    for (const to of it.to || []) {
      const e = String(to).toLowerCase();
      if (wanted.has(e)) add(e, { label: it.subject, at: it.createdAt, status: it.lastEvent || 'sent', via: 'resend', subject: it.subject });
    }
  }

  // 4) Campaign emails
  try {
    const r = await sbRows<{ email: string; provider: string | null; updated_at: string; mail_campaigns: { name: string } | null }>(
      `mail_queue?select=email,provider,updated_at,mail_campaigns(name)&status=eq.sent&email=in.${encodeURIComponent(quoteList(emails))}&order=updated_at.desc&limit=1000`,
    );
    for (const q of r.rows) add(q.email, { label: q.mail_campaigns?.name ? `Campaign: ${q.mail_campaigns.name}` : 'Campaign', at: q.updated_at, status: 'sent', via: q.provider || '', subject: q.mail_campaigns?.name || 'Campaign' });
  } catch { /* ignore */ }

  for (const k of Object.keys(out)) out[k].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  return out;
}

/** Under a meeting card: every email sent to these people. Tap one to read exactly what was sent. */
export const SentHistory: React.FC<{ emails: string[]; history: History | null }> = ({ emails, history }) => {
  const [open, setOpen] = useState(false);
  const [openRow, setOpenRow] = useState<number | null>(null);
  if (!history) return null;
  const list = [...new Set(emails.map((e) => e.toLowerCase()))];
  const items = list.flatMap((e) => (history[e] || []).map((it) => ({ ...it, email: e })));
  if (!items.length) {
    return <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5"><Mail size={12} aria-hidden="true" /> No email sent yet</p>;
  }
  // Same email to several guests counts once, with a people count
  const merged = new Map<string, { label: string; at: string; status: string; subject?: string; body?: string | null; people: Set<string> }>();
  for (const it of items) {
    const key = `${it.label}|${new Date(it.at).toISOString().slice(0, 13)}`;
    const m = merged.get(key);
    if (m) { m.people.add(it.email); if (it.status === 'opened' || it.status === 'clicked') m.status = it.status; if (!m.body && it.body) m.body = it.body; }
    else merged.set(key, { label: it.label, at: it.at, status: it.status, subject: it.subject, body: it.body, people: new Set([it.email]) });
  }
  const rows = [...merged.values()];
  const last = rows[0];
  const lastSt = STATUS[last.status] || STATUS.sent;
  return (
    <div className="mt-2.5" aria-label="Emails sent">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-[12.5px] text-gray-300 hover:text-white">
        <Mail size={12} aria-hidden="true" />
        {rows.length} email{rows.length > 1 ? 's' : ''} sent · last: {last.label} · <span className={lastSt.cls}>{lastSt.label}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.06]">
          {rows.map((r, i) => {
            const st = STATUS[r.status] || STATUS.sent;
            const isOpen = openRow === i;
            return (
              <li key={i}>
                <button onClick={() => setOpenRow(isOpen ? null : i)} aria-expanded={isOpen} className="w-full px-3 py-2 text-left">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] text-white">{r.label}</span>
                    <span className={`shrink-0 text-[12px] ${st.cls}`}>{st.label}</span>
                  </span>
                  <span className="block text-[11.5px] text-gray-500">
                    {fmtDateTime(r.at)} · {timeAgo(r.at)}{list.length > 1 ? ` · ${r.people.size}/${list.length} people` : ''}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    {r.subject && <p className="text-[12.5px] text-gray-400">Subject: <span className="text-gray-200">{r.subject}</span></p>}
                    {r.body
                      ? <pre className="mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2.5 font-sans text-[12.5px] leading-relaxed text-gray-300">{r.body}</pre>
                      : <p className="mt-1 text-[12px] text-gray-500">The full text isn't saved for emails sent before 21 Oct. New emails show it here.</p>}
                    <p className="mt-1.5 text-[11.5px] text-gray-500">To: {[...r.people].join(', ')}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SentHistory;
