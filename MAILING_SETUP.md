# Mailing setup: subscribers, event blasts, notifications

Admin → **Campaigns** sends event announcements, reminders, newsletters and notifications.
Admin → **Subscribers** holds the mailing list (website sign-ups + imported lists).
The footer of every page has a **Subscribe** box, and every promotional email has an **Unsubscribe** link (`/unsubscribe`).

Sending is split across several free email services. Each one is optional: it is used only when its API key is in Vercel.
The app counts how many emails each service sent today / this month and never goes over its free limit.
When one service is full or broken, the rest of the list moves to the next one automatically.
If every connected service is full, the campaign pauses; press **Continue** the next day.

## 1. Database (once)

Supabase → SQL Editor → paste `supabase/mailing.sql` → **Run**.

## 2. Services and limits (free plans, no card)

| Service | Free limit | Used first for | Suggested sending address |
|---|---|---|---|
| Sender (sender.net) | 15,000 / month, no daily cap | Event blasts | `events@events.cyberhx.com` |
| Brevo | 300 / day | Newsletters | `news@subscriber.cyberhx.com` |
| Mailjet | 200 / day, 6,000 / month | Notifications | `alerts@notification.cyberhx.com` |
| Mailtrap | 150 / day, 4,000 / month | Notifications | `alerts@n2.cyberhx.com` |
| Maileroo | 3,000 / month | Backup | `alerts@n3.cyberhx.com` |
| SMTP2GO | 1,000 / month | Backup | `alerts@n4.cyberhx.com` |
| AhaSend | 1,000 / month | Backup | `alerts@n5.cyberhx.com` |
| Resend | 100 / day (campaigns use max 70) | Interview emails, last backup | `team@mail.cyberhx.com` |

Order per type (unconnected services are skipped):

- Event blast: Sender → Brevo → Mailjet → Mailtrap → Maileroo → SMTP2GO → AhaSend → Resend
- Newsletter: Brevo → Sender → Mailjet → Mailtrap → Maileroo → SMTP2GO → AhaSend → Resend
- Notification: Mailjet → Mailtrap → Maileroo → SMTP2GO → AhaSend → Brevo → Sender → Resend

One account per service. Do not open several free accounts on the same service: their terms forbid it and they can close all of them.

## 3. For each service

1. Make a free account.
2. Add its sending subdomain (table above) under Domains / Senders.
3. Copy the DNS records it shows (TXT / CNAME / MX) into **Cloudflare → DNS** for cyberhx.com. Set CNAMEs to **DNS only** (grey cloud).
4. Wait until the service says the domain is **verified**.
5. Create an API key and add it in **Vercel → Project → Settings → Environment Variables** (never in the code or a chat).
6. Vercel → Deployments → **Redeploy** so the new keys load.
7. Admin → Campaigns → **Sending power** shows the service as connected. Send a test to yourself.

## 4. Environment variables

| Variable | Service | Where to find it |
|---|---|---|
| `SENDER_API_KEY` | Sender | Settings → API access tokens |
| `BREVO_API_KEY` | Brevo | SMTP & API → API keys |
| `MAILJET_API_KEY` + `MAILJET_SECRET_KEY` | Mailjet | Account settings → API key management |
| `MAILTRAP_API_KEY` | Mailtrap | Sending → API tokens (sending token for your domain) |
| `MAILEROO_API_KEY` | Maileroo | Domains → your domain → Sending key |
| `SMTP2GO_API_KEY` | SMTP2GO | Sending → API keys |
| `AHASEND_API_KEY` + `AHASEND_ACCOUNT_ID` | AhaSend | API keys (needs `messages:send`), account ID from the dashboard |
| `RESEND_API_KEY` | Resend | already set |

Optional:

- `<SERVICE>_FROM` changes the sender, e.g. `BREVO_FROM="CyberHx <news@subscriber.cyberhx.com>"`. It must be on a domain verified in that service.
- `<SERVICE>_DAILY_LIMIT` / `<SERVICE>_MONTHLY_LIMIT` change a limit (`none` = no limit), e.g. after upgrading a plan.
- `MAIL_REPLY_TO` = a real inbox that receives replies (falls back to `RESEND_REPLY_TO`).
- `SITE_URL` (default `https://cyberhx.com`) for unsubscribe links.

## 5. Before a big event

- **Warm up** new subdomains: for 2–3 weeks before the event, send small campaigns (newsletter, reminders) so mail providers learn the domain. Sending 2,000 from a brand-new domain on day one lands in spam.
- Add a DMARC record for cyberhx.com if you haven't: `TXT _dmarc  v=DMARC1; p=none; rua=mailto:you@cyberhx.com`.
- Send a test to a Gmail and an Outlook address and check it lands in Inbox, not Spam/Promotions.
- Import registrants with a tag (e.g. `ctf-oct-2026`, Subscribers box unticked). Then send the reminder / "we're live" / thank-you emails to that group as **Notifications**.
- Promotional emails (Event blast, Newsletter) only go to people who agreed to hear from CyberHx. They always carry an unsubscribe link and one-click unsubscribe headers, and skip anyone who unsubscribed.

## Limits reset

Counters reset at 00:00 UTC (05:30 IST) daily and on the 1st of each month. Services count on their own clocks too, so a few emails may still be refused near the edge; those stay queued and go out when you press **Continue**.
