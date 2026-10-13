import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';

const EMAIL_FIND = /[^\s,;<>"'()]+@[^\s,;<>"'()]+\.[^\s,;<>"'()]+/g;

/** Chips + type/paste/import. Shared by the create form and the "Add people" box. */
export const GuestInput: React.FC<{ guests: string[]; setGuests: (g: string[]) => void; max: number; extra?: React.ReactNode }> = ({ guests, setGuests, max, extra }) => {
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState('');

  const add = (text: string) => {
    const found = Array.from(new Set((text.match(EMAIL_FIND) || []).map((x) => x.toLowerCase().replace(/\.+$/, ''))));
    if (!found.length) {
      if (text.trim()) setMsg('No valid email found.');
      return;
    }
    const next = [...guests];
    let added = 0, dup = 0, over = 0;
    for (const e of found) {
      if (next.includes(e)) dup++;
      else if (next.length >= max) over++;
      else { next.push(e); added++; }
    }
    setGuests(next);
    setMsg(`${added} added${dup ? `, ${dup} duplicate` : ''}${over ? `, ${over} skipped (max ${max})` : ''}`);
  };

  return (
    <div>
      <label className="text-gray-400 text-xs font-medium mb-1.5 flex items-center justify-between">
        <span>Emails ({guests.length}/{max})</span>
        {guests.length > 0 && (
          <button type="button" onClick={() => { setGuests([]); setMsg(''); }} className="text-gray-500 hover:text-red-400">Clear all</button>
        )}
      </label>
      <div className="bg-[#05080f] border border-white/10 rounded-xl p-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto focus-within:border-[#a3e635]/50">
        {guests.map((g) => (
          <span key={g} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">
            {g}
            <button type="button" onClick={() => setGuests(guests.filter((x) => x !== g))} className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-red-400" aria-label={`Remove ${g}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (['Enter', ',', ' ', ';'].includes(e.key) && draft.trim()) {
              e.preventDefault();
              add(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && guests.length) {
              setGuests(guests.slice(0, -1));
            }
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text');
            if (/[\s,;]/.test(t.trim())) {
              e.preventDefault();
              add(t);
            }
          }}
          onBlur={() => {
            if (draft.trim()) { add(draft); setDraft(''); }
          }}
          placeholder={guests.length ? 'Add another…' : 'Type an email and press Enter, or paste a whole list'}
          className="flex-1 min-w-[200px] bg-transparent px-2 py-1 text-sm text-white placeholder-gray-600 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <label className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer">
          <Upload size={12} /> Import list (.csv / .txt)
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) add(await f.text());
              e.target.value = '';
            }}
          />
        </label>
        {extra}
        {msg && <span className="text-[11px] text-gray-500">{msg}</span>}
      </div>
    </div>
  );
};

