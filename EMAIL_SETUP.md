# Admin emails (Resend) — one-time setup

The admin panel's **Meetings** tab has an **Email** button on every booked meeting. It sends branded
CyberHx emails through [Resend](https://resend.com) using `api/email.ts`. Only logged-in admins can send.

## The API key never goes in the repo

This repo is public. The Resend key lives **only** in Vercel's environment variables. The code reads it on
the server (`process.env.RESEND_API_KEY`) and it is never sent to the browser.

## Steps

1. **Resend → Domains → Add domain** → `cyberhx.com` → add the DNS records it shows (at your domain/DNS
   provider) → wait until it says *Verified*. Without this you can only send to your own Resend email.
2. **Resend → API Keys → Create API key** → permission *Sending access* → copy it (starts with `re_`).
3. **Vercel → cyberhexgreen project → Settings → Environment Variables**, add for *Production* (and *Preview* if you like):

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the `re_…` key |
   | `RESEND_FROM` | `CyberHx <team@cyberhx.com>` (any address on the verified domain) |
   | `RESEND_REPLY_TO` | where replies should go, e.g. `team@cyberhx.com` (optional) |

4. **Vercel → Deployments → ⋯ on the latest → Redeploy** so the new variables are picked up.
5. Open `/admin` → Meetings → **Email** on any meeting → pick a template → **Send**.

If the key is missing the panel shows: *"Email is not set up yet: add RESEND_API_KEY…"*.

## Templates

Defined in `shared/emailTemplates.ts` (used for both sending and the live preview):

1. Meeting confirmed — date, time, length, Join Google Meet button
2. Reminder — same details, "join a couple of minutes early"
3. Reschedule — asks to move the meeting, optional "Pick a new time" link
4. Shortlisted — next round for a candidate, optional booking link
5. Thank you — follow-up after the call
6. Custom message — your own subject and text in the CyberHx design

Every template can carry an optional personal note. Group meetings send one copy per person, so nobody sees the other recipients.

## If a key ever leaks

Resend → API Keys → delete it, create a new one, update `RESEND_API_KEY` in Vercel, redeploy.
