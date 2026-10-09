# Interview booking (Google Calendar + Meet) — setup

Flow: you shortlist someone → generate a private link → they open `/book-interview?t=...`,
pick a free slot → a Google Calendar event with a Meet link is created on YOUR calendar and the
candidate is invited (so it lands in their calendar too). Slots already busy in your calendar are hidden.

## 1. Google Cloud (one time, ~10 min)
1. https://console.cloud.google.com → project dropdown → **New project** (e.g. `cyberhx-interviews`).
2. **APIs & Services → Library** → search *Google Calendar API* → **Enable**.
3. **Google Auth Platform** (a.k.a. OAuth consent screen) → *Get started* → app name `CyberHx Interviews`, your support email →
   Audience **External** → contact email → Create.
   Then **Audience → Publish app** (status must be *In production*; in *Testing* the refresh token dies after 7 days).
4. **Clients → Create client** → type **Web application** → Authorized redirect URI:
   `https://developers.google.com/oauthplayground` → Create → copy **Client ID** and **Client secret**.
5. Open https://developers.google.com/oauthplayground
   - gear icon (top right) → tick **Use your own OAuth credentials** → paste Client ID/secret.
   - Step 1: in the box at the bottom type these two scopes (space separated) and press **Authorize APIs**:
     `https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy`
   - Sign in with the Google account whose calendar should receive interviews.
     "Google hasn't verified this app" → **Advanced → Go to CyberHx Interviews (unsafe)** → Allow. (Safe: it's your own app.)
   - Step 2: **Exchange authorization code for tokens** → copy the **Refresh token**.

## 2. Vercel environment variables
| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | from step 3 |
| `GOOGLE_CLIENT_SECRET` | from step 3 |
| `GOOGLE_REFRESH_TOKEN` | from step 4 |
| `INTERVIEW_LINK_SECRET` | any long random string (`openssl rand -hex 32`) |
| `SITE_URL` | optional, e.g. `https://your-site.com` (used in generated links) |
| `INTERVIEW_CALENDAR_ID` | optional, defaults to `primary` |

Redeploy after adding them. Never put these in `VITE_*` variables (those are public).

## 3. Send a link to a candidate (from the admin panel)
Open `/admin` → **Interviews** tab (log in with your admin email) → name + email → Generate → Copy link / Open in mail app.
The same tab lists booked interviews (with Meet link, invite status) and lets you cancel one.

CLI alternative:
```
INTERVIEW_LINK_SECRET=<same secret> SITE_URL=https://your-site.com \
  node scripts/make-interview-link.mjs "Vansika Sharma" vansika@gmail.com 7
```
Last number = days the link stays valid. Each link allows one booking; if you delete the event
from your calendar the candidate can book again.

## 4. Change timings
Top of `api/interview.ts` → `CONFIG`: working days, hours (IST), slot length, days ahead, minimum notice.

## Notes
- Local testing: `/api` only runs on Vercel (`npx vercel dev`), not plain `npm run dev`.
- Candidate must use a Google-calendar-capable email to see it in their calendar; others still get the email invite with the Meet link.

## Admin login
The admin panel now uses Supabase Auth. Run `supabase/admin_security.sql` once (see ADMIN_AUTH_SETUP.md). The API reuses `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` already set in Vercel.

## Test before going live
1. Generate a link for a second email you own, open it in an incognito window, book a slot.
2. Check: event + Meet link on your calendar, invite mail in the second inbox, the slot disappears from the page, and Cancel in /admin → Interviews works.

## Short links (`/meet/k7m2xq9p`)
Run `supabase/meeting_links.sql` once in Supabase -> SQL Editor. After that every generated link looks like
`https://your-site.com/meet/k7m2xq9p`. Without that SQL the app still works and falls back to the long encrypted link.
