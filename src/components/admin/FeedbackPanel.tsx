import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Loader2, MessageSquareQuote, RefreshCw } from 'lucide-react';
import { sbSelect, timeAgo, fmtDateTime } from './adminApi';
import { downloadCsv, sbInsert, sbRows, sbWrite } from './mailingApi';

/* Admin → Feedback: the event review form (/blog/feedback) as charts.
   Rows come from form_submissions where form = 'feedback'; answers live in row.data. */

/* Two shapes live here:
   - the site form (Pinaka CTF 2026 onward): favourite_challenge, category, ui, ui_notes, more_events
   - imported Google Forms (Null Origin CTF 2026): overall, quality, categories[], had_issues, improve, more_events
   Each card only shows when its event has that answer. */
import { Card, FeedbackCharts, RATING, STATUS, summarize, uiScore, type FbRow } from '../../features/reviews/FeedbackCharts';

/* ───────── the panel ───────── */

type Ev = { id: string; name: string; count: number; last: string };

export const FeedbackPanel: React.FC = () => {
  const [rows, setRows] = useState<FbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [event, setEvent] = useState('');
  const [allChallenges, setAllChallenges] = useState(false);
  const [allNotes, setAllNotes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await sbSelect<FbRow>('form_submissions', {
      select: 'id,name,email,message,data,created_at',
      form: 'eq.feedback',
      order: 'created_at.desc',
      limit: '5000',
    });
    if (res.ok && Array.isArray(res.data)) setRows(res.data);
    else setError(res.error || 'Could not load feedback.');
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Quotes shown on cyberhx.com/reviews and the homepage (table site_reviews).
  const [onSite, setOnSite] = useState<Record<string, { id: string; published: boolean }>>({});
  const [siteBusy, setSiteBusy] = useState('');
  const [siteErr, setSiteErr] = useState('');
  const loadSite = useCallback(async () => {
    try {
      const { rows: list } = await sbRows<{ id: string; submission_id: string; published: boolean }>('site_reviews?select=id,submission_id,published&limit=1000');
      setOnSite(Object.fromEntries(list.filter((x) => x.submission_id).map((x) => [x.submission_id, { id: x.id, published: x.published }])));
    } catch { /* table missing: the toggle just stays off */ }
  }, []);
  useEffect(() => { loadSite(); }, [loadSite]);
  const toggleSite = async (r: FbRow, quote: string) => {
    setSiteBusy(r.id); setSiteErr('');
    try {
      const cur = onSite[r.id];
      if (cur) await sbWrite('PATCH', `site_reviews?id=eq.${cur.id}`, { published: !cur.published });
      else {
        const m = /^([1-5])\/5/.exec(r.data?.quality || r.data?.ui || '');
        await sbInsert('site_reviews', {
          submission_id: r.id, quote: quote.replace(/\s+/g, ' ').trim().slice(0, 600),
          author: (r.data?.username || r.name || '').split(' ')[0].slice(0, 60),
          team: (r.data?.team || r.data?.team_or_username || '').slice(0, 60),
          event_name: (r.data?.event_name || '').slice(0, 80), rating: m ? Number(m[1]) : null,
        });
      }
      await loadSite();
    } catch (e) { setSiteErr(e instanceof Error ? e.message : 'Could not update the website.'); }
    finally { setSiteBusy(''); }
  };

  // One button per event, newest event first.
  const events = useMemo<Ev[]>(() => {
    const m = new Map<string, Ev>();
    rows.forEach((r) => {
      const id = r.data?.event || 'other';
      const e = m.get(id) || { id, name: r.data?.event_name || 'Other feedback', count: 0, last: r.created_at };
      e.count++;
      if (r.created_at > e.last) e.last = r.created_at;
      m.set(id, e);
    });
    return [...m.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [rows]);

  const current = events.find((e) => e.id === event) || events[0];
  useEffect(() => { setAllChallenges(false); setAllNotes(false); }, [event]);

  const shown = useMemo(() => (current ? rows.filter((r) => (r.data?.event || 'other') === current.id) : []), [rows, current]);

  const s = useMemo(() => summarize(shown), [shown]);

  const exportCsv = () => {
    const keys = new Set<string>();
    shown.forEach((r) => Object.keys(r.data || {}).forEach((k) => keys.add(k)));
    const cols = [...keys].filter((k) => !['event', 'source'].includes(k));
    downloadCsv(`cyberhx-feedback-${current?.id || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Submitted', 'Name', 'Email', ...cols, 'Message'],
      ...shown.map((r) => [
        r.created_at, r.name, r.email,
        ...cols.map((k) => { const v = (r.data as Record<string, unknown> | null)?.[k]; return Array.isArray(v) ? v.join(', ') : String(v ?? ''); }),
        r.message || '',
      ]),
    ]);
  };

  if (loading && !rows.length) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-[#a3e635]" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Event switcher + actions */}
      <div className="flex flex-wrap items-center gap-2">
        {events.length > 0 && (
          <div role="tablist" aria-label="Event" className="ios-noscroll flex max-w-full gap-0.5 overflow-x-auto rounded-[14px] border border-white/[0.08] bg-[#0b0f19] p-[3px]">
            {events.map((e) => {
              const on = current?.id === e.id;
              return (
                <button key={e.id} role="tab" aria-selected={on} onClick={() => setEvent(e.id)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[11px] px-3.5 py-1.5 text-[13.5px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 ${on ? 'bg-white/[0.16] text-white shadow-[0_2px_8px_rgba(0,0,0,.35)]' : 'text-white/55 hover:text-white/85'}`}>
                  {e.name}
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-white/50'}`}>{e.count}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={exportCsv} disabled={!shown.length} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0b0f19] px-3.5 py-2 text-sm text-white/70 hover:text-white disabled:opacity-40">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0b0f19] px-3.5 py-2 text-sm text-white/70 hover:text-white">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && <p className="flex items-center gap-1.5 text-sm text-red-400"><AlertTriangle size={14} />{error}</p>}

      {!s.n ? (
        <div className="rounded-[22px] border border-white/[0.08] bg-[#0b0f19] py-20 text-center text-white/45">No feedback yet. Share cyberhx.com/blog/feedback with your players.</div>
      ) : (
        <>
          {s.imported && <p className="text-[12.5px] text-white/40">Imported from the event's Google Form · one answer per email (the latest)</p>}

          {/* Headline numbers */}
          <FeedbackCharts shown={shown} s={s} allChallenges={allChallenges} setAllChallenges={setAllChallenges} />

          {/* Reported issues, word for word */}
          {s.issueNotes.length > 0 && (
            <Card title="Issues players reported" sub={`${s.issueNotes.length} described a problem`}>
              <ul className="grid gap-2 md:grid-cols-2">
                {s.issueNotes.map((r) => (
                  <li key={r.id} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS.critical }} />
                    <div className="min-w-0">
                      <p className="text-[14px] leading-6 text-white/80">{r.data?.issues}</p>
                      <p className="mt-1 text-[12px] text-white/40">{r.data?.team || r.name}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* What players said */}
          <Card title="What players said" sub={`${s.notes.length} wrote something worth reading · longest first · ${Object.values(onSite).filter((x) => x.published).length} shown on cyberhx.com/reviews`}>
            {siteErr && <p className="mb-3 text-sm text-red-300">{siteErr}</p>}
            {s.notes.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {s.notes.slice(0, allNotes ? undefined : 8).map(({ r, text }) => {
                  const sc = uiScore(r);
                  return (
                    <li key={r.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                      <MessageSquareQuote size={16} className="text-white/25" />
                      {text.map((t) => (
                        <p key={t.k} className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-white/80">
                          {text.length > 1 && <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">{t.k}</span>}
                          {t.t}
                        </p>
                      ))}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
                        <span className="font-medium text-white/70">{r.name}</span>
                        {r.data?.team && r.data.team !== r.name && <span>{r.data.team}</span>}
                        {r.data?.favourite_challenge && <span>♥ {r.data.favourite_challenge}</span>}
                        {sc > 0 && <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: RATING[sc - 1].color }} />{s.ratingIsUi ? 'UI' : 'Quality'} {sc}/5</span>}
                        <span title={fmtDateTime(r.created_at)}>{timeAgo(r.created_at)}</span>
                        <button
                          onClick={() => toggleSite(r, text.map((t) => t.t).join(' '))}
                          disabled={siteBusy === r.id}
                          className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition disabled:opacity-50 ${onSite[r.id]?.published ? 'border-[#a3e635]/40 bg-[#a3e635]/10 text-[#a3e635]' : 'border-white/10 text-white/50 hover:text-white'}`}
                          title="Show this quote on cyberhx.com/reviews (handle, team and event only; never the email)"
                        >
                          {siteBusy === r.id ? 'Saving…' : onSite[r.id]?.published ? 'On website ✓' : 'Show on website'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-white/40">No written comments yet.</p>}
            {s.notes.length > 8 && (
              <button onClick={() => setAllNotes((v) => !v)} className="mt-4 text-[13px] font-semibold text-[#a3e635] hover:underline">
                {allNotes ? 'Show fewer' : `Show all ${s.notes.length}`}
              </button>
            )}
          </Card>
          <p className="text-[12px] text-white/35">Full answers with names and emails are in Inbox (Event feedback), or use Export CSV.</p>
        </>
      )}
    </div>
  );
};
