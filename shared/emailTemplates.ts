// CyberHx email templates. Used by api/email.ts (to send) and the admin panel (to preview).
// Plain TypeScript with no imports, so it runs the same in the browser and in a Vercel function.

export type TemplateId = 'booking' | 'confirmation' | 'reminder' | 'reschedule' | 'shortlisted' | 'followup' | 'custom' | 'moved' | 'cancelled';

export interface EmailVars {
  /** Recipient's name; empty for group emails ("Hi there"). */
  name?: string;
  /** What the meeting is, e.g. "CyberHx interview". */
  title?: string;
  start?: string | null; // ISO
  end?: string | null; // ISO
  meetLink?: string | null;
  /** Old start time (ISO), for the "meeting moved" email. */
  previousStart?: string | null;
  /** Booking / rescheduling link, used by reschedule and shortlisted. */
  bookingLink?: string;
  /** Optional personal note shown in its own box. */
  note?: string;
  /** Custom template only. */
  subject?: string;
  body?: string;
}

export interface TemplateInfo {
  id: TemplateId;
  label: string;
  hint: string;
  /** Show the booking-link field in the composer. */
  usesBookingLink?: boolean;
  /** Show subject + message fields in the composer. */
  isCustom?: boolean;
  /** Sent automatically by Reschedule / Cancel; not offered in the composer. */
  auto?: boolean;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'booking', label: 'Pick your slot', hint: 'Send their booking link', usesBookingLink: true },
  { id: 'confirmation', label: 'Meeting confirmed', hint: 'Date, time and Meet link' },
  { id: 'reminder', label: 'Reminder', hint: 'Nudge before the call' },
  { id: 'reschedule', label: 'Reschedule', hint: 'Ask to move the meeting', usesBookingLink: true },
  { id: 'shortlisted', label: 'Shortlisted', hint: 'Next round for a candidate', usesBookingLink: true },
  { id: 'followup', label: 'Thank you', hint: 'Follow-up after the call' },
  { id: 'custom', label: 'Custom message', hint: 'Write your own', isCustom: true },
  { id: 'moved', label: 'Meeting moved', hint: 'Sent when you move a meeting', auto: true },
  { id: 'cancelled', label: 'Meeting cancelled', hint: 'Sent when you cancel a meeting', auto: true },
];

export const MAX_FIELD = { name: 80, title: 120, note: 1500, subject: 150, body: 5000, link: 500 };

/** Brands an email can be sent as. */
export const BRANDS = {
  cyberhx: { name: 'CyberHx', site: 'cyberhx.com', url: 'https://cyberhx.com', tagline: 'Global cybersecurity community', logo: ['cyber', 'hx'] },
  pinaka: { name: 'Pinaka CTF', site: 'pinakactf.com', url: 'https://pinakactf.com', tagline: 'Capture The Flag', logo: ['Pinaka ', 'CTF'] },
} as const;
export type BrandId = keyof typeof BRANDS;

const C = {
  page: '#05070c',
  card: '#0b111d',
  line: '#1b2436',
  text: '#e8ecf3',
  muted: '#93a0b8',
  lime: '#c6f135',
  ink: '#071003',
};

export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const safeUrl = (u?: string | null) => (u && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : '');

export const firstName = (n?: string) => (n || '').trim().split(/\s+/)[0] || '';

