// Every public form on the site goes through submitForm().
// It does two things at once:
//   1. emails the team through Web3Forms, and
//   2. saves a row in Supabase so it shows up in the admin panel.
// The visitor sees success if either one worked, so a hiccup in one service
// never loses a message.
import { supabase } from './supabase';

const WEB3FORMS_KEY = 'ae826816-f65e-4d6f-8491-3362df582e13';

export type FormTable = 'form_submissions' | 'job_applications' | 'ctf_requests';

export interface SubmitResult {
  ok: boolean;
  stored: boolean;
  emailed: boolean;
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : v);

/** Strip empty values and trim strings so emails and rows stay tidy. */
const tidy = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(o)
      .map(([k, v]) => [k, Array.isArray(v) ? v.filter(Boolean) : clean(v)])
      .filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)),
  );

async function sendEmail(subject: string, fields: Record<string, unknown>, replyTo?: string): Promise<boolean> {
  try {
    const body = {
      access_key: WEB3FORMS_KEY,
      subject,
      from_name: 'CyberHx website',
      ...(replyTo ? { replyto: replyTo } : {}),
      ...Object.fromEntries(
        Object.entries(tidy(fields)).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v]),
      ),
    };
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return !!data?.success;
  } catch {
    return false;
  }
}

async function store(table: FormTable, row: Record<string, unknown>): Promise<boolean> {
  try {
    const { error } = await supabase.from(table).insert({ ...tidy(row), status: 'new' });
    if (error) console.warn(`[forms] could not save to ${table}:`, error.message);
    return !error;
  } catch (e) {
    console.warn(`[forms] could not save to ${table}:`, e);
    return false;
  }
}

export async function submitForm(opts: {
  subject: string;
  table: FormTable;
  row: Record<string, unknown>;
  /** What the email shows. Defaults to the row. */
  email?: Record<string, unknown>;
  replyTo?: string;
  /** Hidden honeypot value; bots fill it, people don't. */
  honeypot?: string;
}): Promise<SubmitResult> {
  // Pretend success for bots so they don't retry, but store nothing.
  if (opts.honeypot) return { ok: true, stored: false, emailed: false };

  // Save first, so the team email can say loudly if the admin panel did NOT get it
  // (otherwise a database problem stays invisible: the visitor still sees "sent").
  const stored = await store(opts.table, opts.row);
  const fields = opts.email ?? opts.row;
  const emailed = await sendEmail(
    stored ? opts.subject : `⚠ NOT SAVED IN ADMIN · ${opts.subject}`,
    stored ? fields : { admin_panel_warning: 'This was NOT saved in the admin panel. Keep this email; tell the developer.', ...fields },
    opts.replyTo,
  );
  return { ok: stored || emailed, stored, emailed };
}

/** Uploads a resume to the private "applications" bucket. Returns its storage path. */
export async function uploadResume(file: File): Promise<string> {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
  ];
  if (!allowed.includes(file.type)) throw new Error('Upload a PDF, Word file, PNG or JPG.');
  if (file.size > 5 * 1024 * 1024) throw new Error('The resume must be under 5 MB.');
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
  const path = `resumes/${new Date().toISOString().slice(0, 10)}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
  const { error } = await supabase.storage.from('applications').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Could not upload the resume. Try again or send it by email.');
  return path;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
