import { useEffect, useSyncExternalStore } from 'react';

/* Local-currency equivalents for USD prices.
   - The visitor's country is guessed from their time zone, then their browser
     language. No IP lookup, nothing is sent anywhere.
   - Rates come from the free fawazahmed0 currency API (no key), cached for 12 hours.
   - Visitors can override the currency; the choice is remembered. */

const TZ_REGION: Record<string, string> = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US', 'America/Detroit': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT', 'Europe/Lisbon': 'PT',
  'Europe/Helsinki': 'FI', 'Europe/Athens': 'GR', 'Europe/Zurich': 'CH', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO',
  'Europe/Istanbul': 'TR', 'Europe/Moscow': 'RU', 'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA',
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM',
  'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Kathmandu': 'NP', 'Asia/Katmandu': 'NP', 'Asia/Colombo': 'LK',
  'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
  'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Hong_Kong': 'HK', 'Asia/Shanghai': 'CN', 'Asia/Taipei': 'TW',
  'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Jerusalem': 'IL', 'Asia/Tel_Aviv': 'IL', 'Asia/Tehran': 'IR',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU',
  'Pacific/Auckland': 'NZ', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR',
  'America/Buenos_Aires': 'AR', 'America/Bogota': 'CO', 'America/Santiago': 'CL', 'America/Lima': 'PE',
  'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA',
};

const REGION_CURRENCY: Record<string, string> = {
  IN: 'INR', US: 'USD', CA: 'CAD', GB: 'GBP', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', TR: 'TRY', RU: 'RUB', UA: 'UAH', AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', PK: 'PKR',
  BD: 'BDT', NP: 'NPR', LK: 'LKR', SG: 'SGD', MY: 'MYR', TH: 'THB', ID: 'IDR', PH: 'PHP', VN: 'VND', HK: 'HKD', CN: 'CNY',
  TW: 'TWD', KR: 'KRW', JP: 'JPY', IL: 'ILS', IR: 'IRR', AU: 'AUD', NZ: 'NZD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CO: 'COP',
  CL: 'CLP', PE: 'PEN', NG: 'NGN', KE: 'KES', ZA: 'ZAR', EG: 'EGP', MA: 'MAD',
};

/** Currencies offered in the picker, most common for CyberHx visitors first. */
export const currencyChoices = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'NPR', 'BDT', 'LKR', 'PKR', 'MYR', 'IDR', 'PHP',
  'SAR', 'QAR', 'KWD', 'CHF', 'SEK', 'NZD', 'ZAR', 'NGN', 'KES', 'BRL', 'MXN', 'KRW', 'CNY', 'HKD', 'THB', 'VND', 'TRY', 'PLN',
];

const PICK_KEY = 'cyberhx-currency';
const RATES_KEY = 'cyberhx-usd-rates';
const RATE_URLS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
];

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
};

export function detectCurrency(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromTz = tz && TZ_REGION[tz];
    if (fromTz && REGION_CURRENCY[fromTz]) return REGION_CURRENCY[fromTz];
    for (const lang of navigator.languages ?? [navigator.language]) {
      const region = new Intl.Locale(lang).maximize().region;
      if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
    }
  } catch {
    /* fall through */
  }
  return 'USD';
}

type State = { code: string; rates: Record<string, number> | null };
let state: State = { code: read(PICK_KEY) || detectCurrency(), rates: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let loading: Promise<void> | null = null;
function loadRates() {
  if (state.rates || loading) return;
  const cached = read(RATES_KEY);
  if (cached) {
    try {
      const { at, rates } = JSON.parse(cached);
      if (Date.now() - at < 12 * 3600 * 1000 && rates) {
        state = { ...state, rates };
        emit();
        return;
      }
    } catch {
      /* refetch */
    }
  }
  loading = (async () => {
    for (const url of RATE_URLS) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.usd) {
          const rates: Record<string, number> = {};
          for (const [k, v] of Object.entries(data.usd)) if (typeof v === 'number') rates[k.toUpperCase()] = v;
          write(RATES_KEY, JSON.stringify({ at: Date.now(), rates }));
          state = { ...state, rates };
          emit();
          return;
        }
      } catch {
        /* try the next source */
      }
    }
  })();
}

export function setCurrency(code: string) {
  write(PICK_KEY, code);
  state = { ...state, code };
  emit();
}

export function formatMoney(amount: number, code: string) {
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: amount < 10 ? 2 : 0,
    }).format(amount);
  } catch {
    return `${code} ${Math.round(amount).toLocaleString()}`;
  }
}

/** Current local currency, its rate against USD, and a formatter. */
export function useLocalCurrency() {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(loadRates, []);
  const rate = s.code === 'USD' ? 1 : s.rates?.[s.code] ?? null;
  const fmt = (usd: number) => (rate === null || s.code === 'USD' ? null : formatMoney(usd * rate, s.code));
  return { code: s.code, rate, fmt, setCurrency };
}