export function fmtWhen(start?: string | null, end?: string | null) {
  if (!start) return { date: '', time: '', length: '' };
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return { date: '', time: '', length: '' };
  const tz = { timeZone: 'Asia/Kolkata' } as const;
  const date = s.toLocaleDateString('en-IN', { ...tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = `${s.toLocaleTimeString('en-IN', { ...tz, hour: 'numeric', minute: '2-digit' })} IST`;
  let length = '';
  if (end) {
    const mins = Math.round((new Date(end).getTime() - s.getTime()) / 60000);
    if (mins > 0) length = mins % 60 === 0 ? `${mins / 60} hour${mins === 60 ? '' : 's'}` : `${mins} minutes`;
  }
  return { date, time, length };
}

export interface Layout {
  preheader: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[]; // already-escaped HTML is NOT allowed: plain text only
  details?: [string, string][];
  cta?: { label: string; url: string };
  note?: string;
  /** Promotional mail: adds an unsubscribe line to the footer. */
  unsubscribeUrl?: string;
  /** Optional banner image (https) shown above the heading. */
  image?: string;
  /** Which brand the email is from (logo, footer, sign-off). Default CyberHx. */
  brand?: BrandId;
  /** Person signing the email, e.g. "Kush" (shown above Team CyberHx). */
  signer?: string;
  /** Simple, letter-style email (no card, button or images): Gmail puts these in Primary far more often. */
  plain?: boolean;
}

/** Letter-style HTML: looks like a normal email someone typed, which is what inbox filters expect from a person. */
function plainLayout(o: Layout) {
  const B = BRANDS[o.brand || 'cyberhx'];
  const para = (t: string) => `<p style="margin:0 0 14px;">${esc(t).replace(/\n/g, '<br>')}</p>`;
  const details = (o.details || []).filter(([, v]) => v).map(([k, v]) => `${esc(k)}: <b>${esc(v)}</b>`).join('<br>');
  const link = o.cta && safeUrl(o.cta.url) ? `<p style="margin:0 0 14px;">${esc(o.cta.label)}: <a href="${esc(safeUrl(o.cta.url))}">${esc(safeUrl(o.cta.url))}</a></p>` : '';
  const unsub = safeUrl(o.unsubscribeUrl)
    ? `<p style="margin:24px 0 0;font-size:12px;color:#777;">You are getting this because you joined ${esc(B.name)} updates. <a href="${esc(safeUrl(o.unsubscribeUrl))}" style="color:#777;">Unsubscribe</a></p>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.heading)}</title></head>
<body style="margin:0;padding:16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222;">
<div style="max-width:600px;">
${o.paragraphs.filter(Boolean).map(para).join('')}
${details ? `<p style="margin:0 0 14px;">${details}</p>` : ''}
${link}
${o.note?.trim() ? para(o.note.trim()) : ''}
<p style="margin:18px 0 0;">Regards,<br>${o.signer ? `${esc(o.signer)}<br>` : ''}Team ${esc(B.name)}<br>${B.site}</p>
${unsub}
</div>
</body></html>`;
}

export function layout(o: Layout) {
  if (o.plain) return plainLayout(o);
  const B = BRANDS[o.brand || 'cyberhx'];
  const p = o.paragraphs
    .filter(Boolean)
    .map((t) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.text};">${esc(t).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const details = o.details?.filter(([, v]) => v).length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border:1px solid ${C.line};border-radius:12px;border-collapse:separate;">
        ${o.details
          .filter(([, v]) => v)
          .map(
            ([k, v], i) => `<tr><td style="padding:14px 18px;${i ? `border-top:1px solid ${C.line};` : ''}font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};width:110px;vertical-align:top;">${esc(k)}</td><td style="padding:14px 18px;${i ? `border-top:1px solid ${C.line};` : ''}font-size:15px;color:${C.text};font-weight:600;">${esc(v)}</td></tr>`,
          )
          .join('')}
      </table>`
    : '';
  const cta = o.cta && safeUrl(o.cta.url)
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;"><tr><td style="border-radius:8px;background:${C.lime};">
        <a href="${esc(safeUrl(o.cta.url))}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:${C.ink};text-decoration:none;border-radius:8px;">${esc(o.cta.label)} &rarr;</a>
      </td></tr></table>
      <p style="margin:0 0 20px;font-size:12px;color:${C.muted};word-break:break-all;">Or open: <a href="${esc(safeUrl(o.cta.url))}" style="color:${C.lime};">${esc(safeUrl(o.cta.url))}</a></p>`
    : '';
  const note = o.note?.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="padding:16px 18px;border-left:3px solid ${C.lime};background:#0f1726;border-radius:0 10px 10px 0;font-size:15px;line-height:1.6;color:${C.text};">${esc(o.note.trim()).replace(/\n/g, '<br>')}</td></tr></table>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(o.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td style="padding:0 4px 20px;">
      <span style="font-size:22px;font-weight:800;letter-spacing:-.02em;color:#ffffff;">${esc(B.logo[0])}<span style="color:${C.lime};">${esc(B.logo[1])}</span></span>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden;">
      <div style="height:4px;background:${C.lime};font-size:0;line-height:0;">&nbsp;</div>${
        safeUrl(o.image) ? `<img src="${esc(safeUrl(o.image))}" alt="" width="560" style="display:block;width:100%;height:auto;border:0;">` : ''
      }
      <div style="padding:32px 32px 12px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${C.lime};">${esc(o.eyebrow)}</p>
        <h1 style="margin:0 0 20px;font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;">${esc(o.heading)}</h1>
        ${p}${details}${cta}${note}
        <p style="margin:8px 0 20px;font-size:15px;line-height:1.6;color:${C.text};">Regards,<br>${o.signer ? `<strong>${esc(o.signer)}</strong><br>Team ${esc(B.name)}` : `<strong>Team ${esc(B.name)}</strong>`}</p>
      </div>
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">
      ${esc(B.name)} &middot; ${esc(B.tagline)} &middot; <a href="${B.url}" style="color:${C.muted};">${B.site}</a><br>
      Questions? Just reply to this email.${
        safeUrl(o.unsubscribeUrl)
          ? `<br>You are getting this because you joined ${esc(B.name)} updates. <a href="${esc(safeUrl(o.unsubscribeUrl))}" style="color:${C.muted};text-decoration:underline;">Unsubscribe</a>`
          : ''
      }
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export function textVersion(o: Layout) {
  const B = BRANDS[o.brand || 'cyberhx'];
  return [
    o.heading,
    '',
    ...o.paragraphs.filter(Boolean),
    ...(o.details || []).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    o.cta && safeUrl(o.cta.url) ? `\n${o.cta.label}: ${safeUrl(o.cta.url)}` : '',
    o.note?.trim() ? `\n${o.note.trim()}` : '',
    '',
    'Regards,',
    ...(o.signer ? [o.signer] : []),
    `Team ${B.name}`,
    B.site,
    safeUrl(o.unsubscribeUrl) ? `\nUnsubscribe: ${safeUrl(o.unsubscribeUrl)}` : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}

export function renderEmail(id: TemplateId, v: EmailVars): { subject: string; html: string; text: string } {
  const who = firstName(v.name);
  const hi = who ? `Hi ${who},` : 'Hi there,';
  const title = (v.title || 'meeting').trim();
  const Title = title.charAt(0).toUpperCase() + title.slice(1);
  const subj = `CyberHx ${title}`;
  const { date, time, length } = fmtWhen(v.start, v.end);
  const meet = safeUrl(v.meetLink);
  const booking = safeUrl(v.bookingLink);
  const details: [string, string][] = [
    ['Meeting', Title],
    ['Date', date],
    ['Time', time],
    ['Length', length],
    ['Where', meet ? 'Google Meet' : ''],
  ];

  let o: Layout;
  let subject: string;

  switch (id) {
    case 'booking': {
      const isInterview = /interview/i.test(title);
      subject = isInterview ? 'Congratulations! Book your CyberHx interview' : `Book your ${subj}`;
      o = {
        preheader: isInterview ? 'Thank you for applying to CyberHx. Choose your interview slot.' : 'Choose a time that suits you',
        eyebrow: isInterview ? 'Congratulations' : 'Pick your slot',
        heading: isInterview ? (who ? `Congratulations, ${who}!` : 'Congratulations!') : who ? `${who}, choose your time.` : 'Choose your time.',
        paragraphs: [
          hi,
          ...(isInterview ? ['Thank you for applying to CyberHx. We enjoyed going through your application and we are happy to invite you to an interview.'] : []),
          isInterview
            ? 'Please pick a slot that works for you. It takes less than a minute, and the Google Meet link is added to your calendar as soon as you confirm.'
            : `We would like to set up your ${title} with CyberHx. Please pick a slot that works for you. It takes less than a minute, and the Google Meet link is added to your calendar as soon as you confirm.`,
          booking ? '' : 'Reply to this email with two or three times that suit you and we will send the invite.',
        ],
        cta: booking ? { label: 'Choose your slot', url: booking } : undefined,
        note: v.note,
      };
      break;
    }
    case 'confirmation':
      subject = date ? `Confirmed: your ${subj} on ${date}` : `Confirmed: your ${subj}`;
      o = {
        preheader: `${Title}${date ? ` · ${date}, ${time}` : ''}`,
        eyebrow: 'Meeting confirmed',
        heading: who ? `You're booked, ${who}.` : "You're booked.",
        paragraphs: [hi, `Your ${title} with CyberHx is confirmed. The details are below, and the calendar invite is already in your inbox.`],
        details,
        cta: meet ? { label: 'Join Google Meet', url: meet } : undefined,
        note: v.note,
      };
      break;
    case 'reminder':
      subject = date ? `Reminder: your ${subj} on ${date} at ${time}` : `Reminder: your ${subj}`;
      o = {
        preheader: `Starts ${date ? `${date}, ${time}` : 'soon'}`,
        eyebrow: 'Reminder',
        heading: who ? `See you soon, ${who}.` : 'See you soon.',
        paragraphs: [hi, `A quick reminder about your ${title} with CyberHx. Please join a couple of minutes early so we can start on time.`],
        details,
        cta: meet ? { label: 'Join Google Meet', url: meet } : undefined,
        note: v.note,
      };
      break;
    case 'reschedule':
      subject = `Can we reschedule your ${subj}?`;
      o = {
        preheader: 'We need to move our meeting',
        eyebrow: 'Reschedule',
        heading: "Let's find a better time.",
        paragraphs: [
          hi,
          `Something has come up on our side and we need to move your ${title}${date ? ` planned for ${date} at ${time}` : ''}. Sorry for the change.`,
          booking ? 'Please pick a new time that works for you:' : 'Please reply with two or three times that suit you and we will send a new invite.',
        ],
        cta: booking ? { label: 'Pick a new time', url: booking } : undefined,
        note: v.note,
      };
      break;
    case 'moved': {
      const was = v.previousStart ? fmtWhen(v.previousStart, null) : null;
      subject = date ? `New time: your ${subj} is now ${date} at ${time}` : `New time for your ${subj}`;
      o = {
        preheader: `Moved to ${date ? `${date}, ${time}` : 'a new time'}`,
        eyebrow: 'Meeting moved',
        heading: who ? `${who}, your meeting has a new time.` : 'Your meeting has a new time.',
        paragraphs: [
          hi,
          `We have moved your ${title}${was?.date ? ` from ${was.date} at ${was.time}` : ''} to the new time below. Your calendar invite has been updated, and the Google Meet link stays the same.`,
          'If the new time does not work for you, just reply to this email.',
        ],
        details,
        cta: meet ? { label: 'Join Google Meet', url: meet } : undefined,
        note: v.note,
      };
      break;
    }
    case 'cancelled':
      subject = date ? `Cancelled: your ${subj} on ${date}` : `Cancelled: your ${subj}`;
      o = {
        preheader: `${Title}${date ? ` on ${date}` : ''} is cancelled`,
        eyebrow: 'Meeting cancelled',
        heading: 'Your meeting is cancelled.',
        paragraphs: [
          hi,
          `Your ${title}${date ? ` on ${date} at ${time}` : ''} has been cancelled and removed from your calendar. Sorry for any inconvenience.`,
          booking ? 'You can book a new time here:' : 'If you would like a new time, just reply to this email.',
        ],
        cta: booking ? { label: 'Book a new time', url: booking } : undefined,
        note: v.note,
      };
      break;
    case 'shortlisted':
      subject = 'You have been shortlisted at CyberHx';
      o = {
        preheader: 'Next round: your interview',
        eyebrow: 'Shortlisted',
        heading: who ? `Congratulations, ${who}!` : 'Congratulations!',
        paragraphs: [
          hi,
          'Thank you for applying to CyberHx. We enjoyed going through your application and would like to move you to the next round.',
          date ? 'Your interview details are below.' : booking ? 'Please choose an interview slot that suits you:' : 'We will be in touch shortly with your interview time.',
        ],
        details: date ? details : undefined,
        cta: meet && date ? { label: 'Join Google Meet', url: meet } : booking ? { label: 'Choose your interview slot', url: booking } : undefined,
        note: v.note,
      };
      break;
    case 'followup':
      subject = who ? `Thanks for your time, ${who}` : 'Thanks for your time';
      o = {
        preheader: 'Thank you for meeting with CyberHx',
        eyebrow: 'Thank you',
        heading: 'Thanks for meeting with us.',
        paragraphs: [
          hi,
          `It was great speaking with you${title !== 'meeting' ? ` in our ${title}` : ''}. We will go through everything we discussed and get back to you with next steps soon.`,
          'If anything comes to mind in the meantime, just reply to this email.',
        ],
        note: v.note,
      };
      break;
    case 'custom':
    default: {
      subject = (v.subject || '').trim() || 'A message from CyberHx';
      const paras = (v.body || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      o = {
        preheader: paras[0]?.slice(0, 120) || subject,
        eyebrow: 'CyberHx',
        heading: subject,
        paragraphs: [hi, ...paras],
        cta: meet ? { label: 'Join Google Meet', url: meet } : undefined,
        note: v.note,
      };
    }
  }

  return { subject: subject.slice(0, 200), html: layout(o), text: textVersion(o) };
}
