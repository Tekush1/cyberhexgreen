// CyberHx campaign templates: event blasts, newsletters, notifications.
// Used by api/campaign.ts (to send) and Admin -> Campaigns (to preview). No imports beyond the shared layout.

import { layout, textVersion, firstName, safeUrl, type Layout } from './emailTemplates.js';

export type CampaignKind = 'event' | 'newsletter' | 'notification';
export type CampaignTemplateId = 'event_announce' | 'event_reminder' | 'event_live' | 'event_thanks' | 'newsletter' | 'notice';

export interface CampaignVars {
  eventName?: string;
  /** Free text, e.g. "Saturday 25 Oct, 7:00 PM IST". */
  when?: string;
  /** Free text, e.g. "Online (Discord)" or a venue. */
  where?: string;
  /** Main button link (register / join / results). */
  link?: string;
  ctaLabel?: string;
  /** Optional https banner image. */
  image?: string;
  subject?: string;
  heading?: string;
  body?: string;
  note?: string;
}

export const CAMPAIGN_FIELDS = ['eventName', 'when', 'where', 'link', 'ctaLabel', 'image', 'subject', 'heading', 'body', 'note'] as const;
export const CAMPAIGN_MAX: Record<(typeof CAMPAIGN_FIELDS)[number], number> = {
  eventName: 120, when: 120, where: 120, link: 500, ctaLabel: 40, image: 500, subject: 150, heading: 150, body: 6000, note: 1500,
};

