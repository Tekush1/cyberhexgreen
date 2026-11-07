import React, { useCallback, useEffect, useState } from 'react';
import { Gift, History, Mail, Settings2 } from 'lucide-react';
import { campaignApi, sbRows } from './mailingApi';
import { EventsTab } from './vouchers/EventsTab';
import { HistoryTab } from './vouchers/HistoryTab';
import { SendTab } from './vouchers/SendTab';
import { ServicesTab } from './vouchers/ServicesTab';
import { STORE, Segmented, load, save, type Provider, type Rest, type VoucherEvent } from './vouchers/shared';

/* Admin -> Vouchers.
   Send      pick an event, paste / upload the list, check every row, queue (sent ~5 a minute by the server)
   History   every send and every email: search, stop, resume, retry, send again, delete, export
   Events    each CTF's look, prize tiers and default mail service
   Services  which mail services are connected, used today, or at their limit
   Files: ./vouchers/*. Database: supabase/voucher_queue.sql, supabase/voucher_system.sql. */

type Tab = 'send' | 'history' | 'events' | 'services';

export const VouchersPanel: React.FC = () => {
  const [tab, setTab] = useState<Tab>(() => load(`${STORE}_ui`, { tab: 'send' as Tab }).tab);
  const [selId, setSelId] = useState<string>(() => load(`${STORE}_ui`, { sel: '' }).sel);
  const [events, setEvents] = useState<VoucherEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [rests, setRests] = useState<Rest[]>([]);
  const [focus, setFocus] = useState<string[]>([]);
  const [eventsDirty, setEventsDirty] = useState(false);

  useEffect(() => save(`${STORE}_ui`, { tab, sel: selId }), [tab, selId]);

  const loadEvents = useCallback(async (select?: string) => {
    setLoadingEvents(true); setEventsError('');
    try {
      const { rows } = await sbRows<VoucherEvent>('voucher_events?select=*&order=created_at.desc');
      setEvents(rows);
      setSelId((cur) => { const want = select ?? cur; return (rows.find((r) => r.id === want) || rows[0])?.id || ''; });
    } catch (e) { setEventsError(e instanceof Error ? e.message : 'Could not load events.'); }
    finally { setLoadingEvents(false); }
  }, []);
  const loadRests = useCallback(async () => {
    try { const { rows } = await sbRows<Rest>(`mail_provider_rest?select=provider,until,reason&until=gt.${new Date().toISOString()}&order=until.asc`); setRests(rows); }
    catch { setRests([]); }
  }, []);
  const loadProviders = useCallback(async () => {
    setLoadingProviders(true);
    try { const d = await campaignApi<{ providers: Provider[] }>(); setProviders(d.providers || []); }
    catch { setProviders([]); }
    finally { setLoadingProviders(false); }
    loadRests();
  }, [loadRests]);
  useEffect(() => { loadEvents(); loadProviders(); }, [loadEvents, loadProviders]);

  const go = (t: Tab) => {
    if (tab === 'events' && t !== 'events' && eventsDirty && !confirm('You have unsaved changes to an event. Leave without saving?')) return;
    setTab(t);
    if (t === 'services') loadProviders();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[17px] font-semibold text-white"><Gift size={18} className="text-[#c6f135]" /> Vouchers</h3>
        <Segmented label="Vouchers section" value={tab} onChange={go} options={[
          { v: 'send' as Tab, label: <><Mail size={14} /> Send</> },
          { v: 'history' as Tab, label: <><History size={14} /> History</> },
          { v: 'events' as Tab, label: <><Gift size={14} /> Events</> },
          { v: 'services' as Tab, label: <><Settings2 size={14} /> Mail services</> },
        ]} />
      </div>

      {tab === 'send' && (
        <SendTab events={events} selId={selId} onSelect={setSelId} providers={providers} rests={rests}
          onQueued={(ids) => { setFocus(ids); setTab('history'); }} goEvents={() => setTab('events')} />
      )}
      {tab === 'history' && <HistoryTab providers={providers} rests={rests} focusBatches={focus} onClearFocus={() => setFocus([])} refreshRests={loadRests} />}
      {tab === 'events' && (
        <EventsTab events={events} loading={loadingEvents} error={eventsError} selId={selId} providers={providers}
          onSelect={setSelId} reload={loadEvents} onDirty={setEventsDirty} />
      )}
      {tab === 'services' && <ServicesTab providers={providers} rests={rests} loading={loadingProviders} reload={loadProviders} />}
    </div>
  );
};

export default VouchersPanel;
