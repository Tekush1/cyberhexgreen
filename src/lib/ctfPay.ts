// Browser side of the CTF checkout payment (server: api/pay.ts).
import { supabase } from './supabase';

export type PayCurrency = 'INR' | 'USD';
export type Cart =
  | { kind: 'hosting' }
  | { kind: 'prebuilt'; planId: string }
  | { kind: 'build'; format: 'single' | 'split'; rounds: Record<string, { hours: number; players: number; qty: Record<string, number> }>; website3d: boolean; custom: boolean };

export interface PayQuote {
  currency: PayCurrency;
  list: number;
  amount: number;
  listLabel: string;
  amountLabel: string;
  fxRate: number | null;
  code: string | null;
  percentOff: number | null;
  codeError: string | null;
  quoted: boolean;
}

async function post<T>(body: object): Promise<T> {
  const res = await fetch('/api/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  return data as T;
}

/** Is online payment switched on, and which currency fits this visitor? */
export async function payConfig(): Promise<{ enabled: boolean; currency: PayCurrency }> {
  try {
    const res = await fetch('/api/pay');
    const d = await res.json();
    return { enabled: d?.enabled === true, currency: d?.currency === 'INR' ? 'INR' : 'USD' };
  } catch {
    return { enabled: false, currency: 'USD' };
  }
}

export const getQuote = (cart: Cart, currency: PayCurrency, code?: string | null) =>
  post<PayQuote>({ action: 'quote', cart, currency, ...(code ? { code } : {}) });

export interface CreatedOrder {
  free?: boolean;
  ref: string;
  order_id?: string;
  amount?: number;
  currency?: PayCurrency;
  key_id?: string;
  description?: string;
}
export const createOrder = (body: { cart: Cart; currency: PayCurrency; code?: string | null; form: Record<string, string>; acceptTerms: boolean }) =>
  post<CreatedOrder>({ action: 'create', ...body });

export const verifyPayment = (r: Record<string, string>) => post<{ ok: boolean; ref: string }>({ action: 'verify', ...r });

/** Tell the server the window was closed or the payment failed (shows in Admin → Payments). Never throws. */
export function reportFailure(body: { razorpay_order_id: string; reason?: string; code?: string; step?: string; payment_id?: string; dismissed?: boolean }) {
  post({ action: 'failed', ...body }).catch(() => undefined);
}

export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ---------- CTF logo ----------
export const LOGO_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const LOGO_MAX = 3 * 1024 * 1024;

/** Uploads the logo to the public ctf-logos bucket; returns its path (logos/<uuid>.<ext>). */
export async function uploadLogo(file: File): Promise<string> {
  const ext = LOGO_TYPES[file.type];
  if (!ext) throw new Error('Use a PNG, JPG or WebP image.');
  if (file.size > LOGO_MAX) throw new Error('The logo must be 3 MB or smaller.');
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const path = `logos/${id}.${ext}`;
  const { error } = await supabase.storage.from('ctf-logos').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error('Logo upload is not set up yet. Please email us your logo after ordering.');
    throw new Error('Could not upload the logo. Please try again.');
  }
  return path;
}
export const logoPublicUrl = (path: string) => supabase.storage.from('ctf-logos').getPublicUrl(path).data.publicUrl;