export interface CampaignTemplateInfo {
  id: CampaignTemplateId;
  label: string;
  hint: string;
  /** Which kind this template is normally sent as. */
  kind: CampaignKind;
  /** Fields the composer should show. */
  fields: (keyof CampaignVars)[];
  /** Fields that must be filled before sending. */
  required: (keyof CampaignVars)[];
  defaultCta: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplateInfo[] = [
  { id: 'event_announce', label: 'New event', hint: 'Announce an event, open registrations', kind: 'event',
    fields: ['eventName', 'when', 'where', 'link', 'ctaLabel', 'image', 'subject', 'body', 'note'], required: ['eventName', 'link'], defaultCta: 'Register now' },
  { id: 'event_reminder', label: 'Event reminder', hint: 'Starts soon: date, time, join link', kind: 'notification',
    fields: ['eventName', 'when', 'where', 'link', 'ctaLabel', 'subject', 'body', 'note'], required: ['eventName'], defaultCta: 'Join the event' },
  { id: 'event_live', label: "We're live", hint: 'Event has started, join now', kind: 'notification',
    fields: ['eventName', 'where', 'link', 'ctaLabel', 'subject', 'body', 'note'], required: ['eventName', 'link'], defaultCta: 'Join now' },
  { id: 'event_thanks', label: 'Thanks for joining', hint: 'After the event: results, recording', kind: 'notification',
    fields: ['eventName', 'link', 'ctaLabel', 'subject', 'body', 'note'], required: ['eventName'], defaultCta: 'See the results' },
  { id: 'newsletter', label: 'Newsletter', hint: 'Updates, news, write your own', kind: 'newsletter',
    fields: ['subject', 'heading', 'image', 'body', 'link', 'ctaLabel', 'note'], required: ['subject', 'body'], defaultCta: 'Read more' },
  { id: 'notice', label: 'Notification', hint: 'Short notice, write your own', kind: 'notification',
    fields: ['subject', 'heading', 'body', 'link', 'ctaLabel', 'note'], required: ['subject', 'body'], defaultCta: 'Open' },
];

export const KIND_INFO: Record<CampaignKind, { label: string; hint: string; promo: boolean }> = {
  event: { label: 'Event blast', hint: 'Big promotional send. Adds an unsubscribe link and skips people who unsubscribed.', promo: true },
  newsletter: { label: 'Newsletter', hint: 'For your subscribers. Adds an unsubscribe link and skips people who unsubscribed.', promo: true },
  notification: { label: 'Notification', hint: 'Information people need (reminders, join links). Goes to everyone in the list.', promo: false },
};

/** Replace {{name}} / {{first_name}} placeholders. */
function fill(s: string | undefined, name: string) {
  return (s || '').replace(/\{\{\s*(first_?name|name)\s*\}\}/gi, (_m, k: string) => (k.toLowerCase() === 'name' ? name.trim() || 'there' : firstName(name) || 'there'));
}

export function renderCampaign(
  id: CampaignTemplateId,
  raw: CampaignVars,
  opts: { name?: string; unsubscribeUrl?: string } = {},
): { subject: string; html: string; text: string } {
  const name = opts.name || '';
  const v: CampaignVars = {};
  for (const k of CAMPAIGN_FIELDS) v[k] = fill(String(raw[k] ?? '').slice(0, CAMPAIGN_MAX[k]), name).trim();
  const info = CAMPAIGN_TEMPLATES.find((t) => t.id === id) || CAMPAIGN_TEMPLATES[CAMPAIGN_TEMPLATES.length - 1];
  const who = firstName(name);
  const hi = who ? `Hi ${who},` : 'Hi there,';
  const ev = v.eventName || 'our event';
  const link = safeUrl(v.link);
  const cta = link ? { label: v.ctaLabel || info.defaultCta, url: link } : undefined;
  const paras = (v.body || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const details: [string, string][] = [['Event', v.eventName || ''], ['When', v.when || ''], ['Where', v.where || '']];

  let o: Layout;
  let subject: string;
  switch (info.id) {
    case 'event_announce':
      subject = v.subject || `${ev}: registrations are open`;
      o = {
        preheader: [v.when, v.where].filter(Boolean).join(' · ') || `Join us for ${ev}`,
        eyebrow: 'New event',
        heading: ev,
        image: v.image,
        paragraphs: [hi, ...(paras.length ? paras : [`We are hosting ${ev} and we would love to have you there. Seats are limited, so register early.`])],
        details,
        cta,
        note: v.note,
      };
      break;
    case 'event_reminder':
      subject = v.subject || `Reminder: ${ev}${v.when ? ` · ${v.when}` : ' starts soon'}`;
      o = {
        preheader: v.when ? `Starts ${v.when}` : 'Starts soon',
        eyebrow: 'Starts soon',
        heading: who ? `See you there, ${who}.` : 'See you there.',
        paragraphs: [hi, ...(paras.length ? paras : [`A quick reminder that ${ev} is coming up. Keep this email handy so you can join on time.`])],
        details,
        cta,
        note: v.note,
      };
      break;
    case 'event_live':
      subject = v.subject || `${ev} is live now`;
      o = {
        preheader: 'We have started. Join now.',
        eyebrow: 'Live now',
        heading: `${ev} is live.`,
        paragraphs: [hi, ...(paras.length ? paras : ['We have just started. Jump in now so you do not miss anything.'])],
        details: [['Where', v.where || '']],
        cta,
        note: v.note,
      };
      break;
    case 'event_thanks':
      subject = v.subject || `Thanks for joining ${ev}`;
      o = {
        preheader: `Thank you for being part of ${ev}`,
        eyebrow: 'Thank you',
        heading: who ? `Thanks for joining, ${who}.` : 'Thanks for joining.',
        paragraphs: [hi, ...(paras.length ? paras : [`Thank you for being part of ${ev}. Results, write-ups and the recording are on the way.`])],
        cta,
        note: v.note,
      };
      break;
    case 'newsletter':
      subject = v.subject || 'News from CyberHx';
      o = {
        preheader: paras[0]?.slice(0, 120) || subject,
        eyebrow: 'CyberHx updates',
        heading: v.heading || subject,
        image: v.image,
        paragraphs: [hi, ...paras],
        cta,
        note: v.note,
      };
      break;
    case 'notice':
    default:
      subject = v.subject || 'A message from CyberHx';
      o = {
        preheader: paras[0]?.slice(0, 120) || subject,
        eyebrow: 'Notification',
        heading: v.heading || subject,
        paragraphs: [hi, ...paras],
        cta,
        note: v.note,
      };
  }
  if (opts.unsubscribeUrl) o.unsubscribeUrl = opts.unsubscribeUrl;
  return { subject: subject.slice(0, 200), html: layout(o), text: textVersion(o) };
}

/** First required field that is empty, or '' when the campaign is ready to send. */
export function missingField(id: CampaignTemplateId, v: CampaignVars): string {
  const info = CAMPAIGN_TEMPLATES.find((t) => t.id === id);
  if (!info) return 'template';
  for (const f of info.required) {
    const val = String(v[f] ?? '').trim();
    if (!val) return f;
    if ((f === 'link' || f === 'image') && !safeUrl(val)) return f;
  }
  if (v.link && !safeUrl(v.link)) return 'link';
  if (v.image && !safeUrl(v.image)) return 'image';
  return '';
}
