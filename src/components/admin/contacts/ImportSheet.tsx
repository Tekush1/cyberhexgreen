import { useMemo, useState, type ChangeEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { sbRpc } from '../mailingApi';
import { CATEGORIES, CATEGORY, IMPORT_KEYS, Sheet, btnBlue, btnGlass, field, guessColumns, parseCsv, toRows, type Category, type ImportKey } from './shared';

const KEY_LABEL: Record<ImportKey, string> = {
  name: 'Name', org: 'Organisation', role: 'Role', email: 'Email', phone: 'Phone', category: 'Category', city: 'City', state: 'State',
  country: 'Country', website: 'Website', tags: 'Tags', notes: 'Notes', source: 'Source',
};

/** Paste or upload a CSV / sheet. Existing emails are only filled in where empty; nothing typed by the team is overwritten. */
export function ImportSheet({ known, onClose, onDone }: { known: Set<string>; onClose: () => void; onDone: (msg: string) => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Category>('college');
  const [tag, setTag] = useState('');
  const [keepNoEmail, setKeepNoEmail] = useState(false);
  const [map, setMap] = useState<(ImportKey | null)[] | null>(null);
  const [header, setHeader] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');

  const table = useMemo(() => parseCsv(text), [text]);
  const guessed = useMemo(() => guessColumns(table), [table]);
  const cols = map && map.length === guessed.map.length ? map : guessed.map;
  const hasHeader = map ? header : guessed.header;
  const rows = useMemo(() => toRows(table, hasHeader, cols), [table, hasHeader, cols]);
  const counts = useMemo(() => {
    let fresh = 0, again = 0, noEmail = 0;
    const seen = new Set<string>();
    rows.forEach((r) => {
      const e = String(r.email || '');
      if (!e) { noEmail++; return; }
      if (seen.has(e)) return;
      seen.add(e);
      if (known.has(e)) again++; else fresh++;
    });
    return { fresh, again, noEmail };
  }, [rows, known]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr('That file is over 5 MB. Split it into smaller files.'); return; }
    setText(await file.text()); setMap(null); setErr('');
  };

  const run = async () => {
    if (!rows.length) { setErr('Paste a list or choose a CSV file first.'); return; }
    if (!cols.includes('email') && !keepNoEmail) { setErr('Pick which column has the email, or tick "Keep rows without an email".'); return; }
    setBusy(true); setErr('');
    let added = 0, updated = 0, skipped = 0;
    try {
      for (let i = 0; i < rows.length; i += 500) {
        setProgress(`Saving ${Math.min(i + 500, rows.length)} of ${rows.length}…`);
        const r = await sbRpc<{ added: number; updated: number; skipped: number }>('contacts_import', {
          p_rows: rows.slice(i, i + 500), p_category: category, p_tags: tag.trim() ? [tag.trim().toLowerCase()] : [], p_keep_no_email: keepNoEmail,
        });
        added += r.added; updated += r.updated; skipped += r.skipped;
      }
      onDone(`${added} added · ${updated} updated${skipped ? ` · ${skipped} skipped` : ''}`);
    } catch (e) {
      setErr(`${e instanceof Error ? e.message : 'Import failed.'}${added + updated ? ` (${added + updated} were saved before this.)` : ''}`);
      setBusy(false); setProgress('');
    }
  };

  return (
    <Sheet title="Import contacts" onClose={onClose} busy={busy} wide
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-white/60">
            {rows.length ? <>{counts.fresh} new · {counts.again} already in Contacts{counts.noEmail ? ` · ${counts.noEmail} without email${keepNoEmail ? '' : ' (skipped)'}` : ''}</> : 'Nothing to import yet'}
          </span>
          <span className="flex-1" />
          {err && <span className="text-[13px] text-[#FF453A] w-full sm:w-auto">{err}</span>}
          {progress && <span className="text-[13px] text-white/60">{progress}</span>}
          <button onClick={run} disabled={busy || !rows.length} className={btnBlue}>{busy && <Loader2 size={15} className="animate-spin" />}Import {rows.length || ''}</button>
        </div>
      }>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${btnGlass} cursor-pointer`}>
            <Upload size={15} />Choose CSV file
            <input id="imp-file" type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={onFile} />
          </label>
          <span className="text-[13px] text-white/45">or paste rows copied from Excel / Google Sheets below</span>
        </div>
        <textarea id="imp-text" rows={6} className={`${field} font-mono text-[13px]`} value={text} onChange={(e) => { setText(e.target.value); setMap(null); }}
          placeholder={'name,org,role,email,phone,city\nDr. Priya Sharma,IIT Kanpur,Faculty coordinator,priya@iitk.ac.in,,Kanpur'} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[12px] text-white/50">Category for rows that don't say</span>
            <select id="imp-cat" className={field} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY[c].label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="text-[12px] text-white/50">Add a tag to everyone (optional)</span>
            <input id="imp-tag" className={field} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="space-ctf-2027" />
          </label>
          <label className="flex items-center gap-2 text-[14px] text-white/80 sm:mt-5">
            <input id="imp-noemail" type="checkbox" checked={keepNoEmail} onChange={(e) => setKeepNoEmail(e.target.checked)} className="h-4 w-4 accent-[#0A84FF]" />
            Keep rows without an email
          </label>
        </div>

        {table.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[13px] font-semibold text-white/70">Columns</h4>
              <label className="flex items-center gap-2 text-[13px] text-white/70">
                <input id="imp-header" type="checkbox" checked={hasHeader} onChange={(e) => { setMap(cols); setHeader(e.target.checked); }} className="h-4 w-4 accent-[#0A84FF]" />
                First row is a header
              </label>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="bg-white/[0.04]">
                    {cols.map((k, i) => (
                      <th key={i} className="p-1.5 min-w-[130px]">
                        <select aria-label={`Column ${i + 1}`} className="w-full rounded-lg bg-white/[0.08] border border-white/[0.1] px-2 py-1 text-[12.5px] text-white"
                          value={k || ''} onChange={(e) => { const next = [...cols]; next[i] = (e.target.value || null) as ImportKey | null; setHeader(hasHeader); setMap(next); }}>
                          <option value="">Don't import</option>
                          {IMPORT_KEYS.map((x) => <option key={x} value={x}>{KEY_LABEL[x]}</option>)}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.slice(0, 6).map((r, ri) => (
                    <tr key={ri} className={`border-t border-white/[0.06] ${ri === 0 && hasHeader ? 'text-white/35 italic' : 'text-white/80'}`}>
                      {cols.map((_, i) => <td key={i} className="px-2 py-1.5 max-w-[220px] truncate">{r[i] || ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.length > 6 && <p className="text-[12px] text-white/40">Showing the first rows of {table.length}.</p>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
